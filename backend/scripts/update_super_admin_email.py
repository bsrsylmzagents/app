#!/usr/bin/env python3
"""
Super admin email güncelleme scripti
Kullanım: python update_super_admin_email.py
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
DB_NAME = os.environ.get("DB_NAME", "tourcast")

async def update_super_admin_email():
    """Super admin kullanıcısının email'ini güncelle"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Super admin kullanıcısını bul
    super_admin = await db.users.find_one({"role": "super_admin"})
    
    if not super_admin:
        print("❌ Super admin kullanıcısı bulunamadı!")
        print("   Lütfen önce super admin kullanıcısı oluşturun.")
        return
    
    # Email'i güncelle
    result = await db.users.update_one(
        {"id": super_admin["id"]},
        {"$set": {"email": "besirsoylemez@gmail.com"}}
    )
    
    if result.modified_count > 0:
        print("✅ Super admin email güncellendi!")
        print(f"   Kullanıcı: {super_admin.get('username', 'N/A')}")
        print(f"   Ad: {super_admin.get('full_name', 'N/A')}")
        print(f"   Email: besirsoylemez@gmail.com")
    else:
        print("⚠️  Email zaten güncel veya değişiklik yapılamadı")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_super_admin_email())






