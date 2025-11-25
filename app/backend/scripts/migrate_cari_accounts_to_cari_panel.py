#!/usr/bin/env python3
"""
Mevcut CariAccount'lara cari_code ekle ve Cari (rezervasyon paneli) hesapları oluştur
Idempotent - tekrar çalıştırılabilir
"""

import asyncio
import sys
import os
import uuid
from pathlib import Path

# Backend dizinine ekle
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from passlib.context import CryptContext
import random
from datetime import datetime, timezone

load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "tourcast")

# Passlib context - bcrypt yoksa pbkdf2_sha256 kullan
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    # Test hash to check if bcrypt works
    pwd_context.hash("test")
except:
    # Fallback to pbkdf2_sha256 if bcrypt not available
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def generate_cari_code(company_short: str = "CR") -> str:
    """Benzersiz cari kodu oluştur"""
    random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return f"{company_short}-{random_suffix}"

async def migrate_cari_accounts():
    """Mevcut CariAccount'lara cari_code ekle ve Cari hesapları oluştur"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Tüm CariAccount'ları al
    cari_accounts = await db.cari_accounts.find({}).to_list(10000)
    
    updated_count = 0
    created_panel_count = 0
    
    for cari_account in cari_accounts:
        company_id = cari_account.get("company_id")
        cari_id = cari_account.get("id")
        cari_name = cari_account.get("name")
        
        if not company_id or not cari_id:
            continue
        
        # Company bilgisini al
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        company_short = company.get("company_code", "CR")[:2].upper() if company else "CR"
        
        # Cari_code yoksa oluştur
        cari_code = cari_account.get("cari_code")
        if not cari_code:
            # Benzersiz cari_code oluştur
            cari_code = generate_cari_code(company_short)
            while await db.cari_accounts.find_one({"cari_code": cari_code, "company_id": company_id}):
                cari_code = generate_cari_code(company_short)
            
            # CariAccount'a cari_code ekle
            await db.cari_accounts.update_one(
                {"id": cari_id},
                {"$set": {"cari_code": cari_code}}
            )
            updated_count += 1
            print(f"✅ CariAccount'a cari_code eklendi: {cari_name} -> {cari_code}")
        else:
            print(f"ℹ️  CariAccount zaten cari_code'e sahip: {cari_name} -> {cari_code}")
        
        # Cari (rezervasyon paneli) hesabı var mı kontrol et
        existing_cari_panel = await db.caris.find_one({"cari_code": cari_code})
        if not existing_cari_panel:
            # Cari panel hesabı oluştur
            password_hash = pwd_context.hash(cari_code)  # İlk şifre = cari_code
            
            cari_panel_doc = {
                "id": str(uuid.uuid4()),
                "company_id": company_id,
                "cari_code": cari_code,
                "password_hash": password_hash,
                "require_password_change": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "display_name": cari_name,
                "is_active": True
            }
            
            await db.caris.insert_one(cari_panel_doc)
            created_panel_count += 1
            print(f"✅ Cari panel hesabı oluşturuldu: {cari_name} ({cari_code})")
        else:
            print(f"ℹ️  Cari panel hesabı zaten mevcut: {cari_name} ({cari_code})")
    
    print(f"\n✅ Migration tamamlandı!")
    print(f"   Toplam CariAccount: {len(cari_accounts)}")
    print(f"   Cari_code eklenen: {updated_count}")
    print(f"   Cari panel hesabı oluşturulan: {created_panel_count}")

if __name__ == "__main__":
    import uuid
    asyncio.run(migrate_cari_accounts())

