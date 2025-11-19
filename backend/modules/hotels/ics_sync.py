"""
ICS Calendar Sync Service
Pulls ICS calendars and syncs events
"""
import logging
import requests
from icalendar import Calendar
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from server import db
from modules.hotels.models import HotelICSEvent

logger = logging.getLogger(__name__)

async def sync_hotel_ics(hotel_id: str) -> Dict[str, Any]:
    """Sync ICS calendar for a hotel"""
    hotel = await db.hotels.find_one({"id": hotel_id})
    if not hotel:
        return {"success": False, "error": "Hotel not found"}
    
    ics_url = hotel.get("ics_url")
    if not ics_url:
        return {"success": False, "error": "ICS URL not configured"}
    
    if not hotel.get("ics_sync_enabled", False):
        return {"success": False, "error": "ICS sync not enabled for this hotel"}
    
    try:
        # Fetch ICS
        response = requests.get(ics_url, timeout=30)
        response.raise_for_status()
        
        # Parse ICS
        cal = Calendar.from_ical(response.content)
        
        events_processed = 0
        events_created = 0
        events_updated = 0
        
        for component in cal.walk('vevent'):
            try:
                uid = str(component.get('uid', ''))
                if not uid:
                    continue
                
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')
                
                if not dtstart or not dtend:
                    continue
                
                # Convert to datetime
                if hasattr(dtstart.dt, 'date'):
                    dtstart_dt = datetime.combine(dtstart.dt.date(), datetime.min.time()).replace(tzinfo=timezone.utc)
                else:
                    dtstart_dt = dtstart.dt
                
                if hasattr(dtend.dt, 'date'):
                    dtend_dt = datetime.combine(dtend.dt.date(), datetime.min.time()).replace(tzinfo=timezone.utc)
                else:
                    dtend_dt = dtend.dt
                
                # Check if event exists
                existing = await db.hotel_ics_events.find_one({
                    "hotel_id": hotel_id,
                    "event_uid": uid
                })
                
                event_data = {
                    "hotel_id": hotel_id,
                    "company_id": hotel["company_id"],
                    "event_uid": uid,
                    "summary": str(component.get('summary', '')),
                    "description": str(component.get('description', '')),
                    "dtstart": dtstart_dt.isoformat(),
                    "dtend": dtend_dt.isoformat(),
                    "location": str(component.get('location', '')),
                    "organizer": str(component.get('organizer', '')),
                    "attendee": str(component.get('attendee', '')),
                    "status": str(component.get('status', 'confirmed')).lower(),
                    "external": True,
                    "raw_vevent": component.to_ical().decode('utf-8')[:1000],  # Store first 1000 chars
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if existing:
                    # Update existing
                    await db.hotel_ics_events.update_one(
                        {"id": existing["id"]},
                        {"$set": event_data}
                    )
                    events_updated += 1
                else:
                    # Create new
                    ics_event = HotelICSEvent(**event_data)
                    ics_event_doc = ics_event.model_dump()
                    ics_event_doc['created_at'] = ics_event_doc['created_at'].isoformat()
                    ics_event_doc['dtstart'] = dtstart_dt.isoformat()
                    ics_event_doc['dtend'] = dtend_dt.isoformat()
                    await db.hotel_ics_events.insert_one(ics_event_doc)
                    events_created += 1
                
                events_processed += 1
                
            except Exception as e:
                logger.error(f"Error processing ICS event: {e}")
                continue
        
        # Update hotel sync timestamp
        await db.hotels.update_one(
            {"id": hotel_id},
            {"$set": {"ics_sync_last_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "events_processed": events_processed,
            "events_created": events_created,
            "events_updated": events_updated
        }
    
    except Exception as e:
        logger.error(f"ICS sync error for hotel {hotel_id}: {e}")
        return {"success": False, "error": str(e)}

async def sync_all_hotels() -> Dict[str, Any]:
    """Sync ICS for all active hotels with sync enabled"""
    hotels = await db.hotels.find({
        "ics_sync_enabled": True,
        "is_active": True
    }, {"_id": 0}).to_list(1000)
    
    results = {
        "total": len(hotels),
        "success": 0,
        "failed": 0,
        "details": []
    }
    
    for hotel in hotels:
        result = await sync_hotel_ics(hotel["id"])
        if result.get("success"):
            results["success"] += 1
        else:
            results["failed"] += 1
        results["details"].append({
            "hotel_id": hotel["id"],
            "hotel_name": hotel.get("name"),
            **result
        })
    
    return results



