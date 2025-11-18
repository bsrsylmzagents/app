"""
Hotel Module Models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, date
import uuid

class Hotel(BaseModel):
    """Hotel entity"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    # ICS Sync
    ics_url: Optional[str] = None  # URL to fetch ICS calendar
    ics_sync_enabled: bool = False
    ics_sync_last_at: Optional[datetime] = None
    # Push Configuration
    push_method: str = "ics"  # "ics", "json", "email"
    push_endpoint: Optional[str] = None  # HTTP endpoint for push
    push_api_key: Optional[str] = None  # API key for authentication
    push_email: Optional[str] = None  # Email for email adapter
    # Status
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HotelRoom(BaseModel):
    """Hotel room type"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    company_id: str
    name: str  # "Standard Room", "Deluxe Suite", etc.
    description: Optional[str] = None
    max_occupancy: int = 2
    room_count: int = 1  # Number of rooms of this type
    amenities: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HotelPrice(BaseModel):
    """Dynamic pricing for hotel rooms"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    room_id: str
    company_id: str
    date: str  # YYYY-MM-DD
    price_per_night: float
    currency: str = "EUR"
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HotelReservation(BaseModel):
    """Hotel reservation"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    company_id: str
    room_id: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    checkin_date: str  # YYYY-MM-DD
    checkout_date: str  # YYYY-MM-DD
    guest_count: int = 1
    total_price: float
    currency: str = "EUR"
    status: str = "pending"  # "pending", "confirmed", "cancelled", "checked_in", "checked_out"
    # ICS Sync
    ics_event_uid: Optional[str] = None  # UID from ICS if synced
    external: bool = False  # True if created from external ICS
    # Push Status
    push_status: str = "pending"  # "pending", "sent", "failed", "queued"
    push_attempts: int = 0
    push_last_attempt_at: Optional[datetime] = None
    # Metadata
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HotelICSEvent(BaseModel):
    """ICS calendar event from external source"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    company_id: str
    event_uid: str  # UID from ICS VEVENT
    summary: Optional[str] = None
    description: Optional[str] = None
    dtstart: datetime  # Start datetime
    dtend: datetime  # End datetime
    location: Optional[str] = None
    organizer: Optional[str] = None
    attendee: Optional[str] = None
    status: str = "confirmed"  # "confirmed", "tentative", "cancelled"
    external: bool = True  # True if from external ICS
    raw_vevent: Optional[str] = None  # Raw VEVENT string
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HotelReservationPushQueue(BaseModel):
    """Queue for failed push attempts"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    reservation_id: str
    company_id: str
    payload: Dict[str, Any]  # Reservation data to push
    push_method: str  # "ics", "json", "email"
    attempt_count: int = 0
    max_attempts: int = 5
    last_attempt_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    status: str = "queued"  # "queued", "processing", "sent", "failed", "cancelled"
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HotelReservationPushLog(BaseModel):
    """Log of push attempts"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_id: str
    reservation_id: str
    company_id: str
    method: str  # "ics", "json", "email"
    request_payload: Dict[str, Any]
    response_code: Optional[int] = None
    response_body: Optional[str] = None
    success: bool = False
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


