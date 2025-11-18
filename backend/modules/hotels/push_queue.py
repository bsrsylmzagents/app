"""
Push queue retry worker
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from server import db
from modules.hotels.push_adapter import push_reservation

logger = logging.getLogger(__name__)

async def process_push_queue(max_items: int = 10) -> Dict[str, Any]:
    """Process queued push items"""
    # Get queued items that need retry
    now = datetime.now(timezone.utc)
    queue_items = await db.hotel_reservation_push_queue.find({
        "status": "queued",
        "$or": [
            {"next_retry_at": {"$lte": now.isoformat()}},
            {"next_retry_at": None}
        ],
        "attempt_count": {"$lt": 5}  # Max 5 attempts
    }, {"_id": 0}).limit(max_items).to_list(max_items)
    
    results = {
        "processed": 0,
        "succeeded": 0,
        "failed": 0,
        "details": []
    }
    
    for item in queue_items:
        try:
            # Get hotel and reservation
            hotel = await db.hotels.find_one({"id": item["hotel_id"]}, {"_id": 0})
            reservation = await db.hotel_reservations.find_one({"id": item["reservation_id"]}, {"_id": 0})
            
            if not hotel or not reservation:
                # Mark as failed
                await db.hotel_reservation_push_queue.update_one(
                    {"id": item["id"]},
                    {
                        "$set": {
                            "status": "failed",
                            "error": "Hotel or reservation not found",
                            "updated_at": now.isoformat()
                        }
                    }
                )
                results["failed"] += 1
                continue
            
            # Update status to processing
            await db.hotel_reservation_push_queue.update_one(
                {"id": item["id"]},
                {
                    "$set": {
                        "status": "processing",
                        "last_attempt_at": now.isoformat(),
                        "updated_at": now.isoformat()
                    },
                    "$inc": {"attempt_count": 1}
                }
            )
            
            # Attempt push
            from modules.hotels.push_adapter import push_reservation as push_reservation_sync
            success, error, response = push_reservation_sync(hotel, reservation)
            
            # Log push attempt
            from modules.hotels.models import HotelReservationPushLog
            push_log = HotelReservationPushLog(
                hotel_id=item["hotel_id"],
                reservation_id=item["reservation_id"],
                company_id=item["company_id"],
                method=item["push_method"],
                request_payload=item["payload"],
                response_code=response.get("status_code") if response else None,
                response_body=str(response)[:1000] if response else None,
                success=success,
                error_message=error
            )
            push_log_doc = push_log.model_dump()
            push_log_doc['created_at'] = push_log_doc['created_at'].isoformat()
            await db.hotel_reservation_push_logs.insert_one(push_log_doc)
            
            if success:
                # Mark as sent
                await db.hotel_reservation_push_queue.update_one(
                    {"id": item["id"]},
                    {
                        "$set": {
                            "status": "sent",
                            "updated_at": now.isoformat()
                        }
                    }
                )
                
                # Update reservation push status
                await db.hotel_reservations.update_one(
                    {"id": item["reservation_id"]},
                    {
                        "$set": {
                            "push_status": "sent",
                            "push_last_attempt_at": now.isoformat()
                        }
                    }
                )
                
                results["succeeded"] += 1
            else:
                # Calculate next retry (exponential backoff)
                attempt_count = item["attempt_count"] + 1
                retry_delay_minutes = min(2 ** attempt_count, 60)  # Max 60 minutes
                next_retry = now + timedelta(minutes=retry_delay_minutes)
                
                await db.hotel_reservation_push_queue.update_one(
                    {"id": item["id"]},
                    {
                        "$set": {
                            "status": "queued",
                            "error": error[:500],
                            "next_retry_at": next_retry.isoformat(),
                            "updated_at": now.isoformat()
                        }
                    }
                )
                
                results["failed"] += 1
            
            results["processed"] += 1
            results["details"].append({
                "queue_id": item["id"],
                "reservation_id": item["reservation_id"],
                "success": success,
                "error": error
            })
        
        except Exception as e:
            logger.error(f"Error processing push queue item {item.get('id')}: {e}")
            results["failed"] += 1
    
    return results

