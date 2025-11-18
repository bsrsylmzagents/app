"""
Shared models for modular SaaS platform
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

class BillingEvent(BaseModel):
    """Billing event log for audit trail"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    event_type: str  # "checkout.completed", "payment.failed", "subscription.cancelled", etc.
    payload: Dict[str, Any]  # Full event payload
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ModuleFeatureFlag(BaseModel):
    """Global feature flags for modules"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "modules_enabled", "hotel_ics_sync"
    enabled: bool = True
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ModuleSubscription(BaseModel):
    """Module subscription details"""
    model_config = ConfigDict(extra="ignore")
    module: str  # "tour", "hotel", etc.
    plan_id: str  # Stripe plan ID or internal plan ID
    plan_name: str  # "Basic", "Pro", etc.
    status: str  # "active", "cancelled", "past_due", "trialing"
    stripe_subscription_id: Optional[str] = None
    stripe_price_id: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


