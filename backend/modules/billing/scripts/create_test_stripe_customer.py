"""
Test script to create Stripe customer for testing
"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from modules.billing.service import create_stripe_customer

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "travel_system_online")

async def create_test_customer():
    """Create Stripe customer for first company"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get first company
    company = await db.companies.find_one({}, {"_id": 0})
    if not company:
        print("No company found. Please create a company first.")
        client.close()
        return
    
    company_id = company["id"]
    company_name = company["company_name"]
    
    print(f"Creating Stripe customer for: {company_name} ({company_id})")
    
    try:
        customer_id = await create_stripe_customer(
            company_id=company_id,
            company_name=company_name,
            email=company.get("contact_email")
        )
        print(f"Stripe customer created: {customer_id}")
        print(f"Company updated with billing.stripe_customer_id")
    except Exception as e:
        print(f"Error: {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_customer())



