"""
Stripe billing service
"""
import stripe
import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Stripe configuration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Module plans configuration
MODULE_PLANS = {
    "hotel": {
        "basic": {
            "name": "Hotel Basic",
            "price_id": os.environ.get("STRIPE_HOTEL_BASIC_PRICE_ID", ""),
            "amount": 2999,  # $29.99 in cents
            "currency": "usd",
            "interval": "month"
        },
        "pro": {
            "name": "Hotel Pro",
            "price_id": os.environ.get("STRIPE_HOTEL_PRO_PRICE_ID", ""),
            "amount": 4999,  # $49.99 in cents
            "currency": "usd",
            "interval": "month"
        }
    },
    "tour": {
        "basic": {
            "name": "Tour Basic",
            "price_id": os.environ.get("STRIPE_TOUR_BASIC_PRICE_ID", ""),
            "amount": 1999,  # $19.99 in cents
            "currency": "usd",
            "interval": "month"
        }
    }
}

async def create_stripe_customer(company_id: str, company_name: str, email: Optional[str] = None) -> str:
    """Create or retrieve Stripe customer for company"""
    from server import db
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise ValueError(f"Company {company_id} not found")
    
    # Check if customer already exists
    billing = company.get("billing", {})
    stripe_customer_id = billing.get("stripe_customer_id")
    
    if stripe_customer_id:
        try:
            customer = stripe.Customer.retrieve(stripe_customer_id)
            return customer.id
        except stripe.error.InvalidRequestError:
            # Customer doesn't exist, create new one
            pass
    
    # Create new customer
    customer_data = {
        "name": company_name,
        "metadata": {"company_id": company_id}
    }
    if email:
        customer_data["email"] = email
    
    customer = stripe.Customer.create(**customer_data)
    
    # Update company billing
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {"billing.stripe_customer_id": customer.id}}
    )
    
    logger.info(f"Created Stripe customer {customer.id} for company {company_id}")
    return customer.id

async def create_checkout_session(
    company_id: str,
    module: str,
    plan_id: str,
    success_url: str,
    cancel_url: str
) -> Dict[str, Any]:
    """Create Stripe Checkout session for module purchase"""
    if not STRIPE_SECRET_KEY:
        raise ValueError("STRIPE_SECRET_KEY not configured")
    
    from server import db
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise ValueError(f"Company {company_id} not found")
    
    # Get plan details
    if module not in MODULE_PLANS:
        raise ValueError(f"Unknown module: {module}")
    
    if plan_id not in MODULE_PLANS[module]:
        raise ValueError(f"Unknown plan: {plan_id} for module {module}")
    
    plan = MODULE_PLANS[module][plan_id]
    
    # Get or create Stripe customer
    stripe_customer_id = await create_stripe_customer(
        company_id,
        company.get("company_name", ""),
        company.get("contact_email")
    )
    
    # Create checkout session
    session_data = {
        "customer": stripe_customer_id,
        "payment_method_types": ["card"],
        "mode": "subscription" if plan.get("interval") else "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {
            "company_id": company_id,
            "module": module,
            "plan_id": plan_id
        }
    }
    
    # Add price
    if plan.get("price_id"):
        session_data["line_items"] = [{
            "price": plan["price_id"],
            "quantity": 1
        }]
    else:
        # One-time payment
        session_data["line_items"] = [{
            "price_data": {
                "unit_amount": plan["amount"],
                "currency": plan["currency"],
                "product_data": {
                    "name": plan["name"],
                    "description": f"{module.capitalize()} module - {plan_id} plan"
                },
                "recurring": {
                    "interval": plan["interval"]
                } if plan.get("interval") else None
            },
            "quantity": 1
        }]
        # Remove None values
        if session_data["line_items"][0]["price_data"]["recurring"] is None:
            del session_data["line_items"][0]["price_data"]["recurring"]
    
    session = stripe.checkout.Session.create(**session_data)
    
    logger.info(f"Created checkout session {session.id} for company {company_id}, module {module}")
    return {
        "session_id": session.id,
        "url": session.url
    }

