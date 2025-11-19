#!/usr/bin/env python3
"""
Cari hesabı oluşturma scripti
Kullanım: python create_cari.py --company-id <company_id> --display-name "Acme Travel"
"""

import asyncio
import sys
import os
import argparse
from pathlib import Path

# Backend dizinine ekle
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from passlib.context import CryptContext
import uuid
import secrets
from datetime import datetime, timezone

load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "travel_system_online")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_cari_code(company_short: str = "TC") -> str:
    """Benzersiz cari kodu oluştur"""
    random_suffix = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    return f"{company_short}-{random_suffix}"

async def create_cari(company_id: str, display_name: str):
    """Cari hesabı oluştur"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Company kontrolü
    company = await db.companies.find_one({"id": company_id})
    if not company:
        print(f"❌ Company bulunamadı: {company_id}")
        return
    
    # Company kısa adını al (varsa)
    company_short = company.get("company_code", "TC")[:2].upper()
    
    # Benzersiz cari_code oluştur
    cari_code = generate_cari_code(company_short)
    while await db.caris.find_one({"cari_code": cari_code}):
        cari_code = generate_cari_code(company_short)
    
    # Şifreyi hash'le (ilk şifre = cari_code)
    password_hash = pwd_context.hash(cari_code)
    
    # Cari dokümanı oluştur
    cari_doc = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "cari_code": cari_code,
        "password_hash": password_hash,
        "require_password_change": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "display_name": display_name,
        "is_active": True
    }
    
    await db.caris.insert_one(cari_doc)
    
    print(f"✅ Cari hesabı oluşturuldu!")
    print(f"   Company: {company.get('company_name', 'N/A')}")
    print(f"   Display Name: {display_name}")
    print(f"   Cari Code: {cari_code}")
    print(f"   İlk Şifre: {cari_code} (değiştirilmeli)")
    print(f"   Login URL: http://localhost:3000/r/{cari_code}")
    print(f"\n⚠️  İlk girişte kullanıcı adı ve şifre: {cari_code}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cari hesabı oluştur")
    parser.add_argument("--company-id", required=True, help="Company ID")
    parser.add_argument("--display-name", required=True, help="Cari display name")
    
    args = parser.parse_args()
    
    asyncio.run(create_cari(args.company_id, args.display_name))



