"""
Hotel Module API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
import logging
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from server import get_current_user, db
from modules.middleware import check_module_access
from modules.hotels.models import Hotel, HotelRoom, HotelPrice, HotelReservation, HotelReservationPushQueue
from modules.hotels.ics_sync import sync_hotel_ics, sync_all_hotels
from modules.hotels.push_queue import process_push_queue
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

hotel_router = APIRouter(prefix="/hotels", tags=["Hotels"])

# ==================== HOTELS ====================

@hotel_router.get("")
async def list_hotels(
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List hotels for company"""
    hotels = await db.hotels.find({
        "company_id": current_user["company_id"],
        "is_active": True
    }, {"_id": 0}).to_list(1000)
    return {"hotels": hotels}

@hotel_router.post("")
async def create_hotel(
    data: Dict[str, Any],
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Create hotel"""
    hotel = Hotel(
        company_id=current_user["company_id"],
        name=data.get("name"),
        address=data.get("address"),
        city=data.get("city"),
        country=data.get("country"),
        phone=data.get("phone"),
        email=data.get("email"),
        website=data.get("website"),
        ics_url=data.get("ics_url"),
        ics_sync_enabled=data.get("ics_sync_enabled", False),
        push_method=data.get("push_method", "json"),
        push_endpoint=data.get("push_endpoint"),
        push_api_key=data.get("push_api_key"),
        push_email=data.get("push_email")
    )
    hotel_doc = hotel.model_dump()
    hotel_doc['created_at'] = hotel_doc['created_at'].isoformat()
    hotel_doc['updated_at'] = hotel_doc['updated_at'].isoformat()
    await db.hotels.insert_one(hotel_doc)
    return {"id": hotel.id, "message": "Hotel created"}

@hotel_router.get("/{hotel_id}")
async def get_hotel(
    hotel_id: str,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Get hotel details"""
    hotel = await db.hotels.find_one({
        "id": hotel_id,
        "company_id": current_user["company_id"]
    }, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel

# ==================== ROOMS ====================

@hotel_router.get("/{hotel_id}/rooms")
async def list_rooms(
    hotel_id: str,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List rooms for hotel"""
    rooms = await db.hotel_rooms.find({
        "hotel_id": hotel_id,
        "company_id": current_user["company_id"]
    }, {"_id": 0}).to_list(1000)
    return {"rooms": rooms}

@hotel_router.post("/{hotel_id}/rooms")
async def create_room(
    hotel_id: str,
    data: Dict[str, Any],
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Create room"""
    room = HotelRoom(
        hotel_id=hotel_id,
        company_id=current_user["company_id"],
        name=data.get("name"),
        description=data.get("description"),
        max_occupancy=data.get("max_occupancy", 2),
        room_count=data.get("room_count", 1),
        amenities=data.get("amenities", [])
    )
    room_doc = room.model_dump()
    room_doc['created_at'] = room_doc['created_at'].isoformat()
    room_doc['updated_at'] = room_doc['updated_at'].isoformat()
    await db.hotel_rooms.insert_one(room_doc)
    return {"id": room.id, "message": "Room created"}

# ==================== RESERVATIONS ====================

@hotel_router.get("/{hotel_id}/reservations")
async def list_reservations(
    hotel_id: str,
    checkin_from: Optional[str] = None,
    checkin_to: Optional[str] = None,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List reservations for hotel"""
    query = {
        "hotel_id": hotel_id,
        "company_id": current_user["company_id"]
    }
    if checkin_from:
        query["checkin_date"] = {"$gte": checkin_from}
    if checkin_to:
        if "checkin_date" in query:
            query["checkin_date"]["$lte"] = checkin_to
        else:
            query["checkin_date"] = {"$lte": checkin_to}
    
    reservations = await db.hotel_reservations.find(query, {"_id": 0}).sort("checkin_date", 1).to_list(1000)
    return {"reservations": reservations}

@hotel_router.post("/{hotel_id}/reservations")
async def create_reservation(
    hotel_id: str,
    data: Dict[str, Any],
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Create hotel reservation and push to hotel"""
    # Verify hotel belongs to company
    hotel = await db.hotels.find_one({
        "id": hotel_id,
        "company_id": current_user["company_id"]
    })
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Check availability (simplified - should check against existing reservations and ICS events)
    checkin = data.get("checkin_date")
    checkout = data.get("checkout_date")
    room_id = data.get("room_id")
    
    # TODO: Implement proper availability check
    
    # Create reservation
    reservation = HotelReservation(
        hotel_id=hotel_id,
        company_id=current_user["company_id"],
        room_id=room_id,
        customer_name=data.get("customer_name"),
        customer_email=data.get("customer_email"),
        customer_phone=data.get("customer_phone"),
        checkin_date=checkin,
        checkout_date=checkout,
        guest_count=data.get("guest_count", 1),
        total_price=data.get("total_price", 0),
        currency=data.get("currency", "EUR"),
        status="pending",
        notes=data.get("notes")
    )
    reservation_doc = reservation.model_dump()
    reservation_doc['created_at'] = reservation_doc['created_at'].isoformat()
    reservation_doc['updated_at'] = reservation_doc['updated_at'].isoformat()
    await db.hotel_reservations.insert_one(reservation_doc)
    
    # Attempt push
    from modules.hotels.push_adapter import push_reservation as push_reservation_sync
    push_success, push_error, push_response = push_reservation_sync(hotel, reservation_doc)
    
    if push_success:
        # Update reservation push status
        await db.hotel_reservations.update_one(
            {"id": reservation.id},
            {
                "$set": {
                    "push_status": "sent",
                    "push_last_attempt_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    else:
        # Queue for retry
        queue_item = HotelReservationPushQueue(
            hotel_id=hotel_id,
            reservation_id=reservation.id,
            company_id=current_user["company_id"],
            payload=reservation_doc,
            push_method=hotel.get("push_method", "json"),
            status="queued",
            error=push_error
        )
        queue_doc = queue_item.model_dump()
        queue_doc['created_at'] = queue_doc['created_at'].isoformat()
        queue_doc['updated_at'] = queue_doc['updated_at'].isoformat()
        await db.hotel_reservation_push_queue.insert_one(queue_doc)
    
    return {
        "id": reservation.id,
        "push_status": "sent" if push_success else "queued",
        "push_error": push_error
    }

# ==================== ICS SYNC ====================

@hotel_router.post("/{hotel_id}/sync-ics")
async def sync_hotel_ics_endpoint(
    hotel_id: str,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Manually trigger ICS sync for hotel"""
    result = await sync_hotel_ics(hotel_id)
    return result

@hotel_router.post("/sync-all")
async def sync_all_hotels_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Sync all hotels (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    result = await sync_all_hotels()
    return result

# ==================== PUSH QUEUE ====================

@hotel_router.get("/push-queue")
async def list_push_queue(
    status: Optional[str] = None,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List push queue items"""
    query = {"company_id": current_user["company_id"]}
    if status:
        query["status"] = status
    
    items = await db.hotel_reservation_push_queue.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return {"items": items}

@hotel_router.post("/push-queue/{queue_id}/retry")
async def retry_push(
    queue_id: str,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Retry failed push"""
    item = await db.hotel_reservation_push_queue.find_one({
        "id": queue_id,
        "company_id": current_user["company_id"]
    })
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    # Reset for retry
    await db.hotel_reservation_push_queue.update_one(
        {"id": queue_id},
        {
            "$set": {
                "status": "queued",
                "next_retry_at": datetime.now(timezone.utc).isoformat(),
                "error": None
            }
        }
    )
    
    # Process immediately
    result = await process_push_queue(max_items=1)
    return {"message": "Retry queued", "result": result}

# ==================== HOTEL MODULE DASHBOARD ====================

@hotel_router.get("/dashboard")
async def get_hotel_dashboard(
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Get hotel module dashboard statistics"""
    company_id = current_user["company_id"]
    
    # Get hotels count
    hotels_count = await db.hotels.count_documents({
        "company_id": company_id,
        "is_active": True
    })
    
    # Get total reservations
    total_reservations = await db.hotel_reservations.count_documents({
        "company_id": company_id
    })
    
    # Get today's reservations (check-in or check-out today)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_reservations = await db.hotel_reservations.count_documents({
        "company_id": company_id,
        "$or": [
            {"checkin_date": today},
            {"checkout_date": today}
        ]
    })
    
    # Get total revenue
    reservations = await db.hotel_reservations.find({
        "company_id": company_id,
        "status": {"$ne": "cancelled"}
    }, {"total_price": 1, "currency": 1}).to_list(10000)
    
    total_revenue = sum(r.get("total_price", 0) for r in reservations)
    
    return {
        "total_hotels": hotels_count,
        "total_reservations": total_reservations,
        "today_reservations": today_reservations,
        "total_revenue": total_revenue
    }

# ==================== HOTEL RESERVATIONS (ALL) ====================

@hotel_router.get("/reservations")
async def list_all_hotel_reservations(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    hotel_id: Optional[str] = None,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List all hotel reservations for company"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from:
        query["checkin_date"] = {"$gte": date_from}
    if date_to:
        if "checkin_date" in query and isinstance(query["checkin_date"], dict):
            query["checkin_date"]["$lte"] = date_to
        else:
            query["checkin_date"] = {"$lte": date_to}
    if status:
        query["status"] = status
    if hotel_id:
        query["hotel_id"] = hotel_id
    
    reservations = await db.hotel_reservations.find(query, {"_id": 0}).sort("checkin_date", 1).to_list(1000)
    
    # Add hotel and room names
    for res in reservations:
        hotel = await db.hotels.find_one({"id": res.get("hotel_id")}, {"_id": 0, "name": 1})
        if hotel:
            res["hotel_name"] = hotel.get("name")
        room = await db.hotel_rooms.find_one({"id": res.get("room_id")}, {"_id": 0, "name": 1})
        if room:
            res["room_name"] = room.get("name")
    
    return {"reservations": reservations}

# ==================== HOTEL CALENDAR ====================

@hotel_router.get("/calendar")
async def get_hotel_calendar(
    month: Optional[str] = None,  # YYYY-MM format
    hotel_id: Optional[str] = None,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Get hotel calendar view with reservations"""
    from datetime import datetime as dt
    from calendar import monthrange
    
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    year, month_num = map(int, month.split("-"))
    _, last_day = monthrange(year, month_num)
    
    date_from = f"{year}-{month_num:02d}-01"
    date_to = f"{year}-{month_num:02d}-{last_day:02d}"
    
    query = {
        "company_id": current_user["company_id"],
        "$or": [
            {
                "checkin_date": {"$lte": date_to},
                "checkout_date": {"$gte": date_from}
            }
        ]
    }
    
    if hotel_id:
        query["hotel_id"] = hotel_id
    
    reservations = await db.hotel_reservations.find(query, {"_id": 0}).to_list(1000)
    
    # Format for calendar view
    calendar_data = {}
    for res in reservations:
        checkin = res.get("checkin_date")
        checkout = res.get("checkout_date")
        
        # Add hotel and room names
        hotel = await db.hotels.find_one({"id": res.get("hotel_id")}, {"_id": 0, "name": 1})
        if hotel:
            res["hotel_name"] = hotel.get("name")
        room = await db.hotel_rooms.find_one({"id": res.get("room_id")}, {"_id": 0, "name": 1})
        if room:
            res["room_name"] = room.get("name")
        
        # Add to calendar days
        checkin_date = dt.strptime(checkin, "%Y-%m-%d")
        checkout_date = dt.strptime(checkout, "%Y-%m-%d")
        current_date = checkin_date
        
        while current_date <= checkout_date:
            date_key = current_date.strftime("%Y-%m-%d")
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append(res)
            current_date = current_date + timedelta(days=1)
    
    return {"calendar": calendar_data, "month": month}

# ==================== HOTEL CARI ACCOUNTS ====================
# Hotel modülü için cari hesaplar (tour modülündeki gibi ama hotel-specific)

@hotel_router.get("/cari-accounts")
async def list_hotel_cari_accounts(
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List cari accounts for hotel module"""
    # Hotel modülü için cari hesaplar - tour modülündeki gibi
    # Şimdilik tour modülündeki cari hesapları döndür (aynı company_id)
    cari_accounts = await db.cari_accounts.find({
        "company_id": current_user["company_id"]
    }, {"_id": 0}).to_list(1000)
    
    return {"cari_accounts": cari_accounts}

# ==================== HOTEL EXTRA SALES ====================
# Hotel modülü için açık satışlar

@hotel_router.get("/extra-sales")
async def list_hotel_extra_sales(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List extra sales for hotel module"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    extra_sales = await db.extra_sales.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return {"extra_sales": extra_sales}

# ==================== HOTEL SERVICE PURCHASES ====================
# Hotel modülü için hizmet al

@hotel_router.get("/service-purchases")
async def list_hotel_service_purchases(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """List service purchases for hotel module"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    service_purchases = await db.service_purchases.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return {"service_purchases": service_purchases}

# ==================== HOTEL CASH ====================
# Hotel modülü için kasa sistemi

@hotel_router.get("/cash")
async def get_hotel_cash(
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Get cash accounts for hotel module"""
    cash_accounts = await db.cash_accounts.find({
        "company_id": current_user["company_id"]
    }, {"_id": 0}).to_list(1000)
    
    return {"cash_accounts": cash_accounts}

# ==================== HOTEL REPORTS ====================
# Hotel modülü için raporlar

@hotel_router.get("/reports")
async def get_hotel_reports(
    report_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Get hotel module reports"""
    # Placeholder - implement specific hotel reports
    return {
        "report_type": report_type,
        "date_from": date_from,
        "date_to": date_to,
        "data": []
    }

# ==================== HOTEL SETTINGS ====================
# Hotel modülü için ayarlar

@hotel_router.get("/settings")
async def get_hotel_settings(
    current_user: dict = Depends(check_module_access("hotel"))
):
    """Get hotel module settings"""
    # Placeholder - implement hotel-specific settings
    return {"settings": {}}

