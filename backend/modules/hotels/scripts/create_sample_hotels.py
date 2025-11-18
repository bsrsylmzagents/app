"""
Sample script to create test hotels
"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from modules.hotels.models import Hotel, HotelRoom

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "travel_system_online")

async def create_sample_hotels():
    """Create sample hotels for testing"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get first company
    company = await db.companies.find_one({}, {"_id": 0})
    if not company:
        print("No company found. Please create a company first.")
        client.close()
        return
    
    company_id = company["id"]
    print(f"Creating hotels for company: {company['company_name']} ({company_id})")
    
    # Sample hotel 1
    hotel1 = Hotel(
        company_id=company_id,
        name="Grand Hotel",
        address="123 Main Street",
        city="Istanbul",
        country="Turkey",
        phone="+90 212 123 4567",
        email="info@grandhotel.com",
        ics_url="https://example.com/calendar.ics",
        ics_sync_enabled=True,
        push_method="json",
        push_endpoint="https://example.com/api/reservations",
        push_api_key="test_api_key_123"
    )
    hotel1_doc = hotel1.model_dump()
    hotel1_doc['created_at'] = hotel1_doc['created_at'].isoformat()
    hotel1_doc['updated_at'] = hotel1_doc['updated_at'].isoformat()
    await db.hotels.insert_one(hotel1_doc)
    print(f"Created hotel: {hotel1.name} ({hotel1.id})")
    
    # Sample room for hotel1
    room1 = HotelRoom(
        hotel_id=hotel1.id,
        company_id=company_id,
        name="Standard Room",
        description="Comfortable standard room",
        max_occupancy=2,
        room_count=10
    )
    room1_doc = room1.model_dump()
    room1_doc['created_at'] = room1_doc['created_at'].isoformat()
    room1_doc['updated_at'] = room1_doc['updated_at'].isoformat()
    await db.hotel_rooms.insert_one(room1_doc)
    print(f"Created room: {room1.name} for {hotel1.name}")
    
    # Sample hotel 2
    hotel2 = Hotel(
        company_id=company_id,
        name="Beach Resort",
        address="456 Beach Road",
        city="Antalya",
        country="Turkey",
        phone="+90 242 987 6543",
        email="info@beachresort.com",
        push_method="email",
        push_email="reservations@beachresort.com"
    )
    hotel2_doc = hotel2.model_dump()
    hotel2_doc['created_at'] = hotel2_doc['created_at'].isoformat()
    hotel2_doc['updated_at'] = hotel2_doc['updated_at'].isoformat()
    await db.hotels.insert_one(hotel2_doc)
    print(f"Created hotel: {hotel2.name} ({hotel2.id})")
    
    client.close()
    print("Sample hotels created successfully!")

if __name__ == "__main__":
    asyncio.run(create_sample_hotels())


