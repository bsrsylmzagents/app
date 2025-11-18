#!/usr/bin/env python3
"""
Rezervasyon alanlarını migrate et - idempotent
Mevcut reservations'a yeni alanları ekler (bozmadan)
"""

import asyncio
import sys
import os
from pathlib import Path

# Backend dizinine ekle
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "travel_system_online")

async def migrate_reservations():
    """Mevcut rezervasyonlara yeni alanları ekle"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Tüm rezervasyonları al
    reservations = await db.reservations.find({}).to_list(10000)
    
    updated_count = 0
    
    for reservation in reservations:
        update_data = {}
        
        # reservation_source yoksa ekle
        if "reservation_source" not in reservation:
            update_data["reservation_source"] = "system"
        
        # status yoksa veya eski değerlerden biriyse güncelle
        if "status" not in reservation:
            update_data["status"] = "approved"
        elif reservation["status"] not in ["pending_approval", "approved", "rejected", "confirmed", "cancelled", "completed"]:
            # Eski status değerlerini koru ama yeni değerler ekle
            if reservation["status"] == "confirmed":
                # confirmed -> approved (cari sistemi için)
                pass  # confirmed kalabilir
            else:
                update_data["status"] = "approved"
        
        # created_by_cari yoksa null ekle
        if "created_by_cari" not in reservation:
            update_data["created_by_cari"] = None
        
        # cari_code_snapshot yoksa null ekle
        if "cari_code_snapshot" not in reservation:
            update_data["cari_code_snapshot"] = None
        
        # approved_by yoksa null ekle
        if "approved_by" not in reservation:
            update_data["approved_by"] = None
        
        # approved_at yoksa null ekle
        if "approved_at" not in reservation:
            update_data["approved_at"] = None
        
        # Güncelleme varsa yap
        if update_data:
            await db.reservations.update_one(
                {"id": reservation["id"]},
                {"$set": update_data}
            )
            updated_count += 1
    
    print(f"✅ Migration tamamlandı!")
    print(f"   Toplam rezervasyon: {len(reservations)}")
    print(f"   Güncellenen: {updated_count}")
    print(f"   Değişmeyen: {len(reservations) - updated_count}")

if __name__ == "__main__":
    asyncio.run(migrate_reservations())


