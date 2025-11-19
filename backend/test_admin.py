"""
Admin hesabını test etmek için script
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'travel_agency_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_admin():
    print("Admin hesabı kontrol ediliyor...")
    
    # Admin company kontrolü
    admin_company = await db.companies.find_one({"company_code": "1000"})
    if admin_company:
        print(f"✓ Admin company bulundu: {admin_company['company_name']}")
    else:
        print("✗ Admin company bulunamadı!")
        return
    
    # Admin user kontrolü
    admin_user = await db.users.find_one({"company_id": admin_company["id"], "username": "admin"})
    if admin_user:
        print(f"✓ Admin user bulundu: {admin_user['username']}")
        print(f"  Role: {admin_user.get('role', 'N/A')}")
        print(f"  Is Admin: {admin_user.get('is_admin', False)}")
        
        # Şifre testi
        test_password = "admin"
        if pwd_context.verify(test_password, admin_user["password"]):
            print(f"✓ Şifre doğrulaması başarılı!")
        else:
            print(f"✗ Şifre doğrulaması başarısız!")
            print("  Şifreyi yeniden hash'liyoruz...")
            new_hash = pwd_context.hash(test_password)
            await db.users.update_one(
                {"id": admin_user["id"]},
                {"$set": {"password": new_hash}}
            )
            print("  Şifre güncellendi!")
    else:
        print("✗ Admin user bulunamadı!")
        print("  Admin user oluşturuluyor...")
        hashed_password = pwd_context.hash("admin")
        admin_user = {
            "id": str(uuid.uuid4()),
            "company_id": admin_company["id"],
            "username": "admin",
            "full_name": "Sistem Yöneticisi",
            "is_admin": True,
            "role": "admin",
            "password": hashed_password
        }
        await db.users.insert_one(admin_user)
        print("  Admin user oluşturuldu!")

if __name__ == "__main__":
    import uuid
    asyncio.run(test_admin())
    print("\nTest tamamlandı!")








