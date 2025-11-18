"""
Billing API routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from typing import Optional, Dict, Any
import stripe
import os
import logging
from modules.billing.service import create_checkout_session, handle_webhook_event
from modules.middleware import check_module_access
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from server import get_current_user, db

logger = logging.getLogger(__name__)

billing_router = APIRouter(prefix="/store", tags=["Billing"])

STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

@billing_router.get("/modules")
async def list_modules(current_user: Optional[dict] = Depends(get_current_user)):
    """List available modules and plans"""
    from modules.billing.service import MODULE_PLANS
    
    # Get company modules
    company_modules = {}
    if current_user:
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        if company:
            company_modules = company.get("modules_enabled", {})
    
    modules_list = []
    for module_name, plans in MODULE_PLANS.items():
        module_info = {
            "name": module_name,
            "display_name": module_name.capitalize(),
            "enabled": company_modules.get(module_name, False) if current_user else False,
            "plans": []
        }
        
        for plan_id, plan_data in plans.items():
            module_info["plans"].append({
                "id": plan_id,
                "name": plan_data["name"],
                "amount": plan_data["amount"],
                "currency": plan_data["currency"],
                "interval": plan_data.get("interval")
            })
        
        modules_list.append(module_info)
    
    return {"modules": modules_list}

@billing_router.post("/create-checkout-session")
async def create_checkout(
    data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe checkout session"""
    company_id = data.get("company_id") or current_user["company_id"]
    module = data.get("module")
    plan_id = data.get("plan_id")
    success_url = data.get("success_url", "http://localhost:3000/store/success")
    cancel_url = data.get("cancel_url", "http://localhost:3000/store")
    
    if not module or not plan_id:
        raise HTTPException(status_code=400, detail="module and plan_id required")
    
    try:
        result = await create_checkout_session(
            company_id=company_id,
            module=module,
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Checkout session creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@billing_router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhook events"""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    body = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            body, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle event
    result = await handle_webhook_event(event)
    
    if result["processed"]:
        return {"status": "success", "message": result["message"]}
    else:
        logger.warning(f"Webhook event not processed: {result['message']}")
        return {"status": "ignored", "message": result["message"]}

