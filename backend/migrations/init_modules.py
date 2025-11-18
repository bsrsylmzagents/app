"""
Migration: Initialize modular SaaS system
Adds modules_enabled and billing fields to companies
Creates new collections for billing and hotel modules
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "travel_system_online")

async def migrate():
    """Run migration"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    logger.info("Starting modular SaaS migration...")
    
    # 1. Update existing companies with modules_enabled
    result = await db.companies.update_many(
        {"modules_enabled": {"$exists": False}},
        {
            "$set": {
                "modules_enabled": {"tour": True, "hotel": False},
                "billing": None
            }
        }
    )
    logger.info(f"Updated {result.modified_count} companies with modules_enabled")
    
    # 2. Create indexes for new collections
    collections_to_create = [
        ("billing_events", [("company_id", 1), ("created_at", -1)]),
        ("module_feature_flags", [("name", 1)]),
        ("hotels", [("company_id", 1), ("is_active", 1)]),
        ("hotel_rooms", [("hotel_id", 1), ("company_id", 1)]),
        ("hotel_prices", [("hotel_id", 1), ("date", 1)]),
        ("hotel_reservations", [("hotel_id", 1), ("checkin_date", 1), ("status", 1)]),
        ("hotel_ics_events", [("hotel_id", 1), ("event_uid", 1)]),
        ("hotel_reservation_push_queue", [("status", 1), ("next_retry_at", 1)]),
        ("hotel_reservation_push_logs", [("hotel_id", 1), ("created_at", -1)])
    ]
    
    for collection_name, indexes in collections_to_create:
        try:
            collection = db[collection_name]
            # Create indexes
            for index_fields in indexes:
                if isinstance(index_fields, tuple):
                    await collection.create_index(list(index_fields))
                else:
                    await collection.create_index(index_fields)
            logger.info(f"Created indexes for {collection_name}")
        except Exception as e:
            logger.warning(f"Error creating indexes for {collection_name}: {e}")
    
    # 3. Create unique index for hotel_ics_events
    try:
        await db.hotel_ics_events.create_index(
            [("hotel_id", 1), ("event_uid", 1)],
            unique=True
        )
        logger.info("Created unique index for hotel_ics_events")
    except Exception as e:
        logger.warning(f"Error creating unique index: {e}")
    
    # 4. Initialize feature flags
    feature_flags = [
        {"name": "modules_enabled", "enabled": True, "description": "Enable modular SaaS system"},
        {"name": "hotel_ics_sync", "enabled": True, "description": "Enable hotel ICS calendar sync"},
        {"name": "hotel_push_queue", "enabled": True, "description": "Enable hotel reservation push queue"}
    ]
    
    for flag in feature_flags:
        existing = await db.module_feature_flags.find_one({"name": flag["name"]})
        if not existing:
            from modules.models import ModuleFeatureFlag
            from datetime import datetime, timezone
            flag_obj = ModuleFeatureFlag(**flag)
            flag_doc = flag_obj.model_dump()
            flag_doc['created_at'] = flag_doc['created_at'].isoformat()
            flag_doc['updated_at'] = flag_doc['updated_at'].isoformat()
            await db.module_feature_flags.insert_one(flag_doc)
            logger.info(f"Created feature flag: {flag['name']}")
    
    logger.info("Migration completed successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())