async def handle_webhook_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Stripe webhook event"""
    from server import db
    from modules.models import BillingEvent
    
    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})
    
    result = {"processed": False, "message": ""}
    
    if event_type == "checkout.session.completed":
        session = data
        metadata = session.get("metadata", {})
        company_id = metadata.get("company_id")
        module = metadata.get("module")
        plan_id = metadata.get("plan_id")
        
        if not company_id or not module:
            result["message"] = "Missing metadata in checkout session"
            return result
        
        # Update company modules_enabled
        company = await db.companies.find_one({"id": company_id})
        if company:
            modules_enabled = company.get("modules_enabled", {})
            modules_enabled[module] = True
            
            # Update subscriptions
            billing = company.get("billing", {})
            subscriptions = billing.get("subscriptions", [])
            
            subscription_data = {
                "module": module,
                "plan_id": plan_id,
                "plan_name": MODULE_PLANS.get(module, {}).get(plan_id, {}).get("name", plan_id),
                "status": "active",
                "stripe_subscription_id": session.get("subscription"),
                "stripe_price_id": session.get("display_items", [{}])[0].get("price", {}).get("id") if session.get("display_items") else None,
                "start_date": datetime.now(timezone.utc).isoformat()
            }
            
            subscriptions.append(subscription_data)
            billing["subscriptions"] = subscriptions
            
            await db.companies.update_one(
                {"id": company_id},
                {
                    "$set": {
                        "modules_enabled": modules_enabled,
                        "billing": billing
                    }
                }
            )
            
            # Create billing event
            billing_event = BillingEvent(
                company_id=company_id,
                event_type=event_type,
                payload=event
            )
            billing_event_doc = billing_event.model_dump()
            billing_event_doc['created_at'] = billing_event_doc['created_at'].isoformat()
            await db.billing_events.insert_one(billing_event_doc)
            
            # TODO: Send notification to company admins
            logger.info(f"Module {module} enabled for company {company_id}")
            result["processed"] = True
            result["message"] = f"Module {module} enabled successfully"
        else:
            result["message"] = f"Company {company_id} not found"
    
    elif event_type == "invoice.payment_failed":
        # Handle payment failure
        invoice = data
        customer_id = invoice.get("customer")
        
        # Find company by stripe_customer_id
        company = await db.companies.find_one({"billing.stripe_customer_id": customer_id})
        if company:
            # Update subscription status
            billing = company.get("billing", {})
            subscriptions = billing.get("subscriptions", [])
            for sub in subscriptions:
                if sub.get("stripe_subscription_id") == invoice.get("subscription"):
                    sub["status"] = "past_due"
            
            billing["subscriptions"] = subscriptions
            await db.companies.update_one(
                {"id": company["id"]},
                {"$set": {"billing": billing}}
            )
            
            # Create billing event
            billing_event = BillingEvent(
                company_id=company["id"],
                event_type=event_type,
                payload=event
            )
            billing_event_doc = billing_event.model_dump()
            billing_event_doc['created_at'] = billing_event_doc['created_at'].isoformat()
            await db.billing_events.insert_one(billing_event_doc)
            
            # TODO: Send notification
            result["processed"] = True
            result["message"] = "Payment failure handled"
    
    elif event_type == "customer.subscription.deleted":
        # Handle subscription cancellation
        subscription = data
        customer_id = subscription.get("customer")
        
        company = await db.companies.find_one({"billing.stripe_customer_id": customer_id})
        if company:
            # Find and update subscription
            billing = company.get("billing", {})
            subscriptions = billing.get("subscriptions", [])
            for sub in subscriptions:
                if sub.get("stripe_subscription_id") == subscription.get("id"):
                    sub["status"] = "cancelled"
                    sub["end_date"] = datetime.now(timezone.utc).isoformat()
                    # Optionally disable module
                    # modules_enabled = company.get("modules_enabled", {})
                    # modules_enabled[sub["module"]] = False
                    # await db.companies.update_one(
                    #     {"id": company["id"]},
                    #     {"$set": {"modules_enabled": modules_enabled}}
                    # )
            
            billing["subscriptions"] = subscriptions
            await db.companies.update_one(
                {"id": company["id"]},
                {"$set": {"billing": billing}}
            )
            
            result["processed"] = True
            result["message"] = "Subscription cancelled"
    
    return result


