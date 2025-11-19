from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from collections import defaultdict
import uuid
import random
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import secrets
import requests
from urllib.parse import urlparse
import base64
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logger setup - EN BAŞTA TANIMLA
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("server")
logger.setLevel(logging.INFO)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "travel_system_online")

# MongoDB URL'den tırnak işaretlerini temizle (eğer varsa)
MONGO_URL = MONGO_URL.strip('"').strip("'")

# MongoDB bağlantısı - timeout ve retry ile
try:
    client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=5000,  # 5 saniye timeout
        connectTimeoutMS=5000
    )
    logger.info(f"MongoDB bağlantısı oluşturuldu: {MONGO_URL}")
except Exception as e:
    logger.error(f"MongoDB bağlantı hatası: {str(e)}")
    raise

# Eğer URL içinde DB adı varsa otomatik al
try:
    parsed_url = urlparse(MONGO_URL)
    db_name_from_url = parsed_url.path.strip('/').split('/')[0] if parsed_url.path else None

    if db_name_from_url:
        db = client[db_name_from_url]
    else:
        db = client[DB_NAME]
except Exception:
    db = client[DB_NAME]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_urlsafe(32))
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- CORS middleware en başta ---
cors_origins_str = os.environ.get('CORS_ORIGINS', '').strip().strip('"').strip("'")
if cors_origins_str:
    CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip()]
else:
    CORS_ORIGINS = [
        "https://app-one-lake-13.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    logger.warning("CORS_ORIGINS not set in environment, using default origins")

logger.info(f"CORS_ORIGINS={CORS_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router'ları CORS middleware’den sonra ekle ---
app.include_router(api_router)

MODULES_ENABLED = os.environ.get("MODULES_ENABLED", "false").lower() == "true"
if MODULES_ENABLED:
    try:
        from modules.billing.routes import billing_router
        app.include_router(billing_router)
        logger.info("Billing module router loaded")
    except Exception as e:
        logger.warning(f"Failed to load billing module: {e}")

# --- Startup ve Shutdown event'leri ---
@app.on_event("startup")
async def startup_event():
    if MODULES_ENABLED:
        try:
            from modules.scheduler import start_scheduler
            start_scheduler()
        except Exception as e:
            logger.warning(f"Failed to start scheduler: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if MODULES_ENABLED:
        try:
            from modules.scheduler import stop_scheduler
            stop_scheduler()
        except Exception as e:
            logger.warning(f"Failed to stop scheduler: {e}")
    client.close()


# ==================== OWNER & COMPANY UPDATE EXAMPLE ====================

async def update_company_and_owner(data: dict, company_id: str, current_user: dict):
# Owner bilgilerini güncelle
if "owner_username" in data or "owner_full_name" in data:
owner = await db.users.find_one({"company_id": company_id, "is_owner": True})
if owner:
owner_update = {}
if "owner_username" in data:
owner_update["username"] = data["owner_username"]
if "owner_full_name" in data:
owner_update["full_name"] = data["owner_full_name"]
if "reset_password" in data and data["reset_password"]:
new_password = data.get("owner_username", owner.get("username"))
owner_update["password_hash"] = get_password_hash(new_password)
if owner_update:
await db.users.update_one({"id": owner["id"]}, {"$set": owner_update})

```
# Company'yi güncelle
update_data = {k: v for k, v in data.items() if k not in ["owner_username", "owner_full_name", "reset_password"]}
if update_data:
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.companies.update_one({"id": company_id}, {"$set": update_data})

# Activity log
await create_activity_log(
    company_id=company_id,
    user_id=current_user["user_id"],
    username="admin",
    full_name="Admin",
    action="update",
    entity_type="company",
    entity_id=company_id,
    description=f"Admin tarafından firma güncellendi: {data.get('company_name', 'Unknown')}",
    ip_address=current_user.get("ip_address", "unknown")
)

return {"message": "Company updated successfully"}
```


# ==================== MODELS ====================

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_code: str  # Benzersiz firma kodu (URL slug olarak kullanılır)
    company_name: str
    logo_url: Optional[str] = None  # Firma logosu URL'i
    contact_email: Optional[str] = None  # İletişim e-postası
    contact_phone: Optional[str] = None  # İletişim telefonu
    website: Optional[str] = None  # Web sitesi
    address: Optional[str] = None  # Adres
    # MODULAR SAAS: Module access control
    modules_enabled: Dict[str, bool] = Field(default_factory=lambda: {"tour": True})  # Default: tour enabled
    billing: Optional[Dict[str, Any]] = None  # { stripe_customer_id, subscriptions: [...] }
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffRole(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str  # Rol adı: Satış Temsilcisi, Operasyon Müdürü, Muhasebe, vb.
    description: Optional[str] = None
    color: str = "#3EA6FF"  # Rol rengi (kartlarda gösterilecek)
    order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    username: Optional[str] = None  # Opsiyonel - sadece web_panel_active ise
    email: Optional[EmailStr] = None
    full_name: str  # MECBURİ
    phone: Optional[str] = None
    address: Optional[str] = None
    role_id: Optional[str] = None  # YENİ - Personel rolü ID'si
    # Kişisel Bilgiler
    tc_no: Optional[str] = None  # YENİ - TC Kimlik No
    birth_date: Optional[str] = None  # YENİ - Doğum Tarihi
    gender: Optional[str] = None  # YENİ - Cinsiyet (Male, Female, Other)
    nationality: Optional[str] = None  # YENİ - Uyruk
    # İletişim Bilgileri
    emergency_contact_name: Optional[str] = None  # YENİ - Acil Durum İletişim Kişisi
    emergency_contact_phone: Optional[str] = None  # YENİ - Acil Durum İletişim Telefonu
    # İş Bilgileri
    employee_id: Optional[str] = None  # YENİ - Personel No
    hire_date: Optional[str] = None  # YENİ - İşe Giriş Tarihi
    termination_date: Optional[str] = None  # YENİ - İşten Ayrılma Tarihi
    is_active: bool = True  # YENİ - Aktif/Pasif (işten ayrılma durumu)
    # Maaş Bilgileri
    gross_salary: Optional[float] = None
    net_salary: Optional[float] = None
    salary_currency: Optional[str] = "TRY"  # YENİ - Maaş para birimi
    advance_limit: Optional[float] = None  # YENİ - Avans limiti
    # YENİ - Maaş Takip Alanları
    salary_payment_day: Optional[int] = None  # Her ayın kaçıncı günü (1-31)
    current_balance: Optional[float] = 0.0  # Güncel bakiye (alacaklı durumu - pozitif = bize borçlu, negatif = biz borçluyuz)
    current_balance_currency: Optional[str] = "TRY"  # Bakiye para birimi
    last_salary_paid_date: Optional[str] = None  # Son maaş ödeme tarihi
    last_salary_paid_amount: Optional[float] = None  # Son ödenen maaş tutarı
    # Eğitim ve Yetenekler
    languages: Optional[List[str]] = []  # YENİ - Bildiği diller
    skills: Optional[List[str]] = []  # YENİ - Yetenekler
    education_level: Optional[str] = None  # YENİ - Eğitim Seviyesi
    education_field: Optional[str] = None  # YENİ - Eğitim Alanı
    # Ehliyet Bilgileri
    driving_license_class: Optional[str] = None  # YENİ - Ehliyet Sınıfı
    driving_license_no: Optional[str] = None  # YENİ - Ehliyet No
    driving_license_expiry: Optional[str] = None  # YENİ - Ehliyet Bitiş Tarihi
    # Web Panel Ayarları
    web_panel_active: bool = False  # YENİ - Web panele erişim
    permissions: Dict[str, Dict[str, bool]] = Field(default_factory=dict)
    is_admin: bool = False
    # Diğer
    notes: Optional[str] = None  # YENİ - Notlar
    avatar_url: Optional[str] = None  # YENİ - Profil fotoğrafı URL'i
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None  # YENİ - Son güncelleme tarihi

class TourType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    duration_hours: float
    description: Optional[str] = None
    order: Optional[int] = 0
    default_price: Optional[float] = None
    default_currency: Optional[str] = "EUR"
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = True

class PaymentType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    code: str  # "cash", "credit_card", "bank_transfer", vb. (unique)
    description: Optional[str] = None
    is_active: bool = True  # Aktif/Pasif
    # Ödeme tipi özellikleri
    requires_bank_account: bool = False  # Banka hesabı seçimi gerekli mi?
    requires_credit_card: bool = False  # Kredi kartı hesabı seçimi gerekli mi?
    allows_transfer_to_cari: bool = False  # Cariye aktarım yapılabilir mi?
    requires_due_date: bool = False  # Vade tarihi gerekli mi?
    is_settlement: bool = False  # Mahsup işlemi mi? (borç silme)
    order: int = 0  # Sıralama
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CariAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    cari_code: Optional[str] = None  # YENİ - Benzersiz cari kodu (rezervasyon paneli için)
    authorized_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    pickup_location: Optional[str] = None
    pickup_maps_link: Optional[str] = None
    balance_eur: float = 0.0
    balance_usd: float = 0.0
    balance_try: float = 0.0
    notes: Optional[str] = None
    # YENİ - Maaş Bölümü
    is_staff_payment: bool = False  # Bu cari hesap personel maaşları için mi?
    staff_user_id: Optional[str] = None  # İlgili personel ID (eğer personel ise)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Cari(BaseModel):
    """Cari (firma) rezervasyon paneli için hesap modeli"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    cari_code: str  # UNIQUE, ör: TC-<random> veya şirket kodu
    password_hash: str
    require_password_change: bool = True  # İlk girişte true
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    display_name: str  # Cari adı (okunabilir)
    is_active: bool = True

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    cari_id: str
    cari_name: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    tour_type_id: Optional[str] = None
    tour_type_name: Optional[str] = None
    customer_name: str
    customer_contact: Optional[str] = None
    person_count: int
    atv_count: int
    pickup_location: Optional[str] = None
    pickup_maps_link: Optional[str] = None
    pickup_time: Optional[str] = None  # Pick-up saati (HH:MM formatında)
    price: float
    currency: str = "EUR"  # EUR, USD, TRY
    exchange_rate: float = 1.0
    notes: Optional[str] = None
    status: str = "confirmed"  # confirmed, cancelled, completed, pending_approval, approved, rejected
    cancellation_reason: Optional[str] = None  # İptal sebebi/açıklama
    cancelled_at: Optional[datetime] = None  # İptal tarihi
    no_show_amount: Optional[float] = None  # No-show bedeli
    no_show_currency: Optional[str] = None  # No-show bedeli para birimi
    no_show_applied: bool = False  # No-show uygulandı mı?
    voucher_code: Optional[str] = None  # Voucher numarası (VCHR-xxxx formatında)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # YENİ - Cari rezervasyon alanları
    reservation_source: str = "system"  # "system" | "cari"
    created_by_cari: Optional[str] = None  # Cari ID (ObjectId string)
    cari_code_snapshot: Optional[str] = None  # Cari code at creation time (readonly)
    approved_by: Optional[str] = None  # User ID who approved
    approved_at: Optional[datetime] = None  # Approval timestamp

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    cari_id: str
    transaction_type: str  # debit (borç), credit (alacak), payment (tahsilat), refund (iade)
    amount: float
    currency: str = "EUR"
    exchange_rate: float = 1.0
    payment_type_id: Optional[str] = None
    payment_type_name: Optional[str] = None
    description: str
    reference_id: Optional[str] = None  # reservation_id, sale_id, etc.
    reference_type: Optional[str] = None  # reservation, sale, service, manual, no_show_penalty
    date: str
    time: Optional[str] = None  # HH:MM formatında saat
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # YENİ alanlar - Tahsilat ve Kasa Yönetimi
    payment_method: Optional[str] = None  # "cash", "bank_transfer", "credit_card"
    bank_account_id: Optional[str] = None  # BankAccount ID (havale/kredi kartı için)
    cash_account_id: Optional[str] = None  # CashAccount ID (hangi kasaya gittiği)
    commission_amount: Optional[float] = None  # Komisyon tutarı (kredi kartı için)
    net_amount: Optional[float] = None  # Net tutar (komisyon düşülmüş)
    valor_date: Optional[str] = None  # Valör tarihi (YYYY-MM-DD) - kredi kartı için
    is_settled: bool = False  # Valör süresi doldu mu? (kredi kartı için)
    settled_at: Optional[datetime] = None  # Ne zaman hesaba geçti
    # YENİ alanlar - Ödeme Tipi Aksiyonları
    transfer_to_cari_id: Optional[str] = None  # Cariye aktarım için hedef cari ID
    due_date: Optional[str] = None  # Vade tarihi (YYYY-MM-DD) - çek/senet için
    check_number: Optional[str] = None  # Çek/Senet numarası

class Bank(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str  # Banka adı: Ziraat Bankası, İş Bankası, vb.
    code: Optional[str] = None  # Banka kodu
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BankAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    bank_id: str  # Bank ID
    account_type: str  # "bank_account" (Havale) veya "credit_card" (Kredi Kartı)
    account_name: str  # Hesap adı: "Ana Hesap", "Kredi Kartı - Visa", vb.
    account_number: Optional[str] = None  # Hesap numarası
    iban: Optional[str] = None  # IBAN (banka hesabı için)
    currency: str = "TRY"  # Hesap para birimi
    is_active: bool = True
    # Kredi Kartı Özellikleri (sadece account_type="credit_card" ise)
    commission_rate: Optional[float] = None  # Komisyon oranı (örn: 2.5 = %2.5)
    valor_days: Optional[int] = None  # Valör süresi (gün cinsinden)
    order: int = 0  # Sıralama
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CashAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    account_type: str  # "cash" (Nakit Kasa), "bank_account" (Banka Hesabı), "credit_card" (Kredi Kartı)
    account_name: str  # "Nakit Kasa", "Ziraat Bankası - Ana Hesap", "Kredi Kartı - Visa"
    bank_account_id: Optional[str] = None  # BankAccount ID (eğer banka/kredi kartı ise)
    currency: str = "TRY"  # Kasa para birimi
    current_balance: float = 0.0  # Güncel bakiye
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentSettlement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    transaction_id: str  # Transaction ID
    bank_account_id: str  # BankAccount ID (kredi kartı hesabı)
    original_amount: float  # Orijinal tahsilat tutarı
    commission_amount: float  # Komisyon tutarı
    net_amount: float  # Net tutar (original - commission)
    currency: str
    payment_date: str  # Tahsilat tarihi (YYYY-MM-DD)
    settlement_date: str  # Hesaba geçeceği tarih (YYYY-MM-DD)
    is_settled: bool = False  # Hesaba geçti mi?
    settled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    """Bildirim modeli"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: Optional[str] = None  # Belirli bir kullanıcıya özel (None ise tüm adminlere)
    type: str  # "pending_reservation", "reservation_approved", "reservation_rejected", vb.
    title: str
    message: str
    entity_type: Optional[str] = None  # "reservation", "transaction", vb.
    entity_id: Optional[str] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CheckPromissory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    transaction_id: str  # Transaction ID
    cari_id: str  # Cari hesap ID
    check_number: Optional[str] = None  # Çek/Senet numarası
    bank_name: Optional[str] = None  # Banka adı
    due_date: str  # Vade tarihi (YYYY-MM-DD)
    amount: float
    currency: str
    description: Optional[str] = None
    is_collected: bool = False  # Tahsil edildi mi?
    collected_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExtraSale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    product_name: str
    cari_id: str
    cari_name: str
    customer_name: str
    person_count: Optional[int] = None  # Pax sayısı
    customer_contact: Optional[str] = None  # Telefon numarası
    pickup_location: Optional[str] = None
    date: str
    time: str
    sale_price: float
    purchase_price: Optional[float] = 0.0
    currency: str = "EUR"
    exchange_rate: float = 1.0
    supplier_id: Optional[str] = None  # cari_id of supplier
    supplier_name: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"  # "active", "cancelled"
    cancellation_reason: Optional[str] = None  # İptal sebebi
    cancelled_at: Optional[datetime] = None  # İptal tarihi
    no_show_amount: Optional[float] = None  # No-show bedeli
    no_show_currency: Optional[str] = None  # No-show bedeli para birimi
    no_show_applied: bool = False  # No-show uygulandı mı?
    voucher_code: Optional[str] = None  # Voucher numarası (VCHR-xxxx formatında)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServicePurchase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    supplier_id: str  # cari_id
    supplier_name: str
    service_description: str
    amount: float
    currency: str = "EUR"
    exchange_rate: float = 1.0
    date: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SeasonalPrice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    start_date: str
    end_date: str
    currency: str = "TRY"
    tour_type_ids: List[str] = Field(default_factory=list)  # Birden fazla tur tipi
    cari_prices: Dict[str, float] = Field(default_factory=dict)  # Cari ID -> Fiyat mapping
    apply_to_new_caris: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SalaryTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str  # Personel ID
    transaction_type: str  # "salary_payment", "advance_payment", "overtime_payment", "deduction"
    amount: float
    currency: str
    exchange_rate: float = 1.0
    description: Optional[str] = None
    payment_date: str  # YYYY-MM-DD
    period_start: Optional[str] = None  # Dönem başlangıç (fazla mesai, izin için)
    period_end: Optional[str] = None  # Dönem bitiş
    reference_id: Optional[str] = None  # İlgili kayıt ID (overtime, leave vb.)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # İşlemi yapan kullanıcı ID

class Overtime(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str  # Personel ID
    date: str  # YYYY-MM-DD
    hours: float  # Fazla mesai saati
    hourly_rate: Optional[float] = None  # Saatlik ücret (opsiyonel, net_salary/160 gibi hesaplanabilir)
    amount: Optional[float] = None  # Toplam tutar
    currency: str = "TRY"
    description: Optional[str] = None
    is_paid: bool = False  # Ödendi mi?
    paid_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class Leave(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str  # Personel ID
    leave_type: str  # "annual", "sick", "unpaid", "maternity", "other"
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    days: float  # İzin gün sayısı
    is_paid: bool = False  # Ücretli izin mi?
    description: Optional[str] = None
    approved_by: Optional[str] = None  # Onaylayan kullanıcı ID
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class VehicleCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str  # Kategori adı: ATV, Jeep Safari, Klasik Araç, vb.
    description: Optional[str] = None
    order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    plate_number: str
    category_id: Optional[str] = None  # YENİ - Araç kategorisi ID'si
    vehicle_type: Optional[str] = None  # Mevcut - backward compatibility için tutulabilir
    brand: Optional[str] = None
    model: Optional[str] = None
    insurance_expiry: Optional[str] = None
    inspection_expiry: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncomeCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Income(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    description: str
    income_category_id: Optional[str] = None
    income_category_name: Optional[str] = None
    amount: float
    currency: str = "EUR"
    exchange_rate: float = 1.0
    date: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    description: str
    expense_category_id: Optional[str] = None
    expense_category_name: Optional[str] = None
    amount: float
    currency: str = "EUR"
    exchange_rate: float = 1.0
    date: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    username: str
    full_name: str
    action: str  # create, update, delete, payment, etc.
    entity_type: str  # reservation, extra_sale, transaction, cari_account, etc.
    entity_id: str
    entity_name: Optional[str] = None  # Rezervasyon müşteri adı, cari firma adı, vb.
    description: str  # Detaylı açıklama
    changes: Optional[Dict[str, Any]] = None  # Değişiklik detayları (eski değer -> yeni değer)
    ip_address: Optional[str] = None  # IP adresi (güvenlik ve takip için)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== INPUT MODELS ====================

class CompanyCreate(BaseModel):
    company_name: str
    admin_username: str
    admin_password: str
    admin_full_name: str
    admin_email: Optional[EmailStr] = None

class LoginRequest(BaseModel):
    company_code: str
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[EmailStr] = None
    permissions: Dict[str, Dict[str, bool]] = Field(default_factory=dict)
    is_admin: bool = False

class ReservationCreate(BaseModel):
    cari_id: str
    date: str
    time: str
    tour_type_id: Optional[str] = None
    customer_name: str
    person_count: int
    atv_count: int
    pickup_location: Optional[str] = None
    pickup_maps_link: Optional[str] = None
    price: float
    currency: str = "EUR"
    exchange_rate: float = 1.0
    notes: Optional[str] = None

class TransactionCreate(BaseModel):
    cari_id: str
    transaction_type: str
    amount: float
    currency: str = "EUR"
    exchange_rate: float = 1.0
    payment_type_id: Optional[str] = None
    description: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    date: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_cari_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    """Cari için JWT token oluştur"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "role": "cari"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_cari(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Cari JWT token'ını doğrula"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        cari_id: str = payload.get("sub")
        company_id: str = payload.get("company_id")
        role: str = payload.get("role")
        
        if cari_id is None or company_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        if role != "cari":
            raise HTTPException(status_code=403, detail="Invalid role - cari access required")
        
        # Cari hesabının aktif olduğunu kontrol et
        cari = await db.caris.find_one({"id": cari_id, "company_id": company_id})
        if not cari:
            raise HTTPException(status_code=404, detail="Cari account not found")
        
        if not cari.get("is_active", True):
            raise HTTPException(status_code=403, detail="Cari account is inactive")
        
        # IP adresini al
        ip_address = get_client_ip(request)
        
        return {
            "cari_id": cari_id,
            "company_id": company_id,
            "cari_code": cari.get("cari_code"),
            "display_name": cari.get("display_name"),
            "require_password_change": cari.get("require_password_change", False),
            "ip_address": ip_address
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_client_ip(request: Request) -> str:
    """Client IP adresini al - Proxy arkasında da çalışır"""
    # X-Forwarded-For header'ını kontrol et (proxy/load balancer arkasında)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # İlk IP adresini al (birden fazla olabilir)
        ip = forwarded_for.split(",")[0].strip()
        if ip:
            return ip
    
    # X-Real-IP header'ını kontrol et (nginx gibi)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Direkt client IP
    if request.client:
        return request.client.host
    
    return "unknown"

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        company_id: str = payload.get("company_id")
        if user_id is None or company_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        # IP adresini al
        ip_address = get_client_ip(request)
        
        return {
            "user_id": user_id,
            "company_id": company_id,
            "is_admin": payload.get("is_admin", False),
            "ip_address": ip_address
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_company_code() -> str:
    return secrets.token_hex(4).upper()

def generate_cari_code(company_short: str = "CR") -> str:
    """Benzersiz cari kodu oluştur - format: CR-XXXXXX (6 haneli random)"""
    random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return f"{company_short}-{random_suffix}"

def generate_voucher_code() -> str:
    """VCHR-sadece rakamlar formatında voucher kodu oluştur"""
    # 6 haneli rastgele rakamlar
    random_digits = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return f"VCHR-{random_digits}"

async def get_tcmb_exchange_rates():
    """TCMB (Türkiye Cumhuriyet Merkez Bankası) API'den döviz kurlarını al (TRY bazlı)"""
    try:
        # TCMB XML API - Günlük döviz kurları
        url = "https://www.tcmb.gov.tr/kurlar/today.xml"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(response.content)
            
            rates = {"TRY": 1.0}  # Ana para birimi TRY
            
            # EUR (Euro)
            eur_element = root.find(".//Currency[@Kod='EUR']")
            if eur_element is not None:
                eur_buying = eur_element.find("ForexBuying")
                if eur_buying is not None and eur_buying.text:
                    rates["EUR"] = float(eur_buying.text)  # 1 EUR = X TRY
            
            # USD (ABD Doları)
            usd_element = root.find(".//Currency[@Kod='USD']")
            if usd_element is not None:
                usd_buying = usd_element.find("ForexBuying")
                if usd_buying is not None and usd_buying.text:
                    rates["USD"] = float(usd_buying.text)  # 1 USD = X TRY
            
            return {
                "success": True,
                "rates": rates,
                "source": "TCMB",
                "date": datetime.now().strftime("%Y-%m-%d")
            }
    except Exception as e:
        print(f"TCMB API hatası: {e}")
    
    # Fallback: Eski API veya varsayılan değerler
    return {
        "success": False,
        "rates": {"TRY": 1.0, "EUR": 35.0, "USD": 34.0},  # Varsayılan değerler
        "source": "fallback",
        "date": datetime.now().strftime("%Y-%m-%d")
    }

async def get_exchange_rates():
    """Ücretsiz exchangerate-api.com kullanarak döviz kurlarını al (TRY bazlı)"""
    try:
        response = requests.get("https://api.exchangerate-api.com/v4/latest/TRY", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                "TRY": 1.0,
                "EUR": 1.0 / data["rates"].get("EUR", 0.0286),  # 1 EUR = X TRY
                "USD": 1.0 / data["rates"].get("USD", 0.0294)  # 1 USD = X TRY
            }
    except:
        pass
    # Fallback değerler (TRY bazlı)
    return {"TRY": 1.0, "EUR": 35.0, "USD": 34.0}

def generate_voucher_code(prefix: str = "VCHR") -> str:
    """Voucher kodu oluştur - format: PREFIX-XXXX (4 haneli random)"""
    random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    return f"{prefix}-{random_suffix}"

def generate_b2b_voucher_code() -> str:
    """B2B (Cari panel) rezervasyonları için voucher kodu oluştur"""
    return generate_voucher_code("B2B")

async def create_activity_log(
    company_id: str,
    user_id: str,
    username: str,
    full_name: str,
    action: str,
    entity_type: str,
    entity_id: str,
    entity_name: Optional[str] = None,
    description: str = "",
    changes: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    current_user: Optional[dict] = None  # Opsiyonel: current_user varsa IP adresini otomatik al
):
    """Activity log kaydı oluştur
    
    Args:
        current_user: Eğer verilirse, IP adresini otomatik olarak current_user'dan alır
        ip_address: Manuel IP adresi (current_user yoksa kullanılır)
    """
    try:
        # Eğer current_user verilmişse ve ip_address yoksa, current_user'dan al
        if current_user and not ip_address:
            ip_address = current_user.get("ip_address")
        
        log = ActivityLog(
            company_id=company_id,
            user_id=user_id,
            username=username,
            full_name=full_name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            description=description,
            changes=changes,
            ip_address=ip_address
        )
        log_doc = log.model_dump()
        # MongoDB'de datetime objesi olarak sakla (string değil)
        # created_at zaten datetime objesi, sadece model_dump() ile dict'e çevir
        # MongoDB datetime objesi olarak saklayacak
        await db.activity_logs.insert_one(log_doc)
    except Exception as e:
        # Log hatası sistemin çalışmasını engellememeli
        logging.error(f"Activity log oluşturulamadı: {e}")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register_company(data: CompanyCreate):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": data.admin_username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Generate unique company code
    company_code = generate_company_code()
    while await db.companies.find_one({"company_code": company_code}):
        company_code = generate_company_code()
    
    # Create company
    company = Company(company_code=company_code, company_name=data.company_name)
    company_doc = company.model_dump()
    company_doc['created_at'] = company_doc['created_at'].isoformat()
    await db.companies.insert_one(company_doc)
    
    # Create admin user
    hashed_password = hash_password(data.admin_password)
    user = User(
        company_id=company.id,
        username=data.admin_username,
        email=data.admin_email,
        full_name=data.admin_full_name,
        is_admin=True,
        permissions={}
    )
    user_doc = user.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['password'] = hashed_password
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Company registered successfully",
        "company_code": company_code,
        "company_name": company.company_name
    }

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    # Find company
    company = await db.companies.find_one({"company_code": data.company_code})
    if not company:
        raise HTTPException(status_code=401, detail="Invalid company code")
    
    # Find user
    user = await db.users.find_one({"company_id": company["id"], "username": data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create token
    token = create_access_token({
        "sub": user["id"],
        "company_id": user["company_id"],
        "is_admin": user.get("is_admin", False)
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "is_admin": user.get("is_admin", False),
            "permissions": user.get("permissions", {})
        },
        "company": {
            "id": company["id"],
            "name": company["company_name"],
            "code": company["company_code"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    return {"user": user, "company": company}

@api_router.get("/companies/me")
async def get_my_company(current_user: dict = Depends(get_current_user)):
    """Get current user's company with modules_enabled"""
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"company": company}

# ==================== CARI AUTH ENDPOINTS ====================

class CariLoginRequest(BaseModel):
    username: str  # cari_code
    password: str  # cari_code (ilk girişte)
    company_code: Optional[str] = None  # Company slug (URL'den gelir, güvenlik için)

class CariChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None  # İlk girişte None olabilir
    new_password: str

@api_router.get("/cari/company/{company_slug}")
async def get_company_by_slug(company_slug: str):
    """Company bilgilerini slug ile getir (public endpoint - login sayfası için)"""
    company = await db.companies.find_one({"company_code": company_slug}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Güvenlik: Sadece login sayfası için gerekli bilgileri döndür
    return {
        "id": company.get("id"),
        "company_code": company.get("company_code"),
        "company_name": company.get("company_name"),
        "logo_url": company.get("logo_url"),
        "contact_email": company.get("contact_email"),
        "contact_phone": company.get("contact_phone"),
        "website": company.get("website"),
        "address": company.get("address")
    }

@api_router.post("/cari/auth/login")
async def cari_login(data: CariLoginRequest):
    """Cari login - username ve password cari_code olmalı, company_code ile company kontrolü yapılır"""
    # Company kontrolü - eğer company_code gönderilmişse kontrol et
    company_id = None
    if data.company_code:
        company = await db.companies.find_one({"company_code": data.company_code})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        company_id = company["id"]
    
    # Cari hesabını bul
    query = {"cari_code": data.username}
    if company_id:
        # Company kontrolü: Cari sadece belirtilen company'ye ait olmalı
        query["company_id"] = company_id
    
    cari = await db.caris.find_one(query)
    if not cari:
        raise HTTPException(status_code=401, detail="Invalid cari code or password")
    
    # Eğer company_code gönderilmişse, cari'nin company_id'si ile eşleşmeli
    if company_id and cari.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Cari code does not belong to this company")
    
    if not cari.get("is_active", True):
        raise HTTPException(status_code=403, detail="Cari account is inactive")
    
    # Şifre doğrulama
    # İlk girişte: password == cari_code olmalı
    if cari.get("require_password_change", True):
        # İlk giriş: şifre cari_code ile eşleşmeli
        if data.password != data.username:
            raise HTTPException(status_code=401, detail="Invalid cari code or password")
    else:
        # Normal giriş: hash'lenmiş şifre ile kontrol et
        if not verify_password(data.password, cari["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid cari code or password")
    
    # Company bilgisini al
    company = await db.companies.find_one({"id": cari["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Token oluştur
    token = create_cari_access_token({
        "sub": cari["id"],
        "company_id": cari["company_id"]
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "cari": {
            "id": cari["id"],
            "cari_code": cari["cari_code"],
            "display_name": cari["display_name"],
            "require_password_change": cari.get("require_password_change", True)
        },
        "company": {
            "id": company["id"],
            "name": company["company_name"],
            "code": company["company_code"]
        }
    }

@api_router.post("/cari/auth/change-password")
async def cari_change_password(
    data: CariChangePasswordRequest,
    current_cari: dict = Depends(get_current_cari)
):
    """Cari şifre değiştirme"""
    cari = await db.caris.find_one({"id": current_cari["cari_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # İlk girişte (require_password_change=True) old_password kontrolü atlanabilir
    require_password_change = cari.get("require_password_change", False)
    
    if not require_password_change:
        # Normal şifre değiştirme: eski şifre kontrolü gerekli
        if not data.old_password:
            raise HTTPException(status_code=400, detail="Old password is required")
        if not verify_password(data.old_password, cari["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid old password")
    
    # Yeni şifreyi hash'le ve güncelle
    new_password_hash = hash_password(data.new_password)
    await db.caris.update_one(
        {"id": current_cari["cari_id"]},
        {
            "$set": {
                "password_hash": new_password_hash,
                "require_password_change": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Activity log
    await create_activity_log(
        company_id=current_cari["company_id"],
        user_id=current_cari["cari_id"],
        username=current_cari.get("cari_code", ""),
        full_name=current_cari.get("display_name", ""),
        action="cari_password_change",
        entity_type="cari",
        entity_id=current_cari["cari_id"],
        entity_name=current_cari.get("display_name", ""),
        description="Cari şifresi değiştirildi",
        ip_address=current_cari.get("ip_address")
    )
    
    return {"message": "Password changed successfully"}

# ==================== CURRENCY ENDPOINT ====================

@api_router.get("/currency/rates")
async def get_currency_rates(current_user: dict = Depends(get_current_user)):
    """Mevcut sistem döviz kurlarını getir"""
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    rates = company.get("currency_rates", {})
    
    # Varsayılan değerler
    default_rates = {"TRY": 1.0, "EUR": 35.0, "USD": 34.0}
    for currency in ["EUR", "USD", "TRY"]:
        if currency not in rates:
            rates[currency] = default_rates.get(currency, 1.0)
    
    return {
        "rates": rates,
        "locked": company.get("currency_rates_locked", False),
        "last_updated": company.get("currency_rates_last_updated"),
        "source": company.get("currency_rates_source", "manual"),
        "base_currency": "TRY"
    }

@api_router.get("/currency/rates/header")
async def get_header_currency_rates(current_user: dict = Depends(get_current_user)):
    """Header döviz çevirici kurlarını getir"""
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    rates = company.get("header_currency_rates", {})
    
    # Varsayılan değerler (sistem kurlarından kopyala veya varsayılan)
    if not rates:
        system_rates = company.get("currency_rates", {})
        rates = system_rates.copy() if system_rates else {"TRY": 1.0, "EUR": 35.0, "USD": 34.0}
    
    default_rates = {"TRY": 1.0, "EUR": 35.0, "USD": 34.0}
    for currency in ["EUR", "USD", "TRY"]:
        if currency not in rates:
            rates[currency] = default_rates.get(currency, 1.0)
    
    return {
        "rates": rates,
        "locked": company.get("header_currency_rates_locked", False),
        "last_updated": company.get("header_currency_rates_last_updated"),
        "source": company.get("header_currency_rates_source", "manual"),
        "base_currency": "TRY"
    }

@api_router.get("/currency/rates/tcmb")
async def get_tcmb_rates(current_user: dict = Depends(get_current_user)):
    """Merkez Bankası kurlarını getir (güncelleme için)"""
    tcmb_data = await get_tcmb_exchange_rates()
    return tcmb_data

@api_router.get("/busy-hour-threshold")
async def get_busy_hour_threshold(current_user: dict = Depends(get_current_user)):
    """Yoğun saat eşiğini getir"""
    company = await db.companies.find_one({"id": current_user["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Varsayılan değer: 80% (0.8)
    threshold = company.get("busy_hour_threshold", 0.8)
    
    return {
        "threshold": threshold,
        "message": "Busy hour threshold retrieved successfully"
    }

@api_router.put("/busy-hour-threshold")
async def update_busy_hour_threshold(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Yoğun saat eşiğini güncelle"""
    company_id = current_user["company_id"]
    threshold = data.get("threshold", 0.8)
    
    # Threshold değerini 0-1 arasında kontrol et
    if not isinstance(threshold, (int, float)) or threshold < 0 or threshold > 1:
        raise HTTPException(status_code=400, detail="Threshold must be between 0 and 1")
    
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {"busy_hour_threshold": threshold}}
    )
    
    # Activity log
    await create_activity_log(
        company_id=company_id,
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="busy_hour_threshold",
        entity_id=company_id,
        entity_name="Busy Hour Threshold",
        description=f"Yoğun saat eşiği güncellendi: {threshold}"
    )
    
    return {
        "threshold": threshold,
        "message": "Busy hour threshold updated successfully"
    }

@api_router.put("/currency/rates")
async def update_currency_rates(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Sistem döviz kurlarını güncelle (manuel veya otomatik)"""
    company_id = current_user["company_id"]
    
    rates = data.get("rates", {})
    locked = data.get("locked")
    source = data.get("source")
    
    update_data = {
        "currency_rates": rates,
        "currency_rates_last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    if locked is not None:
        update_data["currency_rates_locked"] = locked
    
    if source:
        update_data["currency_rates_source"] = source
    
    await db.companies.update_one(
        {"id": company_id},
        {"$set": update_data}
    )
    
    # Activity log
    await create_activity_log(
        company_id=company_id,
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="currency_rates",
        entity_id="currency_rates",
        entity_name="Sistem Döviz Kurları",
        description=f"Sistem kurları güncellendi: {source or 'manuel'}",
        changes={"rates": rates, "locked": locked, "source": source}
    )
    
    return {"message": "Sistem kurları güncellendi", "rates": rates}

@api_router.put("/currency/rates/header")
async def update_header_currency_rates(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Header döviz çevirici kurlarını güncelle"""
    company_id = current_user["company_id"]
    
    rates = data.get("rates", {})
    locked = data.get("locked")
    source = data.get("source")
    
    update_data = {
        "header_currency_rates": rates,
        "header_currency_rates_last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    if locked is not None:
        update_data["header_currency_rates_locked"] = locked
    
    if source:
        update_data["header_currency_rates_source"] = source
    
    await db.companies.update_one(
        {"id": company_id},
        {"$set": update_data}
    )
    
    # Activity log
    await create_activity_log(
        company_id=company_id,
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="header_currency_rates",
        entity_id="header_currency_rates",
        entity_name="Döviz Çevirici Kurları",
        description=f"Döviz çevirici kurları güncellendi: {source or 'manuel'}",
        changes={"rates": rates, "locked": locked, "source": source}
    )
    
    return {"message": "Döviz çevirici kurları güncellendi", "rates": rates}

@api_router.post("/currency/rates/refresh")
async def refresh_currency_rates(current_user: dict = Depends(get_current_user)):
    """Merkez Bankası kurları ile sistem kurlarını güncelle"""
    company_id = current_user["company_id"]
    
    # TCMB kurlarını al
    tcmb_data = await get_tcmb_exchange_rates()
    
    if not tcmb_data.get("success"):
        raise HTTPException(status_code=500, detail="TCMB kurları alınamadı")
    
    rates = tcmb_data["rates"]
    
    # Company'yi güncelle
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "currency_rates": rates,
            "currency_rates_locked": False,  # Otomatik güncellemede kilidi kaldır
            "currency_rates_source": "TCMB",
            "currency_rates_last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }}
    )
    
    # Activity log
    await create_activity_log(
        company_id=company_id,
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="currency_rates",
        entity_id="currency_rates",
        entity_name="Sistem Döviz Kurları",
        description="Sistem kurları Merkez Bankası kurları ile güncellendi",
        changes={"rates": rates, "source": "TCMB"},
        current_user=current_user
    )
    
    return {
        "message": "Sistem kurları Merkez Bankası kurları ile güncellendi",
        "rates": rates,
        "source": "TCMB"
    }

@api_router.post("/currency/rates/header/refresh")
async def refresh_header_currency_rates(current_user: dict = Depends(get_current_user)):
    """Merkez Bankası kurları ile header çevirici kurlarını güncelle"""
    company_id = current_user["company_id"]
    
    # TCMB kurlarını al
    tcmb_data = await get_tcmb_exchange_rates()
    
    if not tcmb_data.get("success"):
        raise HTTPException(status_code=500, detail="TCMB kurları alınamadı")
    
    rates = tcmb_data["rates"]
    
    # Company'yi güncelle
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "header_currency_rates": rates,
            "header_currency_rates_locked": False,
            "header_currency_rates_source": "TCMB",
            "header_currency_rates_last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }}
    )
    
    # Activity log
    await create_activity_log(
        company_id=company_id,
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="header_currency_rates",
        entity_id="header_currency_rates",
        entity_name="Döviz Çevirici Kurları",
        description="Döviz çevirici kurları Merkez Bankası kurları ile güncellendi",
        changes={"rates": rates, "source": "TCMB"},
        current_user=current_user
    )
    
    return {
        "message": "Döviz çevirici kurları Merkez Bankası kurları ile güncellendi",
        "rates": rates,
        "source": "TCMB"
    }

# ==================== TOUR TYPES ====================

@api_router.get("/tour-types", response_model=List[TourType])
async def get_tour_types(current_user: dict = Depends(get_current_user)):
    tour_types = await db.tour_types.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    return tour_types

@api_router.get("/cari/tour-types", response_model=List[TourType])
async def cari_get_tour_types(current_cari: dict = Depends(get_current_cari)):
    """Cari kullanıcıları için tour types"""
    tour_types = await db.tour_types.find({"company_id": current_cari["company_id"]}, {"_id": 0}).to_list(1000)
    return tour_types

@api_router.post("/tour-types", response_model=TourType)
async def create_tour_type(data: dict, current_user: dict = Depends(get_current_user)):
    tour_type = TourType(
        company_id=current_user["company_id"],
        name=data.get("name"),
        duration_hours=data.get("duration_hours", 0),
        description=data.get("description"),
        order=data.get("order", 0),
        default_price=data.get("default_price"),
        default_currency=data.get("default_currency", "EUR"),
        color=data.get("color"),
        icon=data.get("icon"),
        is_active=data.get("is_active", True)
    )
    tour_type_doc = tour_type.model_dump()
    await db.tour_types.insert_one(tour_type_doc)
    return tour_type

@api_router.put("/tour-types/{tour_type_id}")
async def update_tour_type(tour_type_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    result = await db.tour_types.update_one(
        {"id": tour_type_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tour type not found")
    return {"message": "Tour type updated"}

@api_router.get("/tour-types/{tour_type_id}/statistics")
async def get_tour_type_statistics(tour_type_id: str, current_user: dict = Depends(get_current_user)):
    """Tur tipi istatistiklerini getir"""
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "tour_type_id": tour_type_id,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    total_reservations = len(reservations)
    total_revenue = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    
    for r in reservations:
        if r.get("price") and r.get("currency"):
            total_revenue[r["currency"]] += r.get("price", 0)
    
    return {
        "tour_type_id": tour_type_id,
        "total_reservations": total_reservations,
        "total_revenue": total_revenue
    }

@api_router.delete("/tour-types/{tour_type_id}")
async def delete_tour_type(tour_type_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tour_types.delete_one({"id": tour_type_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tour type not found")
    return {"message": "Tour type deleted"}

# ==================== PAYMENT TYPES ====================

async def initialize_default_payment_types(company_id: str):
    """Şirket oluşturulduğunda default ödeme tipleri ekle"""
    default_types = [
        {
            "name": "Nakit",
            "code": "cash",
            "description": "Nakit ödeme",
            "is_active": True,
            "requires_bank_account": False,
            "requires_credit_card": False,
            "allows_transfer_to_cari": False,
            "requires_due_date": False,
            "is_settlement": False,
            "order": 1
        },
        {
            "name": "Kredi Kartı",
            "code": "credit_card",
            "description": "Kredi kartı ile ödeme",
            "is_active": True,
            "requires_bank_account": True,
            "requires_credit_card": True,
            "allows_transfer_to_cari": False,
            "requires_due_date": False,
            "is_settlement": False,
            "order": 2
        },
        {
            "name": "Havale",
            "code": "bank_transfer",
            "description": "Banka havalesi ile ödeme",
            "is_active": True,
            "requires_bank_account": True,
            "requires_credit_card": False,
            "allows_transfer_to_cari": False,
            "requires_due_date": False,
            "is_settlement": False,
            "order": 3
        },
        {
            "name": "Cariye Aktar",
            "code": "transfer_to_cari",
            "description": "Tutar cari hesaba aktarılır",
            "is_active": True,
            "requires_bank_account": False,
            "requires_credit_card": False,
            "allows_transfer_to_cari": True,
            "requires_due_date": False,
            "is_settlement": False,
            "order": 4
        },
        {
            "name": "Çek/Senet",
            "code": "check_promissory",
            "description": "Çek veya senet ile ödeme",
            "is_active": True,
            "requires_bank_account": False,
            "requires_credit_card": False,
            "allows_transfer_to_cari": False,
            "requires_due_date": True,
            "is_settlement": False,
            "order": 5
        },
        {
            "name": "Mahsup",
            "code": "write_off",
            "description": "Mahsup işlemi (kur farkı vb.)",
            "is_active": True,
            "requires_bank_account": False,
            "requires_credit_card": False,
            "allows_transfer_to_cari": False,
            "requires_due_date": False,
            "is_settlement": True,
            "order": 6
        },
        {
            "name": "Online Ödeme",
            "code": "online_payment",
            "description": "Online ödeme sistemi",
            "is_active": True,
            "requires_bank_account": True,
            "requires_credit_card": True,
            "allows_transfer_to_cari": False,
            "requires_due_date": False,
            "is_settlement": False,
            "order": 7
        },
        {
            "name": "Mail Order",
            "code": "mail_order",
            "description": "Mail order ile ödeme",
            "is_active": True,
            "requires_bank_account": True,
            "requires_credit_card": True,
            "allows_transfer_to_cari": False,
            "requires_due_date": False,
            "is_settlement": False,
            "order": 8
        }
    ]
    
    for payment_type_data in default_types:
        # Zaten var mı kontrol et
        existing = await db.payment_types.find_one({
            "company_id": company_id,
            "code": payment_type_data["code"]
        })
        
        if not existing:
            payment_type = PaymentType(
                company_id=company_id,
                **payment_type_data
            )
            payment_type_doc = payment_type.model_dump()
            payment_type_doc['created_at'] = payment_type_doc['created_at'].isoformat()
            await db.payment_types.insert_one(payment_type_doc)

@api_router.get("/payment-types")
async def get_payment_types(
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Ödeme tiplerini getir"""
    query = {"company_id": current_user["company_id"]}
    if active_only:
        query["is_active"] = True
    
    payment_types = await db.payment_types.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return payment_types

@api_router.post("/payment-types")
async def create_payment_type(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni ödeme tipi oluştur - Sadece özel tipler için"""
    # Code kontrolü - default tipler oluşturulamaz
    default_codes = ["cash", "credit_card", "bank_transfer", "transfer_to_cari", "check_promissory", "write_off", "online_payment", "mail_order"]
    if data.get("code") in default_codes:
        raise HTTPException(status_code=400, detail="Bu ödeme tipi default olarak sistemde mevcuttur")
    
    payment_type = PaymentType(
        company_id=current_user["company_id"],
        name=data.get("name"),
        code=data.get("code", data.get("name", "").lower().replace(" ", "_")),
        description=data.get("description"),
        is_active=data.get("is_active", True),
        requires_bank_account=data.get("requires_bank_account", False),
        requires_credit_card=data.get("requires_credit_card", False),
        allows_transfer_to_cari=data.get("allows_transfer_to_cari", False),
        requires_due_date=data.get("requires_due_date", False),
        is_settlement=data.get("is_settlement", False),
        order=data.get("order", 0)
    )
    payment_type_doc = payment_type.model_dump()
    payment_type_doc['created_at'] = payment_type_doc['created_at'].isoformat()
    await db.payment_types.insert_one(payment_type_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="create",
        entity_type="payment_type",
        entity_id=payment_type.id,
        entity_name=payment_type.name,
        description=f"Yeni ödeme tipi oluşturuldu: {payment_type.name}",
        changes=data,
        ip_address=current_user.get("ip_address")
    )
    
    return payment_type

@api_router.put("/payment-types/{payment_type_id}")
async def update_payment_type(
    payment_type_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Ödeme tipini güncelle - Sadece aktif/pasif durumu değiştirilebilir"""
    existing = await db.payment_types.find_one({
        "id": payment_type_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Payment type not found")
    
    # Sadece is_active alanını güncelle
    allowed_fields = ["is_active"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Sadece is_active alanı güncellenebilir")
    
    result = await db.payment_types.update_one(
        {"id": payment_type_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment type not found")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="payment_type",
        entity_id=payment_type_id,
        entity_name=existing.get("name", "Ödeme Tipi"),
        description=f"Ödeme tipi güncellendi: {existing.get('name', '')} - Aktif: {update_data.get('is_active', existing.get('is_active'))}",
        changes=update_data,
        ip_address=current_user.get("ip_address")
    )
    
    return {"message": "Payment type updated"}

@api_router.get("/payment-types/{payment_type_id}/statistics")
async def get_payment_type_statistics(payment_type_id: str, current_user: dict = Depends(get_current_user)):
    """Ödeme tipi istatistiklerini getir"""
    transactions = await db.transactions.find({
        "company_id": current_user["company_id"],
        "payment_type_id": payment_type_id,
        "transaction_type": "payment"
    }, {"_id": 0}).to_list(10000)
    
    total_usage = len(transactions)
    total_amount = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    
    for t in transactions:
        if t.get("amount") and t.get("currency"):
            amount = abs(t.get("amount", 0))
            total_amount[t["currency"]] += amount
    
    return {
        "payment_type_id": payment_type_id,
        "total_usage": total_usage,
        "total_amount": total_amount
    }

@api_router.delete("/payment-types/{payment_type_id}")
async def delete_payment_type(payment_type_id: str, current_user: dict = Depends(get_current_user)):
    """Ödeme tipini sil - Default tipler silinemez"""
    existing = await db.payment_types.find_one({
        "id": payment_type_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Payment type not found")
    
    # Default tipler silinemez
    default_codes = ["cash", "credit_card", "bank_transfer", "transfer_to_cari", "check_promissory", "write_off", "online_payment", "mail_order"]
    if existing.get("code") in default_codes:
        raise HTTPException(status_code=400, detail="Default ödeme tipleri silinemez. Sadece pasif yapılabilir.")
    
    result = await db.payment_types.delete_one({
        "id": payment_type_id,
        "company_id": current_user["company_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment type not found")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="payment_type",
        entity_id=payment_type_id,
        entity_name=existing.get("name", "Ödeme Tipi"),
        description=f"Ödeme tipi silindi: {existing.get('name', '')}",
        current_user=current_user
    )
    
    return {"message": "Payment type deleted"}

# ==================== CARI ACCOUNTS ====================

@api_router.get("/cari-accounts", response_model=List[CariAccount])
async def get_cari_accounts(search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"company_id": current_user["company_id"]}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    # Münferit cari hesabını kontrol et ve yoksa oluştur
    munferit_cari = await db.cari_accounts.find_one({
        "company_id": current_user["company_id"],
        "name": "Münferit",
        "is_munferit": True
    }, {"_id": 0})
    
    if not munferit_cari:
        # Münferit cari hesabını oluştur
        munferit_cari_doc = {
            "id": str(uuid.uuid4()),
            "company_id": current_user["company_id"],
            "name": "Münferit",
            "is_munferit": True,  # Özel flag
            "balance_eur": 0.0,
            "balance_usd": 0.0,
            "balance_try": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cari_accounts.insert_one(munferit_cari_doc)
        logger.info(f"Münferit cari hesabı oluşturuldu: {munferit_cari_doc['id']}")
    
    cari_accounts = await db.cari_accounts.find(query, {"_id": 0}).to_list(1000)
    logger.info(f"Found {len(cari_accounts)} cari accounts for company_id: {current_user['company_id']}")
    return cari_accounts

@api_router.post("/cari-accounts", response_model=CariAccount)
async def create_cari_account(data: dict, current_user: dict = Depends(get_current_user)):
    # Company kısa kodunu al
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    company_short = company.get("company_code", "CR")[:2].upper() if company else "CR"
    
    # Benzersiz cari_code oluştur
    cari_code = generate_cari_code(company_short)
    while await db.cari_accounts.find_one({"cari_code": cari_code, "company_id": current_user["company_id"]}):
        cari_code = generate_cari_code(company_short)
    
    # CariAccount oluştur
    cari = CariAccount(company_id=current_user["company_id"], cari_code=cari_code, **data)
    cari_doc = cari.model_dump()
    cari_doc['created_at'] = cari_doc['created_at'].isoformat()
    await db.cari_accounts.insert_one(cari_doc)
    
    # Otomatik olarak Cari (rezervasyon paneli) hesabı oluştur
    password_hash = hash_password(cari_code)  # İlk şifre = cari_code
    
    cari_panel = Cari(
        company_id=current_user["company_id"],
        cari_code=cari_code,
        password_hash=password_hash,
        require_password_change=True,
        display_name=cari.name,
        is_active=True
    )
    cari_panel_doc = cari_panel.model_dump()
    cari_panel_doc['created_at'] = cari_panel_doc['created_at'].isoformat()
    cari_panel_doc['updated_at'] = cari_panel_doc['updated_at'].isoformat()
    await db.caris.insert_one(cari_panel_doc)
    
    # Activity log
    user = await db.users.find_one({"id": current_user["user_id"]})
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", "") if user else "",
        full_name=user.get("full_name", "") if user else "",
        action="create",
        entity_type="cari_account",
        entity_id=cari.id,
        entity_name=cari.name,
        description=f"Cari hesap oluşturuldu: {cari.name} (Cari Kodu: {cari_code})",
        changes={"cari_code": cari_code},
        ip_address=current_user.get("ip_address")
    )
    
    return cari

@api_router.get("/cari-accounts/{cari_id}")
async def get_cari_account(cari_id: str, current_user: dict = Depends(get_current_user)):
    cari = await db.cari_accounts.find_one({"id": cari_id, "company_id": current_user["company_id"]}, {"_id": 0})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    is_munferit = cari.get("is_munferit", False)
    
    # Get transactions
    transactions = await db.transactions.find({"cari_id": cari_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get reservations (Münferit için yok)
    reservations = []
    if not is_munferit:
        reservations = await db.reservations.find({"cari_id": cari_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Get extra sales (Münferit için müşteriler olarak kullanılacak)
    extra_sales = await db.extra_sales.find({"cari_id": cari_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Get service purchases (as supplier) - Münferit için yok
    service_purchases = []
    if not is_munferit:
        service_purchases = await db.service_purchases.find({"supplier_id": cari_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Münferit için müşteriler listesi (extra_sales'ten)
    customers = []
    if is_munferit:
        # Extra sales'lerden müşteri bilgilerini çıkar
        customer_map = {}
        for sale in extra_sales:
            customer_name = sale.get("customer_name", "")
            if customer_name:
                if customer_name not in customer_map:
                    customer_map[customer_name] = {
                        "customer_name": customer_name,
                        "customer_contact": sale.get("customer_contact", ""),
                        "first_sale_date": sale.get("date", ""),
                        "last_sale_date": sale.get("date", ""),
                        "total_sales": 1,
                        "total_amount": sale.get("sale_price", 0),
                        "currency": sale.get("currency", "EUR")
                    }
                else:
                    customer_map[customer_name]["total_sales"] += 1
                    customer_map[customer_name]["total_amount"] += sale.get("sale_price", 0)
                    # Son satış tarihini güncelle
                    if sale.get("date", "") > customer_map[customer_name]["last_sale_date"]:
                        customer_map[customer_name]["last_sale_date"] = sale.get("date", "")
                    # İlk satış tarihini güncelle
                    if sale.get("date", "") < customer_map[customer_name]["first_sale_date"]:
                        customer_map[customer_name]["first_sale_date"] = sale.get("date", "")
        
        customers = list(customer_map.values())
        # Son satış tarihine göre sırala
        customers.sort(key=lambda x: x["last_sale_date"], reverse=True)
    
    return {
        "cari": cari,
        "transactions": transactions,
        "reservations": reservations,
        "extra_sales": extra_sales,
        "service_purchases": service_purchases,
        "customers": customers if is_munferit else []
    }

@api_router.put("/cari-accounts/{cari_id}")
async def update_cari_account(cari_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    # Münferit cari hesabını kontrol et
    cari = await db.cari_accounts.find_one({"id": cari_id, "company_id": current_user["company_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Münferit cari hesabı düzenlenemez
    if cari.get("is_munferit"):
        raise HTTPException(status_code=400, detail="Münferit cari hesabı düzenlenemez")
    
    data["company_id"] = current_user["company_id"]
    result = await db.cari_accounts.update_one({"id": cari_id, "company_id": current_user["company_id"]}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cari account not found")
    return {"message": "Cari account updated"}

@api_router.delete("/cari-accounts/{cari_id}")
async def delete_cari_account(cari_id: str, current_user: dict = Depends(get_current_user)):
    # Münferit cari hesabını kontrol et
    cari = await db.cari_accounts.find_one({"id": cari_id, "company_id": current_user["company_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Münferit cari hesabı silinemez
    if cari.get("is_munferit"):
        raise HTTPException(status_code=400, detail="Münferit cari hesabı silinemez")
    
    result = await db.cari_accounts.delete_one({"id": cari_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cari account not found")
    return {"message": "Cari account deleted"}

@api_router.post("/cari-accounts/{cari_id}/recalculate-balance")
async def recalculate_cari_balance(cari_id: str, current_user: dict = Depends(get_current_user)):
    """Cari hesap bakiyesini transaction'lardan yeniden hesapla"""
    cari = await db.cari_accounts.find_one({"id": cari_id, "company_id": current_user["company_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Tüm transaction'ları al
    transactions = await db.transactions.find({"cari_id": cari_id}, {"_id": 0}).to_list(10000)
    
    # Bakiyeleri sıfırla
    balance_eur = 0.0
    balance_usd = 0.0
    balance_try = 0.0
    
    # Transaction'ları işle
    for transaction in transactions:
        transaction_type = transaction.get("transaction_type")
        amount = transaction.get("amount", 0)
        currency = transaction.get("currency", "TRY").upper()
        
        # Rezervasyon ve extra sales için: debit (cari bize borçlu) = pozitif
        if transaction_type == "debit":
            if currency == "EUR":
                balance_eur += amount
            elif currency == "USD":
                balance_usd += amount
            else:  # TRY
                balance_try += amount
        
        # Hizmet alımı için: credit (biz cariye borçluyuz) = negatif
        elif transaction_type == "credit":
            if currency == "EUR":
                balance_eur -= amount
            elif currency == "USD":
                balance_usd -= amount
            else:  # TRY
                balance_try -= amount
        
        # Tahsilat için: payment (cari bize ödeme yaptı) = negatif (bakiye azalır)
        elif transaction_type == "payment":
            if currency == "EUR":
                balance_eur -= amount
            elif currency == "USD":
                balance_usd -= amount
            else:  # TRY
                balance_try -= amount
        
        # Ödeme için: expense (cariye ödeme yaptık) = pozitif (bakiye artar)
        elif transaction_type == "expense":
            if currency == "EUR":
                balance_eur += amount
            elif currency == "USD":
                balance_usd += amount
            else:  # TRY
                balance_try += amount
        
        # No-show bedeli için: debt (cari bize borçlu) = pozitif
        elif transaction_type == "debt":
            if currency == "EUR":
                balance_eur += amount
            elif currency == "USD":
                balance_usd += amount
            else:  # TRY
                balance_try += amount
    
    # Cari hesap bakiyesini güncelle
    await db.cari_accounts.update_one(
        {"id": cari_id},
        {"$set": {
            "balance_eur": balance_eur,
            "balance_usd": balance_usd,
            "balance_try": balance_try
        }}
    )
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="recalculate",
        entity_type="cari_account",
        entity_id=cari_id,
        entity_name=cari.get("name", "Cari Hesap"),
        description=f"Cari hesap bakiyesi yeniden hesaplandı: TRY={balance_try:.2f}, EUR={balance_eur:.2f}, USD={balance_usd:.2f}"
    )
    
    return {
        "message": "Bakiye yeniden hesaplandı",
        "balance_eur": balance_eur,
        "balance_usd": balance_usd,
        "balance_try": balance_try
    }

@api_router.post("/cari-accounts/recalculate-all-balances")
async def recalculate_all_cari_balances(current_user: dict = Depends(get_current_user)):
    """Tüm cari hesapların bakiyelerini transaction'lardan yeniden hesapla"""
    cari_accounts = await db.cari_accounts.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0, "id": 1}
    ).to_list(1000)
    
    results = []
    
    for cari in cari_accounts:
        cari_id = cari["id"]
        
        # Tüm transaction'ları al
        transactions = await db.transactions.find({"cari_id": cari_id}, {"_id": 0}).to_list(10000)
        
        # Bakiyeleri sıfırla
        balance_eur = 0.0
        balance_usd = 0.0
        balance_try = 0.0
        
        # Transaction'ları işle
        for transaction in transactions:
            transaction_type = transaction.get("transaction_type")
            amount = transaction.get("amount", 0)
            currency = transaction.get("currency", "TRY").upper()
            
            if transaction_type == "debit":
                if currency == "EUR":
                    balance_eur += amount
                elif currency == "USD":
                    balance_usd += amount
                else:
                    balance_try += amount
            elif transaction_type == "credit":
                if currency == "EUR":
                    balance_eur -= amount
                elif currency == "USD":
                    balance_usd -= amount
                else:
                    balance_try -= amount
            elif transaction_type == "payment":
                if currency == "EUR":
                    balance_eur -= amount
                elif currency == "USD":
                    balance_usd -= amount
                else:
                    balance_try -= amount
            elif transaction_type == "expense":
                if currency == "EUR":
                    balance_eur += amount
                elif currency == "USD":
                    balance_usd += amount
                else:
                    balance_try += amount
            elif transaction_type == "debt":
                if currency == "EUR":
                    balance_eur += amount
                elif currency == "USD":
                    balance_usd += amount
                else:
                    balance_try += amount
        
        # Cari hesap bakiyesini güncelle
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$set": {
                "balance_eur": balance_eur,
                "balance_usd": balance_usd,
                "balance_try": balance_try
            }}
        )
        
        results.append({
            "cari_id": cari_id,
            "balance_eur": balance_eur,
            "balance_usd": balance_usd,
            "balance_try": balance_try
        })
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="recalculate_all",
        entity_type="cari_account",
        entity_id="all",
        entity_name="Tüm Cari Hesaplar",
        description=f"{len(results)} cari hesap bakiyesi yeniden hesaplandı"
    )
    
    return {
        "message": f"{len(results)} cari hesap bakiyesi yeniden hesaplandı",
        "results": results
    }

# ==================== RESERVATIONS ====================

@api_router.get("/reservations")
async def get_reservations(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    
    # Status filtresi
    if status and status != "all":
        query["status"] = status
    elif status != "all":
        # Varsayılan: cancelled hariç göster (gerçek davranışı korumak için)
        query["status"] = {"$ne": "cancelled"}
    
    if date_from and date_to:
        if "date" in query:
            query["date"] = {"$gte": date_from, "$lte": date_to, **query["date"]} if isinstance(query["date"], dict) else {"$gte": date_from, "$lte": date_to}
        else:
            query["date"] = {"$gte": date_from, "$lte": date_to}
    elif date_from:
        if "date" in query:
            query["date"]["$gte"] = date_from
        else:
            query["date"] = {"$gte": date_from}
    elif date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return reservations

@api_router.post("/reservations")
async def create_reservation(data: ReservationCreate, current_user: dict = Depends(get_current_user)):
    # Get user info for logging
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get cari info
    cari = await db.cari_accounts.find_one({"id": data.cari_id})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Get tour type name if provided
    tour_type_name = None
    if data.tour_type_id:
        tour_type = await db.tour_types.find_one({"id": data.tour_type_id})
        if tour_type:
            tour_type_name = tour_type["name"]
    
    # Otomatik voucher kodu oluştur
    voucher_code = generate_voucher_code()
    # Benzersizlik kontrolü (hem rezervasyonlarda hem extra sales'te kontrol et)
    while await db.reservations.find_one({"voucher_code": voucher_code}) or \
          await db.extra_sales.find_one({"voucher_code": voucher_code}):
        voucher_code = generate_voucher_code()
    
    # Create reservation
    reservation = Reservation(
        company_id=current_user["company_id"],
        cari_id=data.cari_id,
        cari_name=cari["name"],
        date=data.date,
        time=data.time,
        tour_type_id=data.tour_type_id,
        tour_type_name=tour_type_name,
        customer_name=data.customer_name,
        person_count=data.person_count,
        atv_count=data.atv_count,
        pickup_location=data.pickup_location or cari.get("pickup_location"),
        pickup_maps_link=data.pickup_maps_link or cari.get("pickup_maps_link"),
        price=data.price,
        currency=data.currency,
        exchange_rate=data.exchange_rate,
        notes=data.notes,
        status="confirmed",
        voucher_code=voucher_code,
        created_by=current_user["user_id"]
    )
    
    reservation_doc = reservation.model_dump()
    reservation_doc['created_at'] = reservation_doc['created_at'].isoformat()
    reservation_doc['updated_at'] = reservation_doc['updated_at'].isoformat()
    await db.reservations.insert_one(reservation_doc)
    
    # Create activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", ""),
        full_name=user.get("full_name", ""),
        action="create",
        entity_type="reservation",
        entity_id=reservation.id,
        entity_name=f"{data.customer_name} - {data.date} {data.time}",
        description=f"Rezervasyon oluşturuldu: {data.customer_name}, {data.date} {data.time}, {data.price} {data.currency}"
    )
    
    # Create transaction (debit - borç)
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=data.cari_id,
        transaction_type="debit",
        amount=data.price,
        currency=data.currency,
        exchange_rate=data.exchange_rate,
        description=f"Rezervasyon - {data.customer_name} - {data.date} {data.time}",
        reference_id=reservation.id,
        reference_type="reservation",
        date=data.date,
        created_by=current_user["user_id"]
    )
    
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    # Update cari balance
    balance_field = f"balance_{data.currency.lower()}"
    await db.cari_accounts.update_one(
        {"id": data.cari_id},
        {"$inc": {balance_field: data.price}}
    )
    
    return reservation

@api_router.put("/reservations/{reservation_id}")
async def update_reservation(reservation_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    # Get user info for logging
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get existing reservation
    existing = await db.reservations.find_one({"id": reservation_id, "company_id": current_user["company_id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Track changes for logging
    changes = {}
    if "price" in data and data["price"] != existing.get("price"):
        changes["price"] = {"old": existing.get("price"), "new": data["price"]}
    if "currency" in data and data["currency"] != existing.get("currency"):
        changes["currency"] = {"old": existing.get("currency"), "new": data["currency"]}
    if "status" in data and data["status"] != existing.get("status"):
        changes["status"] = {"old": existing.get("status"), "new": data["status"]}
    if "customer_name" in data and data["customer_name"] != existing.get("customer_name"):
        changes["customer_name"] = {"old": existing.get("customer_name"), "new": data["customer_name"]}
    if "date" in data and data["date"] != existing.get("date"):
        changes["date"] = {"old": existing.get("date"), "new": data["date"]}
    if "time" in data and data["time"] != existing.get("time"):
        changes["time"] = {"old": existing.get("time"), "new": data["time"]}
    
    # If price changed, update transaction and balance
    if "price" in data or "currency" in data:
        old_price = existing["price"]
        old_currency = existing["currency"]
        new_price = data.get("price", old_price)
        new_currency = data.get("currency", old_currency)
        
        if old_price != new_price or old_currency != new_currency:
            # Revert old balance
            old_balance_field = f"balance_{old_currency.lower()}"
            await db.cari_accounts.update_one(
                {"id": existing["cari_id"]},
                {"$inc": {old_balance_field: -old_price}}
            )
            
            # Apply new balance
            new_balance_field = f"balance_{new_currency.lower()}"
            await db.cari_accounts.update_one(
                {"id": existing["cari_id"]},
                {"$inc": {new_balance_field: new_price}}
            )
            
            # Update transaction
            await db.transactions.update_one(
                {"reference_id": reservation_id, "reference_type": "reservation"},
                {"$set": {"amount": new_price, "currency": new_currency}}
            )
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reservations.update_one(
        {"id": reservation_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Create activity log
    entity_name = f"{existing.get('customer_name', '')} - {existing.get('date', '')} {existing.get('time', '')}"
    description = f"Rezervasyon güncellendi: {existing.get('customer_name', '')}"
    if changes:
        change_list = []
        for key, value in changes.items():
            change_list.append(f"{key}: {value.get('old')} → {value.get('new')}")
        description += f" (Değişiklikler: {', '.join(change_list)})"
    
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", ""),
        full_name=user.get("full_name", ""),
        action="update",
        entity_type="reservation",
        entity_id=reservation_id,
        entity_name=entity_name,
        description=description,
        changes=changes if changes else None,
        ip_address=current_user.get("ip_address")
    )
    
    return {"message": "Reservation updated"}

@api_router.put("/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Rezervasyonu iptal et - önce orijinal tutar geri alınır, sonra no-show bedeli eklenir"""
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "company_id": current_user["company_id"]
    })
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Rezervasyon bulunamadı")
    
    if reservation.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Rezervasyon zaten iptal edilmiş")
    
    cancellation_reason = data.get("cancellation_reason", "")
    apply_no_show = data.get("apply_no_show", False)
    no_show_amount = data.get("no_show_amount")
    no_show_currency = data.get("no_show_currency", "EUR")
    
    update_data = {
        "status": "cancelled",
        "cancellation_reason": cancellation_reason,
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "no_show_applied": apply_no_show,
        "no_show_amount": no_show_amount if apply_no_show else None,
        "no_show_currency": no_show_currency if apply_no_show else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Rezervasyon bilgileri
    cari_id = reservation.get("cari_id")
    reservation_price = reservation.get("price", 0)
    reservation_currency = reservation.get("currency", "EUR")
    
    if cari_id:
        # Cari hesabı bul
        cari = await db.cari_accounts.find_one({"id": cari_id})
        if not cari:
            raise HTTPException(status_code=404, detail="Cari hesap bulunamadı")
        
        # ÖNCE: Orijinal rezervasyon tutarını geri al (bakiye azalt)
        # Rezervasyon silinirken de aynı mantık: balance -= price
        balance_field = f"balance_{reservation_currency.lower()}"
        current_balance = cari.get(balance_field, 0) or 0
        
        # Rezervasyon tutarını geri al (cari artık bize borçlu değil)
        new_balance = current_balance - reservation_price
        
        # SONRA: No-show bedeli varsa ekle (cari tekrar bize borçlu olur)
        if apply_no_show and no_show_amount and no_show_amount > 0:
            # No-show bedeli için aynı para birimi kullanılıyorsa
            if no_show_currency.lower() == reservation_currency.lower():
                new_balance = new_balance + no_show_amount
            else:
                # Farklı para birimi ise ilgili balance field'ına ekle
                no_show_balance_field = f"balance_{no_show_currency.lower()}"
                no_show_current_balance = cari.get(no_show_balance_field, 0) or 0
                await db.cari_accounts.update_one(
                    {"id": cari_id},
                    {"$set": {no_show_balance_field: no_show_current_balance + no_show_amount}}
                )
        
        # Rezervasyon para birimi bakiyesini güncelle
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$set": {balance_field: new_balance}}
        )
        
        # Orijinal rezervasyon transaction'ını sil (rezervasyon tutarı geri alındı)
        await db.transactions.delete_one({
            "reference_id": reservation_id,
            "reference_type": "reservation"
        })
        
        # No-show bedeli transaction'ı oluştur (eğer varsa)
        if apply_no_show and no_show_amount and no_show_amount > 0:
            transaction = Transaction(
                company_id=current_user["company_id"],
                cari_id=cari_id,
                transaction_type="debt",  # Borç (cari bize borçlu)
                amount=no_show_amount,
                currency=no_show_currency,
                exchange_rate=data.get("exchange_rate", 1.0),
                reference_type="no_show_penalty",
                reference_id=reservation_id,
                description=f"No-show bedeli: {reservation.get('customer_name', 'Müşteri')} - {reservation.get('date', '')} {reservation.get('time', '')}",
                date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                created_by=current_user["user_id"]
            )
            transaction_doc = transaction.model_dump()
            transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
            await db.transactions.insert_one(transaction_doc)
            
            # Activity log (no-show ile iptal)
            await create_activity_log(
                company_id=current_user["company_id"],
                user_id=current_user["user_id"],
                username=current_user.get("username", ""),
                full_name=current_user.get("full_name", ""),
                action="cancel_reservation_no_show",
                entity_type="reservation",
                entity_id=reservation_id,
                entity_name=f"{reservation.get('customer_name', '')} - {reservation.get('date', '')}",
                description=f"Rezervasyon iptal edildi - Orijinal tutar ({reservation_price} {reservation_currency}) geri alındı, No-show bedeli ({no_show_amount} {no_show_currency}) eklendi",
                changes={
                    "reservation_amount_refunded": reservation_price,
                    "reservation_currency": reservation_currency,
                    "no_show_amount": no_show_amount,
                    "no_show_currency": no_show_currency
                }
            )
        else:
            # Activity log (sadece iptal, no-show yok)
            await create_activity_log(
                company_id=current_user["company_id"],
                user_id=current_user["user_id"],
                username=current_user.get("username", ""),
                full_name=current_user.get("full_name", ""),
                action="cancel_reservation",
                entity_type="reservation",
                entity_id=reservation_id,
                entity_name=f"{reservation.get('customer_name', '')} - {reservation.get('date', '')}",
                description=f"Rezervasyon iptal edildi - Orijinal tutar ({reservation_price} {reservation_currency}) geri alındı: {cancellation_reason}",
                changes={
                    "reservation_amount_refunded": reservation_price,
                    "reservation_currency": reservation_currency
                }
            )
    else:
        # Cari hesap yoksa sadece log
        await create_activity_log(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            username=current_user.get("username", ""),
            full_name=current_user.get("full_name", ""),
            action="cancel_reservation",
            entity_type="reservation",
            entity_id=reservation_id,
            entity_name=f"{reservation.get('customer_name', '')} - {reservation.get('date', '')}",
            description=f"Rezervasyon iptal edildi: {cancellation_reason}"
        )
    
    # Rezervasyonu güncelle
    await db.reservations.update_one(
        {"id": reservation_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Rezervasyon iptal edildi", "no_show_applied": apply_no_show}

# ==================== CARI PANEL ENDPOINTS ====================

class CariReservationCreate(BaseModel):
    """Cari tarafından rezervasyon oluşturma - sadece izin verilen alanlar"""
    model_config = ConfigDict(extra="forbid")  # Ekstra alanları reddet
    
    customer_name: str
    customer_contact: Optional[str] = None
    date: str
    time: str
    tour_id: str  # tour_type_id
    person_count: int = 1
    atv_count: int = 1
    extras: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    # Price ve cari_name alanları KABUL EDİLMEZ - server-side hesaplanacak

async def calculate_reservation_price(
    company_id: str,
    cari_id: str,
    tour_type_id: str,
    date: str,
    atv_count: int,
    person_count: int
):
    """Rezervasyon fiyatını hesapla - seasonal prices ve cari özel fiyatları kontrol et"""
    # Company kurlarını al
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    rates = company.get("currency_rates", {}) if company else {"EUR": 1.0, "USD": 1.0, "TRY": 1.0}
    
    # Tour type bilgisini al
    tour_type = await db.tour_types.find_one({"id": tour_type_id})
    if not tour_type:
        raise HTTPException(status_code=404, detail="Tour type not found")
    
    # Default price ve currency güvenli şekilde al
    default_price_raw = tour_type.get("default_price", 0)
    if default_price_raw is None or not isinstance(default_price_raw, (int, float)):
        default_price = 0.0
        logger.warning(f"Tour type default_price geçersiz veya None: tour_type_id={tour_type_id}, default_price={default_price_raw}, 0.0 kullanılıyor")
    else:
        default_price = float(default_price_raw)
    
    default_currency = tour_type.get("default_currency", "EUR")
    if not default_currency:
        default_currency = "EUR"
    
    # Seasonal prices kontrolü
    seasonal_prices = await db.seasonal_prices.find({
        "company_id": company_id,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    logger.info(f"Fiyat hesaplama başladı: company_id={company_id}, cari_id={cari_id}, tour_type_id={tour_type_id}, date={date}, atv_count={atv_count}")
    logger.info(f"Seasonal prices bulundu: {len(seasonal_prices)} adet")
    
    reservation_date = datetime.strptime(date, "%Y-%m-%d").date()
    matching_seasonal = None
    
    for sp in seasonal_prices:
        start_date = datetime.strptime(sp["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(sp["end_date"], "%Y-%m-%d").date()
        tour_type_ids = sp.get("tour_type_ids", [])
        
        logger.debug(f"Seasonal price kontrolü: start={start_date}, end={end_date}, reservation_date={reservation_date}, tour_type_ids={tour_type_ids}, tour_type_id={tour_type_id}")
        
        if start_date <= reservation_date <= end_date and tour_type_id in tour_type_ids:
            matching_seasonal = sp
            logger.info(f"Matching seasonal price bulundu: price_per_atv={sp.get('price_per_atv')}, currency={sp.get('currency')}, cari_prices keys={list(sp.get('cari_prices', {}).keys())}")
            break
    
    # Fiyat hesaplama
    price_per_atv = default_price
    currency = default_currency
    price_source = "default"  # default, seasonal, cari_specific
    
    if matching_seasonal:
        # Cari özel fiyatı var mı? (cari_prices dict'inde cari_id key olarak saklanır)
        cari_prices = matching_seasonal.get("cari_prices", {})
        
        # cari_id string olarak kontrol et
        logger.info(f"Cari prices dict kontrolü: cari_id={cari_id}, cari_prices keys={list(cari_prices.keys())}, cari_id in cari_prices={cari_id in cari_prices if cari_id else False}")
        
        if cari_id and cari_id in cari_prices:
            cari_specific_price = cari_prices[cari_id]
            logger.info(f"Cari özel fiyat bulundu: cari_id={cari_id}, price={cari_specific_price}, type={type(cari_specific_price)}")
            # None kontrolü ve sayısal değer kontrolü
            if cari_specific_price is not None and isinstance(cari_specific_price, (int, float)):
                price_per_atv = float(cari_specific_price)
                price_source = "cari_specific"
                logger.info(f"Cari özel fiyat kullanıldı: cari_id={cari_id}, price={price_per_atv}, currency={currency}")
            else:
                # Cari özel fiyat geçersiz, seasonal genel fiyatı kullan
                seasonal_price = matching_seasonal.get("price_per_atv")
                if seasonal_price is not None and isinstance(seasonal_price, (int, float)):
                    price_per_atv = float(seasonal_price)
                else:
                    price_per_atv = float(default_price) if default_price else 0.0
                price_source = "seasonal"
                logger.warning(f"Cari özel fiyat geçersiz (None veya sayı değil), seasonal fiyat kullanıldı: cari_id={cari_id}, price={price_per_atv}")
        else:
            # Seasonal genel fiyatı kullan
            seasonal_price = matching_seasonal.get("price_per_atv")
            if seasonal_price is not None and isinstance(seasonal_price, (int, float)):
                price_per_atv = float(seasonal_price)
            else:
                price_per_atv = float(default_price) if default_price else 0.0
            price_source = "seasonal"
            logger.info(f"Seasonal fiyat kullanıldı (cari özel fiyat yok): price={price_per_atv}, currency={currency}")
        
        currency = matching_seasonal.get("currency", default_currency)
    else:
        # Default fiyat kullan
        if default_price is not None and isinstance(default_price, (int, float)):
            price_per_atv = float(default_price)
        else:
            price_per_atv = 0.0
        logger.info(f"Default fiyat kullanıldı (seasonal price yok): price={price_per_atv}, currency={currency}")
    
    # Güvenlik kontrolü: price_per_atv mutlaka sayısal olmalı
    if price_per_atv is None or not isinstance(price_per_atv, (int, float)):
        logger.error(f"Fiyat hesaplama hatası: price_per_atv={price_per_atv}, default_price={default_price}, tour_type_id={tour_type_id}")
        price_per_atv = 0.0
        price_source = "error_fallback"
    
    # Toplam fiyat = ATV sayısı * ATV başına fiyat
    total_price = float(price_per_atv) * int(atv_count)
    
    logger.info(f"Fiyat hesaplandı: cari_id={cari_id}, tour_type_id={tour_type_id}, date={date}, "
                f"atv_count={atv_count}, price_per_atv={price_per_atv}, total_price={total_price}, "
                f"currency={currency}, source={price_source}")
    
    return total_price, currency

@api_router.post("/cari/reservations")
async def cari_create_reservation(
    data: CariReservationCreate,
    current_cari: dict = Depends(get_current_cari)
):
    """Cari tarafından rezervasyon oluştur - status pending_approval"""
    # Cari bilgisini al
    cari = await db.caris.find_one({"id": current_cari["cari_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Cari account bilgisini al (cari_code ile)
    cari_code = cari.get("cari_code")
    if not cari_code:
        logger.error(f"Cari panel hesabında cari_code yok: cari_id={current_cari['cari_id']}")
        raise HTTPException(status_code=400, detail="Cari code not found in cari panel account")
    
    cari_account = await db.cari_accounts.find_one({
        "company_id": current_cari["company_id"],
        "cari_code": cari_code
    })
    if not cari_account:
        logger.error(f"CariAccount bulunamadı: company_id={current_cari['company_id']}, cari_code={cari_code}")
        # Alternatif: display_name ile de dene
        cari_account = await db.cari_accounts.find_one({
            "company_id": current_cari["company_id"],
            "name": cari.get("display_name")
        })
        if cari_account:
            # CariAccount'a cari_code ekle
            await db.cari_accounts.update_one(
                {"id": cari_account["id"]},
                {"$set": {"cari_code": cari_code}}
            )
            logger.info(f"CariAccount'a cari_code eklendi: {cari_account.get('name')} -> {cari_code}")
        else:
            raise HTTPException(status_code=404, detail=f"Cari account not found for cari_code: {cari_code}")
    
    # Tour type bilgisini al
    tour_type_id = getattr(data, 'tour_id', None)
    if not tour_type_id:
        raise HTTPException(status_code=400, detail="Tour type ID is required")
    
    tour_type = await db.tour_types.find_one({"id": tour_type_id})
    if not tour_type:
        raise HTTPException(status_code=404, detail="Tour type not found")
    
    # Fiyatı server-side hesapla
    atv_count = getattr(data, 'atv_count', 1)
    person_count = getattr(data, 'person_count', 1)
    price, currency = await calculate_reservation_price(
        company_id=current_cari["company_id"],
        cari_id=cari_account["id"],
        tour_type_id=tour_type_id,
        date=getattr(data, 'date'),
        atv_count=atv_count,
        person_count=person_count
    )
    
    # Exchange rate hesapla
    company = await db.companies.find_one({"id": current_cari["company_id"]}, {"_id": 0})
    rates = company.get("currency_rates", {}) if company else {"EUR": 1.0, "USD": 1.0, "TRY": 1.0}
    exchange_rate = rates.get(currency, 1.0) / rates.get("TRY", 1.0)
    
    # B2B voucher kodu oluştur (benzersiz olmalı)
    voucher_code = generate_b2b_voucher_code()
    max_attempts = 10
    attempts = 0
    while await db.reservations.find_one({"voucher_code": voucher_code, "company_id": current_cari["company_id"]}) and attempts < max_attempts:
        voucher_code = generate_b2b_voucher_code()
        attempts += 1
    
    # Rezervasyon oluştur
    reservation = Reservation(
        company_id=current_cari["company_id"],
        cari_id=cari_account["id"],
        cari_name=cari.get("display_name"),
        date=getattr(data, 'date'),
        time=getattr(data, 'time'),
        tour_type_id=tour_type_id,
        tour_type_name=tour_type.get("name"),
        customer_name=getattr(data, 'customer_name'),
        person_count=person_count,
        atv_count=atv_count,
        customer_contact=getattr(data, 'customer_contact', None),
        price=price,
        currency=currency,
        exchange_rate=exchange_rate,
        notes=getattr(data, 'notes', None),
        voucher_code=voucher_code,  # B2B voucher kodu
        status="pending_approval",
        reservation_source="cari",
        created_by_cari=current_cari["cari_id"],
        cari_code_snapshot=cari.get("cari_code"),
        created_by=current_cari["cari_id"]  # created_by field için
    )
    
    reservation_doc = reservation.model_dump()
    reservation_doc['created_at'] = reservation_doc['created_at'].isoformat()
    reservation_doc['updated_at'] = reservation_doc['updated_at'].isoformat()
    await db.reservations.insert_one(reservation_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_cari["company_id"],
        user_id=current_cari["cari_id"],
        username=current_cari.get("cari_code", ""),
        full_name=current_cari.get("display_name", ""),
        action="cari_create_reservation",
        entity_type="reservation",
        entity_id=reservation.id,
        entity_name=f"{getattr(data, 'customer_name', '')} - {getattr(data, 'date', '')} {getattr(data, 'time', '')}",
        description=f"Cari rezervasyon oluşturuldu: {getattr(data, 'customer_name', '')}, {getattr(data, 'date', '')} {getattr(data, 'time', '')}, {price} {currency} (Pending Approval)",
        ip_address=current_cari.get("ip_address")
    )
    
    # Bildirim oluştur - Tüm admin kullanıcılara
    admin_users = await db.users.find({
        "company_id": current_cari["company_id"],
        "is_admin": True,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    for admin_user in admin_users:
        notification = Notification(
            company_id=current_cari["company_id"],
            user_id=admin_user["id"],
            type="pending_reservation",
            title="Yeni Rezervasyon Talebi",
            message=f"{cari.get('display_name', '')} tarafından yeni bir rezervasyon talebi oluşturuldu: {getattr(data, 'customer_name', '')} - {getattr(data, 'date', '')} {getattr(data, 'time', '')}",
            entity_type="reservation",
            entity_id=reservation.id
        )
        notification_doc = notification.model_dump()
        notification_doc['created_at'] = notification_doc['created_at'].isoformat()
        await db.notifications.insert_one(notification_doc)
    
    return {
        "id": reservation.id,
        "status": "pending_approval",
        "price": price,
        "currency": currency,
        "message": "Reservation created and pending approval"
    }

@api_router.get("/cari/reservations")
async def cari_get_reservations(
    current_cari: dict = Depends(get_current_cari),
    page: int = 1,
    limit: int = 50
):
    """Cari'nin oluşturduğu rezervasyonları listele"""
    cari = await db.caris.find_one({"id": current_cari["cari_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Sadece bu cari tarafından oluşturulan rezervasyonları getir
    query = {
        "company_id": current_cari["company_id"],
        "created_by_cari": current_cari["cari_id"]
    }
    
    skip = (page - 1) * limit
    reservations = await db.reservations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reservations.count_documents(query)
    
    # Güvenlik: Hassas bilgileri kaldır
    safe_reservations = []
    for r in reservations:
        safe_reservations.append({
            "id": r.get("id"),
            "customer_name": r.get("customer_name"),
            "date": r.get("date"),
            "time": r.get("time"),
            "tour_type_name": r.get("tour_type_name"),
            "price": r.get("price"),
            "currency": r.get("currency"),
            "status": r.get("status"),
            "notes": r.get("notes"),
            "pickup_time": r.get("pickup_time"),  # Pick-up saati
            "created_at": r.get("created_at"),
            "approved_at": r.get("approved_at")
        })
    
    return {
        "reservations": safe_reservations,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/cari/transactions")
async def cari_get_transactions(
    current_cari: dict = Depends(get_current_cari),
    page: int = 1,
    limit: int = 50
):
    """Cari'nin ekstresini getir (readonly)"""
    cari = await db.caris.find_one({"id": current_cari["cari_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Cari account bilgisini al (cari_code ile)
    cari_account = await db.cari_accounts.find_one({
        "company_id": current_cari["company_id"],
        "cari_code": cari.get("cari_code")
    })
    if not cari_account:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Transaction'ları getir
    query = {
        "company_id": current_cari["company_id"],
        "cari_id": cari_account["id"]
    }
    
    skip = (page - 1) * limit
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.transactions.count_documents(query)
    
    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "limit": limit,
        "balance_eur": cari_account.get("balance_eur", 0),
        "balance_usd": cari_account.get("balance_usd", 0),
        "balance_try": cari_account.get("balance_try", 0)
    }

# ==================== ADMIN CARI RESERVATION ENDPOINTS ====================

@api_router.get("/reservations/pending")
async def get_pending_cari_reservations(
    current_user: dict = Depends(get_current_user)
):
    """Pending approval cari rezervasyonlarını listele"""
    query = {
        "company_id": current_user["company_id"],
        "status": "pending_approval",
        "reservation_source": "cari"
    }
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Cari detaylarını ekle ve created_at'i formatla
    enriched_reservations = []
    for r in reservations:
        cari_code = r.get("cari_code_snapshot")
        # created_at'i ISO format string olarak döndür (eğer datetime objesi ise)
        created_at = r.get("created_at")
        if created_at and isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        elif created_at and isinstance(created_at, str):
            # Zaten string ise olduğu gibi bırak
            pass
        else:
            created_at = None
        
        enriched_reservations.append({
            **r,
            "cari_code_snapshot": cari_code,
            "display_name": r.get("cari_name"),
            "created_at": created_at,  # ISO format string
            "voucher_code": r.get("voucher_code")  # Voucher kodu dahil
        })
    
    return enriched_reservations

@api_router.post("/reservations/{reservation_id}/approve")
async def approve_cari_reservation(
    reservation_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Cari rezervasyonunu onayla - pick-up saati zorunlu"""
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "company_id": current_user["company_id"],
        "status": "pending_approval",
        "reservation_source": "cari"
    })
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Pending reservation not found")
    
    # Pick-up saati zorunlu
    pickup_time = data.get("pickup_time")
    if not pickup_time or not pickup_time.strip():
        raise HTTPException(status_code=400, detail="Pick-up saati zorunludur")
    
    # Rezervasyonu onayla
    update_data = {
        "status": "approved",
        "approved_by": current_user["user_id"],
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Pick-up saati varsa ekle
    if pickup_time:
        update_data["pickup_time"] = pickup_time.strip()
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": update_data}
    )
    
    # Transaction oluştur (debit - borç)
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=reservation["cari_id"],
        transaction_type="debit",
        amount=reservation["price"],
        currency=reservation["currency"],
        exchange_rate=reservation.get("exchange_rate", 1.0),
        description=f"Rezervasyon - {reservation.get('customer_name', '')} - {reservation.get('date', '')} {reservation.get('time', '')}",
        reference_id=reservation_id,
        reference_type="reservation",
        date=reservation["date"],
        created_by=current_user["user_id"]
    )
    
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    # Cari bakiyesini güncelle
    balance_field = f"balance_{reservation['currency'].lower()}"
    await db.cari_accounts.update_one(
        {"id": reservation["cari_id"]},
        {"$inc": {balance_field: reservation["price"]}}
    )
    
    # Activity log
    user = await db.users.find_one({"id": current_user["user_id"]})
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", "") if user else "",
        full_name=user.get("full_name", "") if user else "",
        action="admin_approve",
        entity_type="reservation",
        entity_id=reservation_id,
        entity_name=f"{reservation.get('customer_name', '')} - {reservation.get('date', '')}",
        description=f"Cari rezervasyon onaylandı: {reservation.get('customer_name', '')}, {reservation.get('price', 0)} {reservation.get('currency', 'EUR')}",
        ip_address=current_user.get("ip_address")
    )
    
    # Cari'ye bildirim gönder (eğer created_by_cari varsa)
    if reservation.get("created_by_cari"):
        cari_panel = await db.caris.find_one({"id": reservation.get("created_by_cari")})
        if cari_panel:
            # Pick-up saati bilgisini mesaja ekle
            pickup_time_msg = f"Pick-up saati: {pickup_time}" if pickup_time else ""
            message = f"Rezervasyonunuz onaylandı: {reservation.get('customer_name', '')} - {reservation.get('date', '')} {reservation.get('time', '')}"
            if pickup_time_msg:
                message += f" | {pickup_time_msg}"
            
            # Cari panel bildirimi için notification oluştur
            notification = Notification(
                company_id=current_user["company_id"],
                user_id=None,  # Cari panel için user_id yok
                type="reservation_approved",
                title="Rezervasyon Onaylandı",
                message=message,
                entity_type="reservation",
                entity_id=reservation_id
            )
            notification_doc = notification.model_dump()
            notification_doc['created_at'] = notification_doc['created_at'].isoformat()
            await db.notifications.insert_one(notification_doc)
    
    return {"message": "Reservation approved successfully"}

@api_router.post("/reservations/{reservation_id}/reject")
async def reject_cari_reservation(
    reservation_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Cari rezervasyonunu reddet"""
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "company_id": current_user["company_id"],
        "status": "pending_approval",
        "reservation_source": "cari"
    })
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Pending reservation not found")
    
    reason = data.get("reason", "")
    
    # Rezervasyonu reddet
    await db.reservations.update_one(
        {"id": reservation_id},
        {
            "$set": {
                "status": "rejected",
                "notes": f"{reservation.get('notes', '')}\n[REJECTED] {reason}".strip(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Activity log
    user = await db.users.find_one({"id": current_user["user_id"]})
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", "") if user else "",
        full_name=user.get("full_name", "") if user else "",
        action="admin_reject",
        entity_type="reservation",
        entity_id=reservation_id,
        entity_name=f"{reservation.get('customer_name', '')} - {reservation.get('date', '')}",
        description=f"Cari rezervasyon reddedildi: {reservation.get('customer_name', '')} - Sebep: {reason}",
        changes={"reason": reason},
        ip_address=current_user.get("ip_address")
    )
    
    return {"message": "Reservation rejected"}

@api_router.post("/reservations/{reservation_id}/edit-and-approve")
async def edit_and_approve_cari_reservation(
    reservation_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Cari rezervasyonunu düzenle ve onayla"""
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "company_id": current_user["company_id"],
        "status": "pending_approval",
        "reservation_source": "cari"
    })
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Pending reservation not found")
    
    # İzin verilen alanlar (price ve cari alanları değiştirilemez)
    allowed_fields = [
        "customer_name", "date", "time", "tour_type_id", "person_count",
        "atv_count", "pickup_location", "pickup_maps_link", "notes"
    ]
    
    update_data = {}
    changes = {}
    
    for field in allowed_fields:
        if field in data:
            old_value = reservation.get(field)
            new_value = data[field]
            if old_value != new_value:
                update_data[field] = new_value
                changes[field] = {"old": old_value, "new": new_value}
    
    # Tour type name güncelle
    if "tour_type_id" in update_data:
        tour_type = await db.tour_types.find_one({"id": update_data["tour_type_id"]})
        if tour_type:
            update_data["tour_type_name"] = tour_type.get("name")
    
    # Rezervasyonu güncelle ve onayla
    update_data.update({
        "status": "approved",
        "approved_by": current_user["user_id"],
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": update_data}
    )
    
    # Transaction oluştur (debit - borç)
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=reservation["cari_id"],
        transaction_type="debit",
        amount=reservation["price"],  # Orijinal fiyat (değiştirilemez)
        currency=reservation["currency"],
        exchange_rate=reservation.get("exchange_rate", 1.0),
        description=f"Rezervasyon - {update_data.get('customer_name', reservation.get('customer_name', ''))} - {update_data.get('date', reservation.get('date', ''))} {update_data.get('time', reservation.get('time', ''))}",
        reference_id=reservation_id,
        reference_type="reservation",
        date=update_data.get("date", reservation["date"]),
        created_by=current_user["user_id"]
    )
    
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    # Cari bakiyesini güncelle
    balance_field = f"balance_{reservation['currency'].lower()}"
    await db.cari_accounts.update_one(
        {"id": reservation["cari_id"]},
        {"$inc": {balance_field: reservation["price"]}}
    )
    
    # Activity log
    user = await db.users.find_one({"id": current_user["user_id"]})
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", "") if user else "",
        full_name=user.get("full_name", "") if user else "",
        action="admin_edit_and_approve",
        entity_type="reservation",
        entity_id=reservation_id,
        entity_name=f"{update_data.get('customer_name', reservation.get('customer_name', ''))} - {update_data.get('date', reservation.get('date', ''))}",
        description=f"Cari rezervasyon düzenlendi ve onaylandı: {reservation.get('customer_name', '')}",
        changes=changes if changes else None,
        ip_address=current_user.get("ip_address")
    )
    
    return {"message": "Reservation edited and approved successfully"}

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    # Get user info for logging
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reservation = await db.reservations.find_one({"id": reservation_id, "company_id": current_user["company_id"]})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Create activity log before deletion
    entity_name = f"{reservation.get('customer_name', '')} - {reservation.get('date', '')} {reservation.get('time', '')}"
    description = f"Rezervasyon silindi: {reservation.get('customer_name', '')}, {reservation.get('date', '')} {reservation.get('time', '')}, {reservation.get('price', 0)} {reservation.get('currency', 'EUR')}"
    
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", ""),
        full_name=user.get("full_name", ""),
        action="delete",
        entity_type="reservation",
        entity_id=reservation_id,
        entity_name=entity_name,
        description=description
    )
    
    # Revert balance
    balance_field = f"balance_{reservation['currency'].lower()}"
    await db.cari_accounts.update_one(
        {"id": reservation["cari_id"]},
        {"$inc": {balance_field: -reservation["price"]}}
    )
    
    # Delete transaction
    await db.transactions.delete_one({"reference_id": reservation_id, "reference_type": "reservation"})
    
    # Delete reservation
    await db.reservations.delete_one({"id": reservation_id})
    
    return {"message": "Reservation deleted"}

@api_router.post("/reservations/{reservation_id}/voucher")
async def generate_reservation_voucher(reservation_id: str, current_user: dict = Depends(get_current_user)):
    """Rezervasyon için voucher oluştur veya mevcut voucher'ı getir"""
    try:
        reservation = await db.reservations.find_one({"id": reservation_id, "company_id": current_user["company_id"]}, {"_id": 0})
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Eğer voucher_code yoksa oluştur
        if not reservation.get("voucher_code"):
            voucher_code = generate_voucher_code()
            # Aynı kodun başka bir rezervasyonda olup olmadığını kontrol et
            max_attempts = 10
            attempts = 0
            while await db.reservations.find_one({"voucher_code": voucher_code, "company_id": current_user["company_id"]}) and attempts < max_attempts:
                voucher_code = generate_voucher_code()
                attempts += 1
            
            await db.reservations.update_one(
                {"id": reservation_id, "company_id": current_user["company_id"]},
                {"$set": {"voucher_code": voucher_code}}
            )
            reservation["voucher_code"] = voucher_code
        
        # Tour type name'i ekle (eğer yoksa)
        if reservation.get("tour_type_id") and not reservation.get("tour_type_name"):
            tour_type = await db.tour_types.find_one({"id": reservation["tour_type_id"]}, {"_id": 0})
            if tour_type:
                reservation["tour_type_name"] = tour_type.get("name", "Bilinmeyen")
        
        # Cari name'i ekle (eğer yoksa)
        if reservation.get("cari_id") and not reservation.get("cari_name"):
            cari = await db.cari_accounts.find_one({"id": reservation["cari_id"]}, {"_id": 0})
            if cari:
                reservation["cari_name"] = cari.get("name", "Bilinmeyen")
        
        # Company bilgilerini getir
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        if not company:
            # Company yoksa minimal bilgi oluştur
            company = {
                "id": current_user["company_id"],
                "company_name": "Firma Adı",
                "phone": "",
                "address": "",
                "email": "",
                "website": ""
            }
        
        # Eksik alanları doldur
        reservation.setdefault("date", "")
        reservation.setdefault("time", "")
        reservation.setdefault("customer_name", "Belirtilmedi / Not Provided")
        reservation.setdefault("cari_name", "Belirtilmedi / Not Provided")
        reservation.setdefault("tour_type_name", "Belirtilmedi / Not Provided")
        reservation.setdefault("atv_count", 0)
        reservation.setdefault("price", 0)
        reservation.setdefault("currency", "EUR")
        reservation.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        
        return {
            "reservation": reservation,
            "company": company
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Voucher oluşturulurken hata oluştu: {str(e)}")

# ==================== TRANSACTIONS (PAYMENTS) ====================

@api_router.post("/transactions")
async def create_transaction(data: dict, current_user: dict = Depends(get_current_user)):
    # Get user info for logging
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get cari info for logging
    cari = await db.cari_accounts.find_one({"id": data.get("cari_id")})
    cari_name = cari.get("name", "") if cari else ""
    
    # Get payment type name and code if provided
    payment_type_name = None
    payment_code = None
    if data.get("payment_type_id"):
        payment_type = await db.payment_types.find_one({"id": data.get("payment_type_id")})
        if payment_type:
            payment_type_name = payment_type["name"]
            payment_code = payment_type.get("code")
    
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=data.get("cari_id"),
        transaction_type=data.get("transaction_type"),
        amount=data.get("amount"),
        currency=data.get("currency"),
        exchange_rate=data.get("exchange_rate", 1.0),
        payment_type_id=data.get("payment_type_id"),
        payment_type_name=payment_type_name,
        description=data.get("description"),
        reference_id=data.get("reference_id"),
        reference_type=data.get("reference_type"),
        date=data.get("date"),
        time=data.get("time"),  # Saat bilgisini ekle
        created_by=current_user["user_id"]
    )
    
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    
    # Payment transaction'ları için ödeme tipine göre işlemler
    if data.get("transaction_type") == "payment" and payment_code:
        transaction_amount = data.get("amount", 0)
        transaction_currency = data.get("currency", "TRY")
        transaction_date_str = data.get("date")
        
        # 1. NAKİT ÖDEMELERİ
        if payment_code == "cash":
            # payment_method ayarla
            transaction_doc['payment_method'] = "cash"
            
            # Cash account oluştur veya güncelle (her para birimi için ayrı)
            cash_account = await db.cash_accounts.find_one({
                "company_id": current_user["company_id"],
                "account_type": "cash",
                "currency": transaction_currency,
                "is_active": True
            }, {"_id": 0})
            
            if not cash_account:
                # Yeni cash account oluştur
                import uuid
                cash_account_id = str(uuid.uuid4())
                cash_account_doc = {
                    "id": cash_account_id,
                    "company_id": current_user["company_id"],
                    "account_type": "cash",
                    "account_name": f"Nakit - {transaction_currency}",
                    "currency": transaction_currency,
                    "balance": transaction_amount,
                    "is_active": True,
                    "order": 0
                }
                await db.cash_accounts.insert_one(cash_account_doc)
                transaction_doc['cash_account_id'] = cash_account_id
                logger.info(f"Yeni cash account oluşturuldu: {cash_account_id} - {transaction_currency}")
            else:
                # Mevcut cash account'u güncelle
                cash_account_id = cash_account["id"]
                await db.cash_accounts.update_one(
                    {"id": cash_account_id},
                    {"$inc": {"balance": transaction_amount}}
                )
                transaction_doc['cash_account_id'] = cash_account_id
                logger.info(f"Cash account güncellendi: {cash_account_id} - +{transaction_amount} {transaction_currency}")
            
            # Nakit ödemeleri için net_amount = amount (komisyon yok)
            transaction_doc['net_amount'] = transaction_amount
            transaction_doc['is_settled'] = True  # Nakit ödemeleri hemen kullanılabilir
        
        # 2. HAVALE ÖDEMELERİ
        elif payment_code == "bank_transfer":
            # payment_method ayarla
            transaction_doc['payment_method'] = "bank_transfer"
            
            bank_account_id = data.get('bank_account_id')
            if bank_account_id:
                # Banka hesabını al
                bank_account = await db.bank_accounts.find_one({"id": bank_account_id}, {"_id": 0})
                if bank_account:
                    transaction_doc['bank_account_id'] = bank_account_id
                    
                    # Cash account oluştur veya güncelle (bank_account_id ve currency'ye göre)
                    cash_account = await db.cash_accounts.find_one({
                        "company_id": current_user["company_id"],
                        "account_type": "bank_account",
                        "bank_account_id": bank_account_id,
                        "currency": transaction_currency,
                        "is_active": True
                    }, {"_id": 0})
                    
                    if not cash_account:
                        # Yeni cash account oluştur
                        import uuid
                        cash_account_id = str(uuid.uuid4())
                        cash_account_doc = {
                            "id": cash_account_id,
                            "company_id": current_user["company_id"],
                            "account_type": "bank_account",
                            "bank_account_id": bank_account_id,
                            "account_name": bank_account.get("account_name", "Banka Hesabı"),
                            "currency": transaction_currency,
                            "balance": transaction_amount,
                            "is_active": True,
                            "order": 0
                        }
                        await db.cash_accounts.insert_one(cash_account_doc)
                        transaction_doc['cash_account_id'] = cash_account_id
                        logger.info(f"Yeni bank account cash account oluşturuldu: {cash_account_id} - {transaction_currency}")
                    else:
                        # Mevcut cash account'u güncelle
                        cash_account_id = cash_account["id"]
                        await db.cash_accounts.update_one(
                            {"id": cash_account_id},
                            {"$inc": {"balance": transaction_amount}}
                        )
                        transaction_doc['cash_account_id'] = cash_account_id
                        logger.info(f"Bank account cash account güncellendi: {cash_account_id} - +{transaction_amount} {transaction_currency}")
            
            # Havale ödemeleri için net_amount = amount (komisyon yok)
            transaction_doc['net_amount'] = transaction_amount
            transaction_doc['is_settled'] = True  # Havale ödemeleri hemen kullanılabilir
        
        # 3. KREDİ KARTI ÖDEMELERİ
        elif payment_code == "credit_card":
            # payment_method ayarla
            transaction_doc['payment_method'] = "credit_card"
            
            bank_account_id = data.get('bank_account_id')
            if bank_account_id:
                # Banka hesabını al
                bank_account = await db.bank_accounts.find_one({"id": bank_account_id}, {"_id": 0})
                if bank_account:
                    transaction_doc['bank_account_id'] = bank_account_id
                    
                    # Banka hesabının tanımlamalarından değerleri al (dinamik olarak)
                    valor_days = bank_account.get("valor_days")  # Gün cinsinden
                    commission_rate = bank_account.get("commission_rate")  # Yüzde cinsinden
                    
                    # Komisyon hesapla (bank_account tanımlamalarından dinamik)
                    if commission_rate is not None and commission_rate > 0:
                        commission_amount = (transaction_amount * commission_rate) / 100
                        net_amount = transaction_amount - commission_amount
                        transaction_doc['commission_amount'] = round(commission_amount, 2)
                        transaction_doc['net_amount'] = round(net_amount, 2)
                        logger.info(f"Komisyon hesaplandı (bank_account: {bank_account_id}): {transaction_amount} * {commission_rate}% = {transaction_doc['commission_amount']}, Net: {transaction_doc['net_amount']}")
                    else:
                        # Komisyon yoksa, net_amount = amount
                        transaction_doc['commission_amount'] = 0.0
                        transaction_doc['net_amount'] = transaction_amount
                        logger.info(f"Komisyon yok (bank_account: {bank_account_id}), net_amount = amount: {transaction_amount}")
                    
                    # Valör tarihi hesapla (bank_account tanımlamalarından dinamik)
                    if valor_days is not None and valor_days > 0:
                        from datetime import timedelta
                        transaction_date = datetime.strptime(transaction_date_str, "%Y-%m-%d")
                        valor_date = transaction_date + timedelta(days=valor_days)
                        transaction_doc['valor_date'] = valor_date.strftime("%Y-%m-%d")
                        transaction_doc['is_settled'] = False  # Valör süresi dolana kadar vadedeki tutarda
                        logger.info(f"Valör tarihi hesaplandı (bank_account: {bank_account_id}): {transaction_date_str} + {valor_days} gün = {transaction_doc['valor_date']}")
                    elif commission_rate is not None and commission_rate > 0:
                        # Valör süresi yoksa ama komisyon varsa, 1 gün sonra kullanılabilir
                        from datetime import timedelta
                        transaction_date = datetime.strptime(transaction_date_str, "%Y-%m-%d")
                        valor_date = transaction_date + timedelta(days=1)
                        transaction_doc['valor_date'] = valor_date.strftime("%Y-%m-%d")
                        transaction_doc['is_settled'] = False
                        logger.info(f"Valör tarihi komisyon nedeniyle 1 gün olarak ayarlandı (bank_account: {bank_account_id}): {transaction_doc['valor_date']}")
                    else:
                        # Ne valör süresi ne de komisyon yoksa, hemen kullanılabilir
                        transaction_doc['valor_date'] = None
                        transaction_doc['is_settled'] = True
                        logger.info(f"Valör süresi ve komisyon yok (bank_account: {bank_account_id}), hemen kullanılabilir")
        
        # 4. ÇEK/SENET ÖDEMELERİ
        elif payment_code == "check_promissory":
            # payment_method ayarla
            transaction_doc['payment_method'] = "check_promissory"
            
            due_date = data.get('due_date')
            if due_date:
                transaction_doc['due_date'] = due_date
                transaction_doc['is_settled'] = False  # Vade tarihi gelene kadar vadedeki tutarda
                
                # Check/Promissory kaydı oluştur
                import uuid
                check_id = str(uuid.uuid4())
                check_doc = {
                    "id": check_id,
                    "company_id": current_user["company_id"],
                    "transaction_id": transaction.id,
                    "cari_id": data.get("cari_id"),
                    "amount": transaction_amount,
                    "currency": transaction_currency,
                    "due_date": due_date,
                    "check_number": data.get("check_number", ""),
                    "bank_name": data.get("bank_name", ""),
                    "is_collected": False,
                    "collected_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.check_promissories.insert_one(check_doc)
                logger.info(f"Check/Promissory kaydı oluşturuldu: {check_id} - Vade: {due_date}")
            
            # Çek/Senet ödemeleri için net_amount = amount (komisyon yok)
            transaction_doc['net_amount'] = transaction_amount
        
        # 5. CARİYE AKTAR ve MAHSUP - payment_method ayarla ama cash account'a ekleme
        elif payment_code == "transfer_to_cari":
            transaction_doc['payment_method'] = "transfer_to_cari"
            transaction_doc['net_amount'] = transaction_amount
            # Cash account'a eklenmez, sadece cari hesaba aktarılır
        elif payment_code == "write_off":
            transaction_doc['payment_method'] = "write_off"
            transaction_doc['net_amount'] = transaction_amount
            # Cash account'a eklenmez
    
    # payment_method yoksa payment_code'dan ayarla
    if transaction_doc.get('payment_method') is None and payment_code:
        transaction_doc['payment_method'] = payment_code
    
    await db.transactions.insert_one(transaction_doc)
    
    # Create activity log
    transaction_type_label = "Tahsilat" if data.get("transaction_type") == "credit" else "Ödeme"
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", ""),
        full_name=user.get("full_name", ""),
        action="payment",
        entity_type="transaction",
        entity_id=transaction.id,
        entity_name=cari_name,
        description=f"{transaction_type_label}: {cari_name}, {data.get('amount')} {data.get('currency')}, {data.get('date')}",
        current_user=current_user
    )
    
    # Update balance
    balance_field = f"balance_{data.get('currency', 'TRY').lower()}"
    transaction_amount = data.get("amount", 0)
    cari_id = data.get("cari_id")
    if data.get("transaction_type") == "payment":  # Tahsilat - balance azalır
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$inc": {balance_field: -transaction_amount}}
        )
    elif data.get("transaction_type") == "credit":  # Alacak - balance azalır
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$inc": {balance_field: -transaction_amount}}
        )
    else:  # debit, refund - balance artar
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$inc": {balance_field: transaction_amount}}
        )
    
    return transaction

# ==================== EXTRA SALES ====================

@api_router.get("/extra-sales")
async def get_extra_sales(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    
    # Status filtresi
    if status and status != "all":
        query["status"] = status
    elif status != "all":
        # Varsayılan: cancelled hariç göster
        query["status"] = {"$ne": "cancelled"}
    
    if date_from and date_to:
        if "date" in query:
            query["date"] = {"$gte": date_from, "$lte": date_to, **query["date"]} if isinstance(query["date"], dict) else {"$gte": date_from, "$lte": date_to}
        else:
            query["date"] = {"$gte": date_from, "$lte": date_to}
    elif date_from:
        if "date" in query:
            query["date"]["$gte"] = date_from
        else:
            query["date"] = {"$gte": date_from}
    elif date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    extra_sales = await db.extra_sales.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return extra_sales

@api_router.post("/extra-sales")
async def create_extra_sale(data: dict, current_user: dict = Depends(get_current_user)):
    # Get user info for logging
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get cari name
    cari = await db.cari_accounts.find_one({"id": data["cari_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    data["cari_name"] = cari["name"]
    is_munferit = cari.get("is_munferit", False)
    
    # Get supplier name if provided
    if data.get("supplier_id"):
        supplier = await db.cari_accounts.find_one({"id": data["supplier_id"]})
        if supplier:
            data["supplier_name"] = supplier["name"]
    
    extra_sale = ExtraSale(company_id=current_user["company_id"], created_by=current_user["user_id"], **data)
    extra_sale_doc = extra_sale.model_dump()
    extra_sale_doc['created_at'] = extra_sale_doc['created_at'].isoformat()
    await db.extra_sales.insert_one(extra_sale_doc)
    
    # Create activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", ""),
        full_name=user.get("full_name", ""),
        action="create",
        entity_type="extra_sale",
        entity_id=extra_sale.id,
        entity_name=f"{data.get('customer_name', '')} - {data.get('product_name', '')}",
        description=f"Açık satış oluşturuldu: {data.get('product_name', '')}, {data.get('customer_name', '')}, {data.get('sale_price', 0)} {data.get('currency', 'EUR')}",
        current_user=current_user
    )
    
    # Münferit cari için gelir transaction'ı oluştur (tahsilat mantığı)
    if is_munferit and data.get("payment_type_id"):
        payment_type = await db.payment_types.find_one({"id": data.get("payment_type_id")}, {"_id": 0})
        if payment_type:
            payment_code = payment_type.get("code")
            
            # Payment transaction oluştur (pozitif amount ile - gelir)
            transaction_doc = {
                "id": str(uuid.uuid4()),
                "company_id": current_user["company_id"],
                "cari_id": data["cari_id"],
                "transaction_type": "payment",
                "amount": data.get("sale_price", 0),  # Pozitif tutar (gelir)
                "net_amount": data.get("sale_price", 0),
                "currency": data.get("currency", "EUR"),
                "exchange_rate": data.get("exchange_rate", 1.0),
                "payment_type_id": data.get("payment_type_id"),
                "payment_type_name": payment_type.get("name"),
                "payment_method": payment_code,
                "description": f"Açık Satış - {data.get('product_name', '')} - {data.get('customer_name', '')}",
                "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                "time": data.get("time", datetime.now(timezone.utc).strftime("%H:%M")),
                "reference_id": extra_sale.id,
                "reference_type": "extra_sale",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user["user_id"]
            }
            
            # Cash account seç (payment_type'a göre)
            cash_account = None
            if payment_code == "cash":
                # Nakit kasası bul
                cash_account = await db.cash_accounts.find_one({
                    "company_id": current_user["company_id"],
                    "account_type": "cash",
                    "currency": data.get("currency", "EUR"),
                    "is_active": True
                }, {"_id": 0})
            elif payment_code == "bank_transfer":
                # Banka hesabı cash_account'u bul
                cash_account = await db.cash_accounts.find_one({
                    "company_id": current_user["company_id"],
                    "account_type": "bank_account",
                    "currency": data.get("currency", "EUR"),
                    "is_active": True
                }, {"_id": 0})
            
            if cash_account:
                transaction_doc["cash_account_id"] = cash_account["id"]
                
                # Banka hesabı için bank_account_id de ekle
                if payment_code == "bank_transfer":
                    bank_account = await db.bank_accounts.find_one({
                        "company_id": current_user["company_id"],
                        "account_type": "bank_account",
                        "currency": data.get("currency", "EUR"),
                        "is_active": True
                    }, {"_id": 0})
                    if bank_account:
                        transaction_doc["bank_account_id"] = bank_account["id"]
                
                await db.transactions.insert_one(transaction_doc)
                
                # Cash account bakiyesini güncelle (gelir = bakiye artar)
                await db.cash_accounts.update_one(
                    {"id": cash_account["id"]},
                    {"$inc": {"current_balance": transaction_doc["amount"]}}
                )
    else:
        # Normal cari için debit transaction (mevcut mantık)
        sale_transaction = Transaction(
            company_id=current_user["company_id"],
            cari_id=data["cari_id"],
            transaction_type="debit",
            amount=data["sale_price"],
            currency=data.get("currency", "EUR"),
            exchange_rate=data.get("exchange_rate", 1.0),
            description=f"Açık Satış - {data['product_name']}",
            reference_id=extra_sale.id,
            reference_type="extra_sale",
            date=data["date"],
            created_by=current_user["user_id"]
        )
        sale_transaction_doc = sale_transaction.model_dump()
        sale_transaction_doc['created_at'] = sale_transaction_doc['created_at'].isoformat()
        await db.transactions.insert_one(sale_transaction_doc)
        
        # Update cari balance
        balance_field = f"balance_{data.get('currency', 'EUR').lower()}"
        await db.cari_accounts.update_one(
            {"id": data["cari_id"]},
            {"$inc": {balance_field: data["sale_price"]}}
        )
    
    return extra_sale

@api_router.put("/extra-sales/{sale_id}/cancel")
async def cancel_extra_sale(
    sale_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Açık satışı iptal et - önce orijinal tutar geri alınır, sonra no-show bedeli eklenir"""
    sale = await db.extra_sales.find_one({
        "id": sale_id,
        "company_id": current_user["company_id"]
    })
    
    if not sale:
        raise HTTPException(status_code=404, detail="Satış bulunamadı")
    
    if sale.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Satış zaten iptal edilmiş")
    
    cancellation_reason = data.get("cancellation_reason", "")
    apply_no_show = data.get("apply_no_show", False)
    no_show_amount = data.get("no_show_amount")
    no_show_currency = data.get("no_show_currency", "EUR")
    
    update_data = {
        "status": "cancelled",
        "cancellation_reason": cancellation_reason,
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "no_show_applied": apply_no_show,
        "no_show_amount": no_show_amount if apply_no_show else None,
        "no_show_currency": no_show_currency if apply_no_show else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Satış bilgileri
    cari_id = sale.get("cari_id")
    sale_price = sale.get("sale_price", 0)
    sale_currency = sale.get("currency", "EUR")
    
    if cari_id:
        # Cari hesabı bul
        cari = await db.cari_accounts.find_one({"id": cari_id})
        if not cari:
            raise HTTPException(status_code=404, detail="Cari hesap bulunamadı")
        
        # ÖNCE: Orijinal satış tutarını geri al (bakiye azalt)
        balance_field = f"balance_{sale_currency.lower()}"
        current_balance = cari.get(balance_field, 0) or 0
        
        # Satış tutarını geri al (cari artık bize borçlu değil)
        new_balance = current_balance - sale_price
        
        # SONRA: No-show bedeli varsa ekle (cari tekrar bize borçlu olur)
        if apply_no_show and no_show_amount and no_show_amount > 0:
            # No-show bedeli için aynı para birimi kullanılıyorsa
            if no_show_currency.lower() == sale_currency.lower():
                new_balance = new_balance + no_show_amount
            else:
                # Farklı para birimi ise ilgili balance field'ına ekle
                no_show_balance_field = f"balance_{no_show_currency.lower()}"
                no_show_current_balance = cari.get(no_show_balance_field, 0) or 0
                await db.cari_accounts.update_one(
                    {"id": cari_id},
                    {"$set": {no_show_balance_field: no_show_current_balance + no_show_amount}}
                )
        
        # Satış para birimi bakiyesini güncelle
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$set": {balance_field: new_balance}}
        )
        
        # Orijinal satış transaction'ını sil (satış tutarı geri alındı)
        await db.transactions.delete_one({
            "reference_id": sale_id,
            "reference_type": "extra_sale"
        })
        
        # No-show bedeli transaction'ı oluştur (eğer varsa)
        if apply_no_show and no_show_amount and no_show_amount > 0:
            transaction = Transaction(
                company_id=current_user["company_id"],
                cari_id=cari_id,
                transaction_type="debt",  # Borç (cari bize borçlu)
                amount=no_show_amount,
                currency=no_show_currency,
                exchange_rate=data.get("exchange_rate", 1.0),
                reference_type="no_show_penalty",
                reference_id=sale_id,
                description=f"No-show bedeli: {sale.get('customer_name', 'Müşteri')} - {sale.get('product_name', '')} - {sale.get('date', '')}",
                date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                created_by=current_user["user_id"]
            )
            transaction_doc = transaction.model_dump()
            transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
            await db.transactions.insert_one(transaction_doc)
            
            # Activity log (no-show ile iptal)
            await create_activity_log(
                company_id=current_user["company_id"],
                user_id=current_user["user_id"],
                username=current_user.get("username", ""),
                full_name=current_user.get("full_name", ""),
                action="cancel_extra_sale_no_show",
                entity_type="extra_sale",
                entity_id=sale_id,
                entity_name=f"{sale.get('customer_name', '')} - {sale.get('product_name', '')}",
                description=f"Açık satış iptal edildi - Orijinal tutar ({sale_price} {sale_currency}) geri alındı, No-show bedeli ({no_show_amount} {no_show_currency}) eklendi",
                changes={
                    "sale_amount_refunded": sale_price,
                    "sale_currency": sale_currency,
                    "no_show_amount": no_show_amount,
                    "no_show_currency": no_show_currency
                }
            )
        else:
            # Activity log (sadece iptal, no-show yok)
            await create_activity_log(
                company_id=current_user["company_id"],
                user_id=current_user["user_id"],
                username=current_user.get("username", ""),
                full_name=current_user.get("full_name", ""),
                action="cancel_extra_sale",
                entity_type="extra_sale",
                entity_id=sale_id,
                entity_name=f"{sale.get('customer_name', '')} - {sale.get('product_name', '')}",
                description=f"Açık satış iptal edildi - Orijinal tutar ({sale_price} {sale_currency}) geri alındı: {cancellation_reason}",
                changes={
                    "sale_amount_refunded": sale_price,
                    "sale_currency": sale_currency
                }
            )
    else:
        # Cari hesap yoksa sadece log
        await create_activity_log(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            username=current_user.get("username", ""),
            full_name=current_user.get("full_name", ""),
            action="cancel_extra_sale",
            entity_type="extra_sale",
            entity_id=sale_id,
            entity_name=f"{sale.get('customer_name', '')} - {sale.get('product_name', '')}",
            description=f"Açık satış iptal edildi: {cancellation_reason}"
        )
    
    # Satışı güncelle
    await db.extra_sales.update_one(
        {"id": sale_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Açık satış iptal edildi", "no_show_applied": apply_no_show}

@api_router.delete("/extra-sales/{sale_id}")
async def delete_extra_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    # Get user info for logging
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    sale = await db.extra_sales.find_one({"id": sale_id, "company_id": current_user["company_id"]})
    if not sale:
        raise HTTPException(status_code=404, detail="Extra sale not found")
    
    # Revert balance
    balance_field = f"balance_{sale['currency'].lower()}"
    await db.cari_accounts.update_one(
        {"id": sale["cari_id"]},
        {"$inc": {balance_field: -sale["sale_price"]}}
    )
    
    # Delete transaction
    await db.transactions.delete_one({"reference_id": sale_id, "reference_type": "extra_sale"})
    
    # Create activity log before deletion
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", ""),
        full_name=user.get("full_name", ""),
        action="delete",
        entity_type="extra_sale",
        entity_id=sale_id,
        entity_name=f"{sale.get('customer_name', '')} - {sale.get('product_name', '')}",
        description=f"Açık satış silindi: {sale.get('product_name', '')}, {sale.get('customer_name', '')}, {sale.get('sale_price', 0)} {sale.get('currency', 'EUR')}"
    )
    
    # Delete sale
    await db.extra_sales.delete_one({"id": sale_id})
    
    return {"message": "Extra sale deleted"}

@api_router.post("/extra-sales/{sale_id}/voucher")
async def generate_extra_sale_voucher(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Extra sale için voucher oluştur veya mevcut voucher'ı getir"""
    try:
        sale = await db.extra_sales.find_one({"id": sale_id, "company_id": current_user["company_id"]}, {"_id": 0})
        if not sale:
            raise HTTPException(status_code=404, detail="Extra sale not found")
        
        # Eğer voucher_code yoksa oluştur
        if not sale.get("voucher_code"):
            voucher_code = generate_voucher_code()
            # Aynı kodun başka bir extra sale'de olup olmadığını kontrol et
            max_attempts = 10
            attempts = 0
            while await db.extra_sales.find_one({"voucher_code": voucher_code, "company_id": current_user["company_id"]}) and attempts < max_attempts:
                voucher_code = generate_voucher_code()
                attempts += 1
            
            await db.extra_sales.update_one(
                {"id": sale_id, "company_id": current_user["company_id"]},
                {"$set": {"voucher_code": voucher_code}}
            )
            sale["voucher_code"] = voucher_code
        
        # Cari name'i ekle (eğer yoksa)
        if sale.get("cari_id") and not sale.get("cari_name"):
            cari = await db.cari_accounts.find_one({"id": sale["cari_id"]}, {"_id": 0})
            if cari:
                sale["cari_name"] = cari.get("name", "Bilinmeyen")
        
        # Company bilgilerini getir
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        if not company:
            # Company yoksa minimal bilgi oluştur
            company = {
                "id": current_user["company_id"],
                "company_name": "Firma Adı",
                "phone": "",
                "address": "",
                "email": "",
                "website": ""
            }
        
        # Eksik alanları doldur
        sale.setdefault("date", "")
        sale.setdefault("time", "")
        sale.setdefault("product_name", "Açık Satış")
        sale.setdefault("customer_name", "Belirtilmedi / Not Provided")
        sale.setdefault("cari_name", "Belirtilmedi / Not Provided")
        sale.setdefault("person_count", 0)
        sale.setdefault("sale_price", 0)
        sale.setdefault("currency", "EUR")
        sale.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        
        return {
            "sale": sale,
            "company": company
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Voucher oluşturulurken hata oluştu: {str(e)}")

# ==================== SERVICE PURCHASES ====================

@api_router.get("/service-purchases")
async def get_service_purchases(current_user: dict = Depends(get_current_user)):
    purchases = await db.service_purchases.find({"company_id": current_user["company_id"]}, {"_id": 0}).sort("date", -1).to_list(1000)
    return purchases

@api_router.post("/service-purchases")
async def create_service_purchase(data: dict, current_user: dict = Depends(get_current_user)):
    # Get supplier name
    supplier = await db.cari_accounts.find_one({"id": data["supplier_id"]})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    data["supplier_name"] = supplier["name"]
    
    purchase = ServicePurchase(company_id=current_user["company_id"], created_by=current_user["user_id"], **data)
    purchase_doc = purchase.model_dump()
    purchase_doc['created_at'] = purchase_doc['created_at'].isoformat()
    await db.service_purchases.insert_one(purchase_doc)
    
    # Create transaction (expense - gider - biz cariye borçluyuz)
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=data["supplier_id"],
        transaction_type="expense",  # Gider (biz cariye borçluyuz)
        amount=data["amount"],
        currency=data.get("currency", "EUR"),
        exchange_rate=data.get("exchange_rate", 1.0),
        description=f"Hizmet Alımı - {data['service_description']}",
        reference_id=purchase.id,
        reference_type="service_purchase",
        date=data["date"],
        created_by=current_user["user_id"]
    )
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    # Update supplier balance (negative - we owe them)
    # Biz cari firmaya borçlu oluruz = bakiye AZALIR
    balance_field = f"balance_{data.get('currency', 'EUR').lower()}"
    await db.cari_accounts.update_one(
        {"id": data["supplier_id"]},
        {"$inc": {balance_field: -data["amount"]}}
    )
    
    return purchase

@api_router.delete("/service-purchases/{purchase_id}")
async def delete_service_purchase(purchase_id: str, current_user: dict = Depends(get_current_user)):
    """Hizmet alımını sil - bakiye geri alınır"""
    purchase = await db.service_purchases.find_one({
        "id": purchase_id,
        "company_id": current_user["company_id"]
    })
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Hizmet alımı bulunamadı")
    
    # Hizmet alımı geri alınır = bakiye ARTAR (negatif yönde azalır)
    supplier_id = purchase.get("supplier_id")
    amount = purchase.get("amount", 0)
    currency = purchase.get("currency", "EUR")
    
    if supplier_id:
        cari = await db.cari_accounts.find_one({"id": supplier_id})
        if not cari:
            raise HTTPException(status_code=404, detail="Tedarikçi cari hesap bulunamadı")
        
        balance_field = f"balance_{currency.lower()}"
        current_balance = cari.get(balance_field, 0) or 0
        
        # Geri alma = bakiye artar (borç azalır)
        new_balance = current_balance + amount
        
        await db.cari_accounts.update_one(
            {"id": supplier_id},
            {"$set": {balance_field: new_balance}}
        )
        
        # Transaction'ı sil
        await db.transactions.delete_one({
            "reference_id": purchase_id,
            "reference_type": "service_purchase"
        })
        
        # Activity log
        await create_activity_log(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            username=current_user.get("username", ""),
            full_name=current_user.get("full_name", ""),
            action="delete",
            entity_type="service_purchase",
            entity_id=purchase_id,
            entity_name=f"{purchase.get('service_description', '')} - {purchase.get('date', '')}",
            description=f"Hizmet alımı silindi: {purchase.get('service_description', '')}, {amount} {currency}"
        )
    
    # Service purchase'ı sil
    await db.service_purchases.delete_one({"id": purchase_id})
    
    return {"message": "Hizmet alımı silindi"}

# ==================== SEASONAL PRICES ====================

@api_router.get("/seasonal-prices")
async def get_seasonal_prices(current_user: dict = Depends(get_current_user)):
    prices = await db.seasonal_prices.find({"company_id": current_user["company_id"]}, {"_id": 0}).sort("start_date", -1).to_list(1000)
    return prices

@api_router.post("/seasonal-prices")
async def create_seasonal_price(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni fiyat oluştur"""
    try:
        # Gerekli alanları kontrol et
        if not data.get("start_date") or not data.get("end_date"):
            raise HTTPException(status_code=400, detail="Başlangıç ve bitiş tarihi gereklidir")
        
        if not data.get("cari_prices") or len(data.get("cari_prices", {})) == 0:
            raise HTTPException(status_code=400, detail="En az bir cari hesap seçilmelidir")
        
        price = SeasonalPrice(
            company_id=current_user["company_id"],
            created_by=current_user["user_id"],
            **data
        )
        price_doc = price.model_dump()
        price_doc['created_at'] = price_doc['created_at'].isoformat()
        await db.seasonal_prices.insert_one(price_doc)
        
        # Activity log
        await create_activity_log(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            username=current_user.get("username", ""),
            full_name=current_user.get("full_name", ""),
            action="create",
            entity_type="seasonal_price",
            entity_id=price.id,
            entity_name=f"Fiyat ({price.start_date} - {price.end_date})",
            description=f"Yeni fiyat oluşturuldu: {price.start_date} - {price.end_date}",
            changes=data
        )
        
        return price
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Fiyat oluşturulamadı: {str(e)}")

@api_router.put("/seasonal-prices/{price_id}")
async def update_seasonal_price(price_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Fiyat güncelle"""
    try:
        # Mevcut fiyatı kontrol et
        existing = await db.seasonal_prices.find_one({
            "id": price_id,
            "company_id": current_user["company_id"]
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Fiyat bulunamadı")
        
        # Gerekli alanları kontrol et
        if not data.get("start_date") or not data.get("end_date"):
            raise HTTPException(status_code=400, detail="Başlangıç ve bitiş tarihi gereklidir")
        
        if not data.get("cari_prices") or len(data.get("cari_prices", {})) == 0:
            raise HTTPException(status_code=400, detail="En az bir cari hesap seçilmelidir")
        
        # Güncelleme
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.seasonal_prices.update_one(
            {"id": price_id, "company_id": current_user["company_id"]},
            {"$set": data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Fiyat bulunamadı")
        
        # Activity log
        await create_activity_log(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            username=current_user.get("username", ""),
            full_name=current_user.get("full_name", ""),
            action="update",
            entity_type="seasonal_price",
            entity_id=price_id,
            entity_name=f"Fiyat ({data.get('start_date')} - {data.get('end_date')})",
            description=f"Fiyat güncellendi: {data.get('start_date')} - {data.get('end_date')}",
            changes=data
        )
        
        return {"message": "Fiyat güncellendi", "id": price_id}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Fiyat güncellenemedi: {str(e)}")

@api_router.delete("/seasonal-prices/{price_id}")
async def delete_seasonal_price(price_id: str, current_user: dict = Depends(get_current_user)):
    """Fiyat sil"""
    result = await db.seasonal_prices.delete_one({"id": price_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fiyat bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="seasonal_price",
        entity_id=price_id,
        entity_name="Fiyat",
        description="Fiyat silindi"
    )
    
    return {"message": "Fiyat silindi"}

# ==================== VEHICLE CATEGORIES ====================

@api_router.get("/vehicle-categories")
async def get_vehicle_categories(current_user: dict = Depends(get_current_user)):
    """Araç kategorilerini getir"""
    categories = await db.vehicle_categories.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return categories

@api_router.post("/vehicle-categories")
async def create_vehicle_category(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Yeni araç kategorisi oluştur"""
    category = VehicleCategory(company_id=current_user["company_id"], **data)
    category_doc = category.model_dump()
    category_doc['created_at'] = category_doc['created_at'].isoformat()
    await db.vehicle_categories.insert_one(category_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="create",
        entity_type="vehicle_category",
        entity_id=category.id,
        entity_name=category.name,
        description=f"Yeni araç kategorisi oluşturuldu: {category.name}",
        changes=data
    )
    
    return category

@api_router.put("/vehicle-categories/{category_id}")
async def update_vehicle_category(
    category_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Araç kategorisini güncelle"""
    existing = await db.vehicle_categories.find_one({
        "id": category_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    result = await db.vehicle_categories.update_one(
        {"id": category_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="vehicle_category",
        entity_id=category_id,
        entity_name=existing.get("name", "Araç Kategorisi"),
        description=f"Araç kategorisi güncellendi: {existing.get('name', '')}",
        changes=data
    )
    
    return {"message": "Kategori güncellendi"}

@api_router.delete("/vehicle-categories/{category_id}")
async def delete_vehicle_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Araç kategorisini sil"""
    # Kategoriye ait araç var mı kontrol et
    vehicles_count = await db.vehicles.count_documents({
        "company_id": current_user["company_id"],
        "category_id": category_id
    })
    
    if vehicles_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Bu kategoriye ait {vehicles_count} araç bulunmaktadır. Önce araçları silin veya kategorisini değiştirin."
        )
    
    existing = await db.vehicle_categories.find_one({
        "id": category_id,
        "company_id": current_user["company_id"]
    })
    
    result = await db.vehicle_categories.delete_one({
        "id": category_id,
        "company_id": current_user["company_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="vehicle_category",
        entity_id=category_id,
        entity_name=existing.get("name", "Araç Kategorisi") if existing else "Araç Kategorisi",
        description=f"Araç kategorisi silindi: {existing.get('name', '') if existing else ''}"
    )
    
    return {"message": "Kategori silindi"}

# ==================== BANKS ====================

@api_router.get("/banks")
async def get_banks(current_user: dict = Depends(get_current_user)):
    """Banka listesini getir"""
    banks = await db.banks.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    return banks

@api_router.post("/banks")
async def create_bank(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni banka oluştur"""
    bank = Bank(company_id=current_user["company_id"], **data)
    bank_doc = bank.model_dump()
    bank_doc['created_at'] = bank_doc['created_at'].isoformat()
    await db.banks.insert_one(bank_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="create",
        entity_type="bank",
        entity_id=bank.id,
        entity_name=bank.name,
        description=f"Yeni banka oluşturuldu: {bank.name}",
        changes=data
    )
    
    return bank

@api_router.put("/banks/{bank_id}")
async def update_bank(bank_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Banka güncelle"""
    existing = await db.banks.find_one({
        "id": bank_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Banka bulunamadı")
    
    result = await db.banks.update_one(
        {"id": bank_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banka bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="bank",
        entity_id=bank_id,
        entity_name=existing.get("name", "Banka"),
        description=f"Banka güncellendi: {existing.get('name', '')}",
        changes=data
    )
    
    return {"message": "Banka güncellendi"}

@api_router.delete("/banks/{bank_id}")
async def delete_bank(bank_id: str, current_user: dict = Depends(get_current_user)):
    """Banka sil"""
    # Bu bankaya ait hesaplar var mı kontrol et
    accounts_count = await db.bank_accounts.count_documents({
        "company_id": current_user["company_id"],
        "bank_id": bank_id
    })
    
    if accounts_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Bu bankaya ait {accounts_count} hesap bulunmaktadır. Önce hesapları silin."
        )
    
    existing = await db.banks.find_one({
        "id": bank_id,
        "company_id": current_user["company_id"]
    })
    
    result = await db.banks.delete_one({
        "id": bank_id,
        "company_id": current_user["company_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banka bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="bank",
        entity_id=bank_id,
        entity_name=existing.get("name", "Banka") if existing else "Banka",
        description=f"Banka silindi: {existing.get('name', '') if existing else ''}"
    )
    
    return {"message": "Banka silindi"}

# ==================== BANK ACCOUNTS ====================

@api_router.get("/bank-accounts")
async def get_bank_accounts(
    account_type: Optional[str] = None,  # "bank_account" veya "credit_card"
    current_user: dict = Depends(get_current_user)
):
    """Banka hesap listesini getir"""
    query = {"company_id": current_user["company_id"], "is_active": True}
    if account_type:
        query["account_type"] = account_type
    
    accounts = await db.bank_accounts.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Bank bilgilerini populate et
    for account in accounts:
        bank = await db.banks.find_one({"id": account.get("bank_id")}, {"_id": 0})
        if bank:
            account["bank_name"] = bank.get("name")
    
    return accounts

@api_router.post("/bank-accounts")
async def create_bank_account(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni banka hesabı oluştur"""
    bank_account = BankAccount(company_id=current_user["company_id"], **data)
    bank_account_doc = bank_account.model_dump()
    bank_account_doc['created_at'] = bank_account_doc['created_at'].isoformat()
    await db.bank_accounts.insert_one(bank_account_doc)
    
    # Otomatik olarak CashAccount oluştur
    cash_account = CashAccount(
        company_id=current_user["company_id"],
        account_type=bank_account.account_type,
        account_name=bank_account.account_name,
        bank_account_id=bank_account.id,
        currency=bank_account.currency,
        current_balance=0.0
    )
    cash_account_doc = cash_account.model_dump()
    cash_account_doc['created_at'] = cash_account_doc['created_at'].isoformat()
    await db.cash_accounts.insert_one(cash_account_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="create",
        entity_type="bank_account",
        entity_id=bank_account.id,
        entity_name=bank_account.account_name,
        description=f"Yeni banka hesabı oluşturuldu: {bank_account.account_name}",
        changes=data
    )
    
    return bank_account

@api_router.put("/bank-accounts/{account_id}")
async def update_bank_account(account_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Banka hesabı güncelle"""
    existing = await db.bank_accounts.find_one({
        "id": account_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Banka hesabı bulunamadı")
    
    result = await db.bank_accounts.update_one(
        {"id": account_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banka hesabı bulunamadı")
    
    # İlgili CashAccount'u da güncelle
    if "account_name" in data:
        await db.cash_accounts.update_one(
            {"bank_account_id": account_id},
            {"$set": {"account_name": data["account_name"]}}
        )
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="bank_account",
        entity_id=account_id,
        entity_name=existing.get("account_name", "Banka Hesabı"),
        description=f"Banka hesabı güncellendi: {existing.get('account_name', '')}",
        changes=data
    )
    
    return {"message": "Banka hesabı güncellendi"}

@api_router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Banka hesabı sil"""
    existing = await db.bank_accounts.find_one({
        "id": account_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Banka hesabı bulunamadı")
    
    # İlgili CashAccount'u da sil
    await db.cash_accounts.delete_one({"bank_account_id": account_id})
    
    result = await db.bank_accounts.delete_one({
        "id": account_id,
        "company_id": current_user["company_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banka hesabı bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="bank_account",
        entity_id=account_id,
        entity_name=existing.get("account_name", "Banka Hesabı"),
        description=f"Banka hesabı silindi: {existing.get('account_name', '')}"
    )
    
    return {"message": "Banka hesabı silindi"}

# ==================== CASH ACCOUNTS ====================

@api_router.get("/cash-accounts")
async def get_cash_accounts(
    account_type: Optional[str] = None,  # "cash", "bank_account", "credit_card"
    currency: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Kasa hesap listesini getir"""
    query = {"company_id": current_user["company_id"], "is_active": True}
    if account_type:
        query["account_type"] = account_type
    if currency:
        query["currency"] = currency
    
    accounts = await db.cash_accounts.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    
    # BankAccount bilgilerini populate et
    for account in accounts:
        if account.get("bank_account_id"):
            bank_account = await db.bank_accounts.find_one(
                {"id": account["bank_account_id"]},
                {"_id": 0}
            )
            if bank_account:
                account["bank_account"] = bank_account
                bank = await db.banks.find_one({"id": bank_account.get("bank_id")}, {"_id": 0})
                if bank:
                    account["bank_name"] = bank.get("name")
    
    return accounts

@api_router.get("/cash-accounts/{account_id}/balance")
async def get_cash_account_balance(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Kasa hesabı bakiyesini getir"""
    account = await db.cash_accounts.find_one({
        "id": account_id,
        "company_id": current_user["company_id"]
    }, {"_id": 0})
    
    if not account:
        raise HTTPException(status_code=404, detail="Kasa hesabı bulunamadı")
    
    balance = account.get("current_balance", 0) or 0
    
    return {
        "account": account,
        "balance": balance,
        "currency": account.get("currency", "TRY")
    }

# ==================== TRANSACTIONS ====================

@api_router.get("/transactions")
async def get_transactions(
    transaction_type: Optional[str] = None,
    payment_method: Optional[str] = None,
    cari_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Transaction'ları getir - Filtreleme ile"""
    query = {"company_id": current_user["company_id"]}
    
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    if payment_method:
        query["payment_method"] = payment_method
    
    if cari_id:
        query["cari_id"] = cari_id
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Cari bilgilerini populate et
    for transaction in transactions:
        if transaction.get("cari_id"):
            cari = await db.cari_accounts.find_one({"id": transaction.get("cari_id")}, {"_id": 0})
            if cari:
                transaction["cari_name"] = cari.get("name")
        
        # Bank account bilgilerini populate et
        if transaction.get("bank_account_id"):
            bank_account = await db.bank_accounts.find_one({"id": transaction.get("bank_account_id")}, {"_id": 0})
            if bank_account:
                transaction["bank_account_name"] = bank_account.get("account_name")
                transaction["bank_name"] = bank_account.get("bank_name")
    
    return transactions

@api_router.post("/transactions")
async def create_transaction(data: dict, current_user: dict = Depends(get_current_user)):
    """Tahsilat/Ödeme işlemi - Ödeme tipine göre farklı aksiyonlar"""
    # User kontrolü
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cari hesap kontrolü
    cari = await db.cari_accounts.find_one({"id": data.get("cari_id")})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Payment type kontrolü
    payment_type_id = data.get("payment_type_id")
    if not payment_type_id:
        raise HTTPException(status_code=400, detail="Ödeme tipi seçilmelidir")
    
    payment_type = await db.payment_types.find_one({
        "id": payment_type_id,
        "company_id": current_user["company_id"],
        "is_active": True
    })
    
    if not payment_type:
        raise HTTPException(status_code=404, detail="Ödeme tipi bulunamadı veya pasif")
    
    payment_code = payment_type.get("code")
    
    # Eğer code yoksa, payment_type_name'den türet
    if not payment_code:
        payment_type_name = payment_type.get("name", "").lower()
        # Türkçe isimlerden code türet
        name_to_code_map = {
            "nakit": "cash",
            "havale": "bank_transfer",
            "banka transferi": "bank_transfer",
            "kredi kartı": "credit_card",
            "kredi karti": "credit_card",
            "çek": "check_promissory",
            "senet": "check_promissory",
            "çek/senet": "check_promissory",
            "cariye aktar": "transfer_to_cari",
            "cari aktarma": "transfer_to_cari",
            "mahsup": "write_off",
            "online ödeme": "online_payment",
            "mail order": "mail_order"
        }
        
        payment_code = name_to_code_map.get(payment_type_name)
        
        # Eğer hala code yoksa, payment_type_name'i code olarak kullan (küçük harf, boşlukları alt çizgi ile değiştir)
        if not payment_code:
            payment_code = payment_type_name.replace(" ", "_").replace("ş", "s").replace("ç", "c").replace("ğ", "g").replace("ı", "i").replace("ö", "o").replace("ü", "u")
        
        # payment_type MongoDB kaydını güncelle (code ekle)
        await db.payment_types.update_one(
            {"id": payment_type_id},
            {"$set": {"code": payment_code}}
        )
        logger.info(f"payment_type code eklendi: payment_type_id={payment_type_id}, code={payment_code}")
    
    # payment_code kesinlikle string olmalı
    if not isinstance(payment_code, str) or not payment_code:
        raise HTTPException(status_code=500, detail=f"Ödeme tipi code değeri geçersiz: {payment_code}")
    
    cash_account_id = None
    bank_account_id = None
    commission_amount = None
    net_amount = data.get("amount", 0)
    valor_date = None
    transfer_to_cari_id = None
    due_date = None
    check_number = None
    
    # Ödeme tipine göre aksiyon
    if payment_code == "cash":
        # Nakit Kasa bul veya oluştur (currency'ye göre)
        currency = data.get("currency", "TRY")
        cash_account = await db.cash_accounts.find_one({
            "company_id": current_user["company_id"],
            "account_type": "cash",
            "currency": currency,
            "is_active": True
        })
        
        if not cash_account:
            # Nakit kasa yoksa oluştur
            cash_account_new = CashAccount(
                company_id=current_user["company_id"],
                account_type="cash",
                account_name=f"Nakit Kasa ({currency})",
                currency=currency,
                current_balance=0.0
            )
            cash_account_doc = cash_account_new.model_dump()
            cash_account_doc['created_at'] = cash_account_doc['created_at'].isoformat()
            await db.cash_accounts.insert_one(cash_account_doc)
            cash_account_id = cash_account_new.id
            logger.info(f"Created new cash account for currency {currency}: {cash_account_id}")
        else:
            cash_account_id = cash_account["id"]
            logger.info(f"Using existing cash account for currency {currency}: {cash_account_id}")
    
    elif payment_code == "bank_transfer":
        # Havale - Banka hesabı seçilmeli
        bank_account_id = data.get("bank_account_id")
        if not bank_account_id:
            raise HTTPException(status_code=400, detail="Havale için banka hesabı seçilmelidir")
        
        bank_account = await db.bank_accounts.find_one({
            "id": bank_account_id,
            "company_id": current_user["company_id"],
            "account_type": "bank_account"
        })
        
        if not bank_account:
            raise HTTPException(status_code=404, detail="Banka hesabı bulunamadı")
        
        # İlgili CashAccount'u bul veya oluştur
        cash_account = await db.cash_accounts.find_one({
            "bank_account_id": bank_account_id,
            "company_id": current_user["company_id"]
        })
        
        if not cash_account:
            # CashAccount yoksa oluştur
            cash_account_new = CashAccount(
                company_id=current_user["company_id"],
                account_type="bank_account",
                account_name=bank_account.get("account_name", f"Havale - {bank_account.get('bank_name', '')}"),
                currency=data.get("currency", "TRY"),
                current_balance=0.0,
                bank_account_id=bank_account_id
            )
            cash_account_doc = cash_account_new.model_dump()
            cash_account_doc['created_at'] = cash_account_doc['created_at'].isoformat()
            await db.cash_accounts.insert_one(cash_account_doc)
            cash_account_id = cash_account_new.id
        else:
            cash_account_id = cash_account["id"]
    
    elif payment_code in ["credit_card", "online_payment", "mail_order"]:
        # Kredi Kartı, Online Ödeme, Mail Order - Kredi kartı hesabı seçilmeli
        bank_account_id = data.get("bank_account_id")
        if not bank_account_id:
            raise HTTPException(status_code=400, detail="Kredi kartı hesabı seçilmelidir")
        
        bank_account = await db.bank_accounts.find_one({
            "id": bank_account_id,
            "company_id": current_user["company_id"],
            "account_type": "credit_card"
        })
        
        if not bank_account:
            raise HTTPException(status_code=404, detail="Kredi kartı hesabı bulunamadı")
        
        # Komisyon hesapla
        commission_rate = bank_account.get("commission_rate")
        if commission_rate:
            commission_amount = (data.get("amount", 0) * commission_rate) / 100
            net_amount = data.get("amount", 0) - commission_amount
        else:
            commission_amount = 0
            net_amount = data.get("amount", 0)
        
        # Valör süresi hesapla
        valor_days = bank_account.get("valor_days", 0)
        if valor_days > 0:
            payment_date = datetime.strptime(data.get("date", datetime.now().strftime("%Y-%m-%d")), "%Y-%m-%d")
            valor_date_obj = payment_date + timedelta(days=valor_days)
            valor_date = valor_date_obj.strftime("%Y-%m-%d")
        else:
            # Komisyon varsa ertesi gün, yoksa aynı gün
            if commission_rate:
                payment_date = datetime.strptime(data.get("date", datetime.now().strftime("%Y-%m-%d")), "%Y-%m-%d")
                valor_date_obj = payment_date + timedelta(days=1)
                valor_date = valor_date_obj.strftime("%Y-%m-%d")
            else:
                valor_date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
        
        # İlgili CashAccount'u bul veya oluştur
        cash_account = await db.cash_accounts.find_one({
            "bank_account_id": bank_account_id,
            "company_id": current_user["company_id"]
        })
        
        if not cash_account:
            # CashAccount yoksa oluştur
            cash_account_new = CashAccount(
                company_id=current_user["company_id"],
                account_type="credit_card",
                account_name=bank_account.get("account_name", f"Kredi Kartı - {bank_account.get('bank_name', '')}"),
                currency=data.get("currency", "TRY"),
                current_balance=0.0,
                bank_account_id=bank_account_id
            )
            cash_account_doc = cash_account_new.model_dump()
            cash_account_doc['created_at'] = cash_account_doc['created_at'].isoformat()
            await db.cash_accounts.insert_one(cash_account_doc)
            cash_account_id = cash_account_new.id
        else:
            cash_account_id = cash_account["id"]
    
    elif payment_code == "transfer_to_cari":
        # Cariye Aktar → Cari hesaba tutar aktarılır
        transfer_to_cari_id = data.get("transfer_to_cari_id")
        
        if not transfer_to_cari_id:
            raise HTTPException(status_code=400, detail="Aktarılacak cari hesap seçilmelidir")
        
        # Aktarılacak cari kontrolü
        target_cari = await db.cari_accounts.find_one({
            "id": transfer_to_cari_id,
            "company_id": current_user["company_id"]
        })
        
        if not target_cari:
            raise HTTPException(status_code=404, detail="Aktarılacak cari hesap bulunamadı")
        
        # Aktarılacak cari hesabın bakiyesine tutarı ekle (para birimi olduğu gibi)
        balance_field = f"balance_{data.get('currency', 'TRY').lower()}"
        current_balance = target_cari.get(balance_field, 0) or 0
        transfer_amount = data.get("amount", 0)
        new_balance = current_balance + transfer_amount  # Tutar olduğu gibi eklenir
        
        logger.info(f"Transfer to cari: target_cari_id={transfer_to_cari_id}, currency={data.get('currency', 'TRY')}, balance_field={balance_field}, current_balance={current_balance}, transfer_amount={transfer_amount}, new_balance={new_balance}")
        
        result = await db.cari_accounts.update_one(
            {"id": transfer_to_cari_id},
            {"$set": {balance_field: new_balance}}
        )
        
        logger.info(f"Update result: matched={result.matched_count}, modified={result.modified_count}")
        
        # Kasa işlemi yok, sadece cari aktarımı
    
    elif payment_code == "check_promissory":
        # Çek/Senet → Vade tarihi ile kayıt
        due_date = data.get("due_date")
        check_number = data.get("check_number")
        
        if not due_date:
            raise HTTPException(status_code=400, detail="Vade tarihi girilmelidir")
        
        # Çek/Senet kaydı oluşturulacak (transaction'dan sonra)
        # Kasa işlemi yok, vade gelince tahsil edilecek
    
    elif payment_code == "write_off":
        # Mahsup → Borç silme, kasa işlemi yok
        # Sadece cari bakiyesini düşür (transaction'dan sonra)
        # Kasa ile ilişkilendirme yapılmamalı
        cash_account_id = None
        bank_account_id = None
        pass
    
    # Transaction oluştur
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=data.get("cari_id"),
        transaction_type=data.get("transaction_type", "payment"),
        amount=data.get("amount", 0),
        currency=data.get("currency", "TRY"),
        exchange_rate=data.get("exchange_rate", 1.0),
        payment_type_id=data.get("payment_type_id"),
        payment_type_name=data.get("payment_type_name"),
        description=data.get("description", ""),
        reference_id=data.get("reference_id"),
        reference_type=data.get("reference_type"),
        date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
        created_by=current_user["user_id"],
        payment_method=payment_code,  # payment_code kullan (yukarıda kontrol edildi, None olamaz)
        bank_account_id=bank_account_id if payment_code != "write_off" else None,
        cash_account_id=cash_account_id if payment_code != "write_off" else None,
        commission_amount=commission_amount,
        net_amount=net_amount,
        valor_date=valor_date,
        transfer_to_cari_id=transfer_to_cari_id,
        due_date=due_date,
        check_number=check_number,
        is_settled=(valor_date is None or valor_date <= data.get("date", datetime.now().strftime("%Y-%m-%d"))) if valor_date else True
    )
    
    try:
        transaction_doc = transaction.model_dump()
        transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
        
        # Eğer payment_method None ise, payment_code'dan set et (güvenlik kontrolü)
        if transaction_doc.get('payment_method') is None:
            transaction_doc['payment_method'] = payment_code
        
        result = await db.transactions.insert_one(transaction_doc)
        
    except Exception as e:
        logger.error(f"Transaction insert failed - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transaction kaydedilemedi: {str(e)}")
    
    # transfer_to_cari durumunda: Hedef cari için de transaction kaydı oluştur
    if payment_code == "transfer_to_cari" and transfer_to_cari_id:
        # Kaynak cari bilgisini al
        source_cari = await db.cari_accounts.find_one({"id": data.get("cari_id")})
        source_cari_name = source_cari.get("name", "Bilinmeyen Cari") if source_cari else "Bilinmeyen Cari"
        
        # Hedef cari için transaction oluştur
        target_transaction = Transaction(
            company_id=current_user["company_id"],
            cari_id=transfer_to_cari_id,
            transaction_type="credit",  # Hedef cari için alacak (bakiye artar)
            amount=data.get("amount", 0),
            currency=data.get("currency", "TRY"),
            exchange_rate=data.get("exchange_rate", 1.0),
            payment_type_id=data.get("payment_type_id"),
            payment_type_name="Cari Aktarma",  # Özel isim
            description=f"Cari Aktarma - {source_cari_name}",
            reference_id=transaction.id,  # Kaynak transaction'a referans
            reference_type="transfer_from_cari",
            date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            created_by=current_user["user_id"],
            payment_method="transfer_from_cari",
            bank_account_id=None,
            cash_account_id=None,
            commission_amount=None,
            net_amount=data.get("amount", 0),
            valor_date=None,
            transfer_to_cari_id=None,  # Hedef cari için bu alan boş
            due_date=None,
            check_number=None,
            is_settled=True
        )
        
        target_transaction_doc = target_transaction.model_dump()
        target_transaction_doc['created_at'] = target_transaction_doc['created_at'].isoformat()
        await db.transactions.insert_one(target_transaction_doc)
        
        logger.info(f"Target cari transaction created: target_cari_id={transfer_to_cari_id}, amount={data.get('amount', 0)}, currency={data.get('currency', 'TRY')}")
    
    # Kasa bakiyesini güncelle (eğer kasa işlemi varsa)
    if cash_account_id and payment_code not in ["transfer_to_cari", "check_promissory", "write_off"]:
        if payment_code == "cash":
            # Nakit için direkt bakiye artır (valör yok)
            await db.cash_accounts.update_one(
                {"id": cash_account_id},
                {"$inc": {"current_balance": data.get("amount", 0)}}
            )
        elif valor_date and valor_date > data.get("date", datetime.now().strftime("%Y-%m-%d")):
            # Valör süresi var - PaymentSettlement oluştur (bakiye artırılmaz, valör tarihinde artırılacak)
            settlement = PaymentSettlement(
                company_id=current_user["company_id"],
                transaction_id=transaction.id,
                bank_account_id=bank_account_id,
                original_amount=data.get("amount", 0),
                commission_amount=commission_amount or 0,
                net_amount=net_amount,
                currency=data.get("currency", "TRY"),
                payment_date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
                settlement_date=valor_date,
                is_settled=False
            )
            settlement_doc = settlement.model_dump()
            settlement_doc['created_at'] = settlement_doc['created_at'].isoformat()
            await db.payment_settlements.insert_one(settlement_doc)
        else:
            # Hemen hesaba geçiyor - bakiye artır (havale, kredi kartı komisyonlu ama valör yok)
            await db.cash_accounts.update_one(
                {"id": cash_account_id},
                {"$inc": {"current_balance": net_amount}}
            )
    
    # Çek/Senet kaydı oluştur
    if payment_code == "check_promissory":
        check_promissory = CheckPromissory(
            company_id=current_user["company_id"],
            transaction_id=transaction.id,
            cari_id=data.get("cari_id"),
            check_number=check_number,
            bank_name=data.get("bank_name"),
            due_date=due_date,
            amount=data.get("amount", 0),
            currency=data.get("currency", "TRY"),
            description=data.get("description")
        )
        check_doc = check_promissory.model_dump()
        check_doc['created_at'] = check_doc['created_at'].isoformat()
        await db.check_promissories.insert_one(check_doc)
    
    # Cari hesap bakiyesini güncelle
    if payment_code != "write_off":
        # Mahsup hariç tüm işlemlerde cari bakiyesi güncellenir
        balance_field = f"balance_{data.get('currency', 'TRY').lower()}"
        if data.get("transaction_type") == "payment":
            # Tahsilat: Kaynak cari hesabın bakiyesi azalır
            # NOT: transfer_to_cari durumunda hedef cari hesabın bakiyesi zaten yukarıda güncellendi (satır 3193-3201)
            await db.cari_accounts.update_one(
                {"id": data.get("cari_id")},
                {"$inc": {balance_field: -data.get("amount", 0)}}
            )
    else:
        # Mahsup: Borç silinir (bakiye sıfırlanır veya azaltılır)
        balance_field = f"balance_{data.get('currency', 'TRY').lower()}"
        current_balance = cari.get(balance_field, 0) or 0
        # Mahsup tutarı kadar borç silinir
        new_balance = max(0, current_balance - data.get("amount", 0))  # Negatif olamaz
        await db.cari_accounts.update_one(
            {"id": data.get("cari_id")},
            {"$set": {balance_field: new_balance}}
        )
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=user.get("username", ""),
        full_name=user.get("full_name", ""),
        action="create",
        entity_type="transaction",
        entity_id=transaction.id,
        entity_name=f"Tahsilat - {data.get('amount', 0)} {data.get('currency', 'TRY')}",
        description=f"Tahsilat oluşturuldu: {data.get('amount', 0)} {data.get('currency', 'TRY')} - {payment_type.get('name', payment_code)}",
        changes=data
    )
    
    return transaction

# ==================== CHECK/PROMISSORY ====================

@api_router.get("/check-promissories")
async def get_check_promissories(
    is_collected: Optional[bool] = None,
    due_date_from: Optional[str] = None,
    due_date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Çek/Senet listesini getir"""
    query = {"company_id": current_user["company_id"]}
    
    if is_collected is not None:
        query["is_collected"] = is_collected
    
    if due_date_from or due_date_to:
        query["due_date"] = {}
        if due_date_from:
            query["due_date"]["$gte"] = due_date_from
        if due_date_to:
            query["due_date"]["$lte"] = due_date_to
    
    checks = await db.check_promissories.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    
    # Cari bilgilerini populate et
    for check in checks:
        cari = await db.cari_accounts.find_one({"id": check.get("cari_id")}, {"_id": 0})
        if cari:
            check["cari_name"] = cari.get("name")
    
    return checks

@api_router.put("/check-promissories/{check_id}/collect")
async def collect_check_promissory(
    check_id: str,
    data: dict,  # { collection_date: str, cash_account_id: str }
    current_user: dict = Depends(get_current_user)
):
    """Çek/Senet tahsil et - Kasa hesabına aktar"""
    check = await db.check_promissories.find_one({
        "id": check_id,
        "company_id": current_user["company_id"]
    })
    
    if not check:
        raise HTTPException(status_code=404, detail="Çek/Senet bulunamadı")
    
    if check.get("is_collected"):
        raise HTTPException(status_code=400, detail="Bu çek/senet zaten tahsil edilmiş")
    
    cash_account_id = data.get("cash_account_id")
    if not cash_account_id:
        raise HTTPException(status_code=400, detail="Kasa hesabı seçilmelidir")
    
    # Kasa bakiyesini artır
    await db.cash_accounts.update_one(
        {"id": cash_account_id},
        {"$inc": {"current_balance": check["amount"]}}
    )
    
    # Çek/Senet'i işaretle
    await db.check_promissories.update_one(
        {"id": check_id},
        {"$set": {
            "is_collected": True,
            "collected_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Transaction'ı güncelle
    await db.transactions.update_one(
        {"id": check["transaction_id"]},
        {"$set": {
            "cash_account_id": cash_account_id,
            "is_settled": True,
            "settled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="collect_check",
        entity_type="check_promissory",
        entity_id=check_id,
        entity_name=f"Çek/Senet - {check.get('check_number', '')}",
        description=f"Çek/Senet tahsil edildi: {check.get('amount', 0)} {check.get('currency', 'TRY')}"
    )
    
    return {"message": "Çek/Senet tahsil edildi"}

# ==================== INITIALIZE DEFAULT PAYMENT TYPES ====================

@api_router.post("/payment-types/initialize-defaults")
async def initialize_default_payment_types_endpoint(current_user: dict = Depends(get_current_user)):
    """Mevcut şirket için default ödeme tiplerini oluştur"""
    await initialize_default_payment_types(current_user["company_id"])
    return {"message": "Default ödeme tipleri oluşturuldu"}

@api_router.post("/transactions/process-settlements")
async def process_settlements(
    date: Optional[str] = None,  # YYYY-MM-DD, None ise bugün
    current_user: dict = Depends(get_current_user)
):
    """Valör süresi dolan tahsilatları kasa hesabına yerleştir"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Valör süresi dolmuş ama henüz yerleştirilmemiş settlement'ları bul
    settlements = await db.payment_settlements.find({
        "company_id": current_user["company_id"],
        "settlement_date": {"$lte": date},
        "is_settled": False
    }, {"_id": 0}).to_list(1000)
    
    processed = []
    
    for settlement in settlements:
        # CashAccount'u bul
        bank_account = await db.bank_accounts.find_one({
            "id": settlement["bank_account_id"]
        })
        
        if not bank_account:
            continue
        
        cash_account = await db.cash_accounts.find_one({
            "bank_account_id": settlement["bank_account_id"],
            "company_id": current_user["company_id"]
        })
        
        if not cash_account:
            continue
        
        # Kasa bakiyesini artır
        await db.cash_accounts.update_one(
            {"id": cash_account["id"]},
            {"$inc": {"current_balance": settlement["net_amount"]}}
        )
        
        # Settlement'ı işaretle
        await db.payment_settlements.update_one(
            {"id": settlement["id"]},
            {"$set": {
                "is_settled": True,
                "settled_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Transaction'ı güncelle
        await db.transactions.update_one(
            {"id": settlement["transaction_id"]},
            {"$set": {
                "is_settled": True,
                "settled_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        processed.append({
            "settlement_id": settlement["id"],
            "transaction_id": settlement["transaction_id"],
            "amount": settlement["net_amount"],
            "currency": settlement["currency"]
        })
    
    return {
        "message": f"{len(processed)} tahsilat yerleştirildi",
        "processed": processed
    }

@api_router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Transaction'ı güncelle - Cari bakiyesini de güncelle"""
    # Mevcut transaction'ı bul
    existing = await db.transactions.find_one({
        "id": transaction_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction bulunamadı")
    
    # Referans tipi kontrolü - rezervasyon, hizmet al vb. kaynaklı transaction'lar düzenlenemez
    reference_type = existing.get("reference_type")
    if reference_type and reference_type not in ["manual", "outgoing_payment"]:
        raise HTTPException(
            status_code=400,
            detail=f"Bu transaction bir {reference_type} kaynağından oluşturulmuş. Kaynak işlem üzerinden düzenlenmelidir."
        )
    
    cari_id = existing.get("cari_id")
    if not cari_id:
        raise HTTPException(status_code=400, detail="Cari ID bulunamadı")
    
    # Cari hesabı bul
    cari = await db.cari_accounts.find_one({"id": cari_id})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari hesap bulunamadı")
    
    # Eski tutarı geri al (bakiyeyi tersine çevir)
    old_amount = existing.get("amount", 0)
    old_currency = existing.get("currency", "TRY")
    old_transaction_type = existing.get("transaction_type")
    
    old_balance_field = f"balance_{old_currency.lower()}"
    if old_transaction_type == "payment":
        # Eski tahsilatı geri al (bakiye artır)
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$inc": {old_balance_field: old_amount}}
        )
    elif old_transaction_type in ["debit", "credit"]:
        # Eski borç/alacakı geri al
        if old_transaction_type == "debit":
            await db.cari_accounts.update_one(
                {"id": cari_id},
                {"$inc": {old_balance_field: -old_amount}}
            )
        else:
            await db.cari_accounts.update_one(
                {"id": cari_id},
                {"$inc": {old_balance_field: old_amount}}
            )
    
    # Yeni tutarı uygula
    new_amount = data.get("amount", old_amount)
    new_currency = data.get("currency", old_currency)
    new_transaction_type = data.get("transaction_type", old_transaction_type)
    
    new_balance_field = f"balance_{new_currency.lower()}"
    if new_transaction_type == "payment":
        # Yeni tahsilatı uygula (bakiye azalt)
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$inc": {new_balance_field: -new_amount}}
        )
    elif new_transaction_type in ["debit", "credit"]:
        # Yeni borç/alacağı uygula
        if new_transaction_type == "debit":
            await db.cari_accounts.update_one(
                {"id": cari_id},
                {"$inc": {new_balance_field: new_amount}}
            )
        else:
            await db.cari_accounts.update_one(
                {"id": cari_id},
                {"$inc": {new_balance_field: -new_amount}}
            )
    
    # Transaction'ı güncelle
    update_data = {
        "amount": new_amount,
        "currency": new_currency,
        "transaction_type": new_transaction_type,
        "description": data.get("description", existing.get("description")),
        "date": data.get("date", existing.get("date")),
        "payment_type_id": data.get("payment_type_id", existing.get("payment_type_id")),
        "bank_account_id": data.get("bank_account_id", existing.get("bank_account_id")),
        "transfer_to_cari_id": data.get("transfer_to_cari_id", existing.get("transfer_to_cari_id")),
        "due_date": data.get("due_date", existing.get("due_date")),
        "check_number": data.get("check_number", existing.get("check_number")),
        "bank_name": data.get("bank_name", existing.get("bank_name")),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Null değerleri kaldır
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": update_data}
    )
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="transaction",
        entity_id=transaction_id,
        entity_name="Transaction",
        description=f"Transaction güncellendi: {old_amount} {old_currency} → {new_amount} {new_currency}",
        changes=data
    )
    
    return {"message": "Transaction güncellendi"}

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Transaction'ı sil - Cari bakiyesini de güncelle"""
    # Mevcut transaction'ı bul
    existing = await db.transactions.find_one({
        "id": transaction_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction bulunamadı")
    
    # Referans tipi kontrolü - rezervasyon, hizmet al vb. kaynaklı transaction'lar silinemez
    reference_type = existing.get("reference_type")
    if reference_type and reference_type not in ["manual", "outgoing_payment"]:
        raise HTTPException(
            status_code=400,
            detail=f"Bu transaction bir {reference_type} kaynağından oluşturulmuş. Kaynak işlem üzerinden silinmelidir."
        )
    
    cari_id = existing.get("cari_id")
    if not cari_id:
        raise HTTPException(status_code=400, detail="Cari ID bulunamadı")
    
    # Cari hesabı bul
    cari = await db.cari_accounts.find_one({"id": cari_id})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari hesap bulunamadı")
    
    # Tutarı geri al (bakiyeyi tersine çevir)
    amount = existing.get("amount", 0)
    currency = existing.get("currency", "TRY")
    transaction_type = existing.get("transaction_type")
    
    balance_field = f"balance_{currency.lower()}"
    if transaction_type == "payment":
        # Tahsilatı geri al (bakiye artır)
        await db.cari_accounts.update_one(
            {"id": cari_id},
            {"$inc": {balance_field: amount}}
        )
    elif transaction_type in ["debit", "credit"]:
        # Borç/alacağı geri al
        if transaction_type == "debit":
            await db.cari_accounts.update_one(
                {"id": cari_id},
                {"$inc": {balance_field: -amount}}
            )
        else:
            await db.cari_accounts.update_one(
                {"id": cari_id},
                {"$inc": {balance_field: amount}}
            )
    
    # İlgili kayıtları temizle
    # Check/Promissory kaydı varsa sil
    if existing.get("payment_type_id"):
        payment_type = await db.payment_types.find_one({"id": existing.get("payment_type_id")})
        if payment_type and payment_type.get("code") == "check_promissory":
            await db.check_promissories.delete_one({"transaction_id": transaction_id})
    
    # Payment Settlement kaydı varsa sil
    await db.payment_settlements.delete_one({"transaction_id": transaction_id})
    
    # Cash Account bakiyesini güncelle (eğer cash_account_id varsa)
    cash_account_id = existing.get("cash_account_id")
    if cash_account_id:
        if transaction_type == "payment":
            # Tahsilat geri alındı, kasa bakiyesini azalt
            net_amount = existing.get("net_amount") or amount
            await db.cash_accounts.update_one(
                {"id": cash_account_id},
                {"$inc": {"current_balance": -net_amount}}
            )
    
    # Transaction'ı sil
    result = await db.transactions.delete_one({"id": transaction_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction silinemedi")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="transaction",
        entity_id=transaction_id,
        entity_name="Transaction",
        description=f"Transaction silindi: {amount} {currency}"
    )
    
    return {"message": "Transaction silindi"}

# ==================== CARI ACCOUNTS ====================

@api_router.get("/cari-accounts/{cari_id}")
async def get_cari_account(cari_id: str, current_user: dict = Depends(get_current_user)):
    """Cari hesap detayı - Tüm tahsilat bilgileri ile"""
    cari = await db.cari_accounts.find_one({"id": cari_id, "company_id": current_user["company_id"]}, {"_id": 0})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Transactions
    transactions = await db.transactions.find({"cari_id": cari_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Ödeme tipine göre gruplandırılmış tahsilatlar
    payment_type_stats = defaultdict(lambda: {
        "EUR": {"total": 0, "settled": 0, "pending": 0},
        "USD": {"total": 0, "settled": 0, "pending": 0},
        "TRY": {"total": 0, "settled": 0, "pending": 0}
    })
    
    # Nakit tahsilatlar (payment_method: "cash" veya payment_type_code: "cash")
    cash_payments = []
    # Havale tahsilatlar (payment_method: "bank_transfer" veya payment_type_code: "bank_transfer")
    bank_transfer_payments = []
    # Kredi kartı tahsilatlar (payment_method: "credit_card" veya payment_type_code: "credit_card")
    credit_card_payments = []
    # Çek/Senet
    check_promissory_payments = []
    # Online ödeme
    online_payment_payments = []
    # Mail order
    mail_order_payments = []
    
    # Tüm tahsil edilmiş tutarlar (is_settled: true veya valor_date yoksa)
    total_collected = {"EUR": 0, "USD": 0, "TRY": 0}
    # Mevcut (hesaba geçmiş) tutarlar
    current_available = {"EUR": 0, "USD": 0, "TRY": 0}
    # Vadesi beklenen tutarlar (valor_date > bugün veya due_date > bugün)
    pending_due = {"EUR": 0, "USD": 0, "TRY": 0}
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    for transaction in transactions:
        if transaction.get("transaction_type") != "payment":
            continue
        
        currency = transaction.get("currency", "TRY")
        amount = transaction.get("amount", 0)
        net_amount = transaction.get("net_amount", amount)
        payment_method = transaction.get("payment_method", "cash")
        payment_type_id = transaction.get("payment_type_id")
        is_settled = transaction.get("is_settled", True)
        valor_date = transaction.get("valor_date")
        due_date = transaction.get("due_date")
        
        # Payment type bilgisini al
        payment_type = None
        if payment_type_id:
            payment_type = await db.payment_types.find_one({"id": payment_type_id}, {"_id": 0})
        
        payment_code = payment_type.get("code") if payment_type else payment_method
        
        # Toplam tahsil edilmiş
        total_collected[currency] += amount
        
        # Mevcut veya vadesi beklenen
        if is_settled and (not valor_date or valor_date <= today) and (not due_date or due_date <= today):
            current_available[currency] += net_amount
        else:
            pending_due[currency] += net_amount
        
        # Ödeme tipine göre grupla
        if payment_code == "cash":
            cash_payments.append(transaction)
        elif payment_code == "bank_transfer":
            bank_transfer_payments.append(transaction)
        elif payment_code == "credit_card":
            credit_card_payments.append(transaction)
        elif payment_code == "check_promissory":
            check_promissory_payments.append(transaction)
        elif payment_code == "online_payment":
            online_payment_payments.append(transaction)
        elif payment_code == "mail_order":
            mail_order_payments.append(transaction)
    
    # Kredi kartı valör listesi (tarihe göre sıralı)
    credit_card_valor_list = []
    for payment in credit_card_payments:
        if payment.get("valor_date") and not payment.get("is_settled"):
            valor_date_obj = datetime.strptime(payment.get("valor_date"), "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (valor_date_obj.date() - today_obj.date()).days
            
            credit_card_valor_list.append({
                "transaction_id": payment["id"],
                "date": payment.get("date"),
                "valor_date": payment.get("valor_date"),
                "original_amount": payment.get("amount", 0),
                "commission_amount": payment.get("commission_amount", 0),
                "net_amount": payment.get("net_amount", 0),
                "currency": payment.get("currency", "TRY"),
                "days_remaining": days_remaining
            })
    
    # Çek/Senet listesi
    check_promissory_list = await db.check_promissories.find(
        {"cari_id": cari_id, "company_id": current_user["company_id"], "is_collected": False},
        {"_id": 0}
    ).sort("due_date", 1).to_list(100)
    
    # Online ödeme ve Mail order valör listeleri
    online_payment_valor_list = []
    mail_order_valor_list = []
    
    for payment in online_payment_payments:
        if payment.get("valor_date") and not payment.get("is_settled"):
            valor_date_obj = datetime.strptime(payment.get("valor_date"), "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (valor_date_obj.date() - today_obj.date()).days
            
            online_payment_valor_list.append({
                "transaction_id": payment["id"],
                "date": payment.get("date"),
                "valor_date": payment.get("valor_date"),
                "original_amount": payment.get("amount", 0),
                "commission_amount": payment.get("commission_amount", 0),
                "net_amount": payment.get("net_amount", 0),
                "currency": payment.get("currency", "TRY"),
                "days_remaining": days_remaining
            })
    
    for payment in mail_order_payments:
        if payment.get("valor_date") and not payment.get("is_settled"):
            valor_date_obj = datetime.strptime(payment.get("valor_date"), "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (valor_date_obj.date() - today_obj.date()).days
            
            mail_order_valor_list.append({
                "transaction_id": payment["id"],
                "date": payment.get("date"),
                "valor_date": payment.get("valor_date"),
                "original_amount": payment.get("amount", 0),
                "commission_amount": payment.get("commission_amount", 0),
                "net_amount": payment.get("net_amount", 0),
                "currency": payment.get("currency", "TRY"),
                "days_remaining": days_remaining
            })
    
    # Check/Promissory valör listesi - vade tarihi geçmemiş olanlar
    for item in check_promissory_list:
        check = item.get("transaction") or item
        due_date = check.get("due_date") or item.get("due_date")
        is_collected = item.get("is_collected", False)
        
        if due_date:
            due_date_obj = datetime.strptime(due_date, "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (due_date_obj.date() - today_obj.date()).days
            
            # Vade tarihi geçmemişse veya henüz tahsil edilmemişse listeye ekle
            if days_remaining > 0 or not is_collected:
                # Transaction'dan time bilgisini al
                transaction = item.get("transaction", {})
                check_promissory_valor_list.append({
                    "check_id": item.get("id"),
                    "transaction_id": check.get("id") or item.get("transaction_id"),
                    "date": check.get("date") or item.get("date"),
                    "time": transaction.get("time") or check.get("time") or item.get("time"),
                    "due_date": due_date,
                    "amount": check.get("amount") or item.get("amount", 0),
                    "currency": check.get("currency") or item.get("currency", "TRY"),
                    "days_remaining": days_remaining,
                    "check_number": item.get("check_number", ""),
                    "bank_name": item.get("bank_name", ""),
                    "cari_name": item.get("cari_name"),
                    "is_collected": is_collected
                })
    
    # Valör listelerini tarihe göre sırala (en yakın tarih en üstte)
    credit_card_valor_list.sort(key=lambda x: x["valor_date"])
    online_payment_valor_list.sort(key=lambda x: x["valor_date"])
    mail_order_valor_list.sort(key=lambda x: x["valor_date"])
    check_promissory_valor_list.sort(key=lambda x: x["due_date"])
    
    return {
        "cari": cari,
        "transactions": transactions,
        "total_collected": total_collected,
        "current_available": current_available,
        "pending_due": pending_due,
        "cash_payments": cash_payments,
        "bank_transfer_payments": bank_transfer_payments,
        "credit_card_payments": credit_card_payments,
        "credit_card_valor_list": credit_card_valor_list,
        "check_promissory_list": check_promissory_list,
        "online_payment_payments": online_payment_payments,
        "online_payment_valor_list": online_payment_valor_list,
        "mail_order_payments": mail_order_payments,
        "mail_order_valor_list": mail_order_valor_list
    }

@api_router.get("/cash/detail")
async def get_cash_detail(current_user: dict = Depends(get_current_user)):
    """Kasa detay - Tüm kasa hesapları ve istatistikler"""
    # Tüm kasa hesapları
    cash_accounts = await db.cash_accounts.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    # Nakit kasalar
    cash_accounts_list = [acc for acc in cash_accounts if acc.get("account_type") == "cash"]
    # Banka hesabı kasaları
    bank_accounts_list = [acc for acc in cash_accounts if acc.get("account_type") == "bank_account"]
    # Kredi kartı kasaları
    credit_card_accounts_list = [acc for acc in cash_accounts if acc.get("account_type") == "credit_card"]
    
    # Toplam tahsil edilmiş tutarlar (tüm payment transaction'ları)
    total_collected = {"EUR": 0, "USD": 0, "TRY": 0}
    # Toplam tutarlar (tüm kasalar)
    total_amounts = {"EUR": 0, "USD": 0, "TRY": 0}
    # Kullanılabilir tutarlar (valör süresi dolmuş)
    available_amounts = {"EUR": 0, "USD": 0, "TRY": 0}
    # Vadede ki tutarlar (valör süresi bekleyen)
    pending_amounts = {"EUR": 0, "USD": 0, "TRY": 0}
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Sadece tahsilat ekle aksiyonundan gelen payment transaction'larını al
    # payment_method olan ve reference_type "outgoing_payment" olmayan transaction'lar
    query = {
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "payment_method": {"$exists": True, "$ne": None}  # payment_method olanlar (tahsilat ekle aksiyonundan gelenler)
    }
    
    # reference_type kontrolü: "outgoing_payment" olmayanlar veya reference_type yok
    query["$or"] = [
        {"reference_type": {"$ne": "outgoing_payment"}},
        {"reference_type": {"$exists": False}},
        {"reference_type": None}
    ]
    
    all_payment_transactions = await db.transactions.find(
        query,
        {"_id": 0}
    ).to_list(10000)
    
    
    # Toplam tahsil edilmiş tutarları hesapla
    for transaction in all_payment_transactions:
        currency = transaction.get("currency", "TRY")
        amount = transaction.get("amount", 0)
        total_collected[currency] += amount
    
    # Ödeme tipine göre transaction'ları grupla
    cash_payments = []
    bank_transfer_payments = []
    credit_card_payments = []
    online_payment_payments = []
    mail_order_payments = []
    check_promissory_list = []
    
    # Tüm payment transaction'larını payment_method'a göre filtrele
    for transaction in all_payment_transactions:
        payment_method = transaction.get("payment_method")
        cash_account_id = transaction.get("cash_account_id")
        
        # Payment type bilgisini al
        payment_type_id = transaction.get("payment_type_id")
        payment_type = None
        if payment_type_id:
            payment_type = await db.payment_types.find_one({"id": payment_type_id}, {"_id": 0})
        
        # payment_code: önce payment_type'tan, yoksa payment_method'tan al
        payment_code = None
        if payment_type:
            payment_code = payment_type.get("code")
        if not payment_code and payment_method:
            payment_code = payment_method
        
        # Eğer hala payment_code yoksa, bu transaction'ı atla
        if not payment_code:
            continue
        
        # Ödeme tipine göre grupla
        if payment_code == "cash" or payment_code == "exchange" or payment_code == "transfer":
            # Cari bilgisini ekle (exchange ve transfer için cari yok)
            if payment_code == "cash":
                cari_id = transaction.get("cari_id")
                if cari_id:
                    cari = await db.cari_accounts.find_one({"id": cari_id}, {"_id": 0})
                    if cari:
                        transaction["cari_name"] = cari.get("name")
            cash_payments.append(transaction)
        elif payment_code == "bank_transfer":
            # Cari ve banka hesabı bilgisini ekle
            cari_id = transaction.get("cari_id")
            if cari_id:
                cari = await db.cari_accounts.find_one({"id": cari_id}, {"_id": 0})
                if cari:
                    transaction["cari_name"] = cari.get("name")
            bank_account_id = transaction.get("bank_account_id")
            if bank_account_id:
                bank_account = await db.bank_accounts.find_one({"id": bank_account_id}, {"_id": 0})
                if bank_account:
                    transaction["bank_account_name"] = bank_account.get("account_name")
                    transaction["bank_name"] = bank_account.get("bank_name")
            bank_transfer_payments.append(transaction)
        elif payment_code == "credit_card":
            # Cari ve kredi kartı bilgisini ekle
            cari_id = transaction.get("cari_id")
            if cari_id:
                cari = await db.cari_accounts.find_one({"id": cari_id}, {"_id": 0})
                if cari:
                    transaction["cari_name"] = cari.get("name")
            bank_account_id = transaction.get("bank_account_id")
            if bank_account_id:
                bank_account = await db.bank_accounts.find_one({"id": bank_account_id}, {"_id": 0})
                if bank_account:
                    transaction["bank_account_name"] = bank_account.get("account_name")
                    transaction["bank_name"] = bank_account.get("bank_name")
                    # Banka tanımlamalarından komisyon ve valör bilgilerini dinamik olarak ekle
                    transaction["commission_rate"] = bank_account.get("commission_rate")
                    transaction["valor_days"] = bank_account.get("valor_days")
            credit_card_payments.append(transaction)
        elif payment_code == "online_payment":
            online_payment_payments.append(transaction)
        elif payment_code == "mail_order":
            mail_order_payments.append(transaction)
        elif payment_code == "check_promissory":
            # Check/Promissory kaydını al
            check = await db.check_promissories.find_one(
                {"transaction_id": transaction.get("id")},
                {"_id": 0}
            )
            if check:
                # Cari bilgisini ekle
                cari_id = transaction.get("cari_id")
                if cari_id:
                    cari = await db.cari_accounts.find_one({"id": cari_id}, {"_id": 0})
                    if cari:
                        check["cari_name"] = cari.get("name")
                # Transaction'dan date ve time bilgilerini ekle
                check_promissory_list.append({
                    **check,
                    "transaction": transaction,
                    "date": transaction.get("date") or check.get("date"),
                    "time": transaction.get("time") or check.get("time")
                })
    
    # Kullanılabilir ve vadedeki tutarları hesapla (payment_method'a göre)
    for transaction in all_payment_transactions:
        payment_method = transaction.get("payment_method")
        payment_type_id = transaction.get("payment_type_id")
        payment_type = None
        if payment_type_id:
            payment_type = await db.payment_types.find_one({"id": payment_type_id}, {"_id": 0})
        
        # payment_code: önce payment_type'tan, yoksa payment_method'tan al
        payment_code = None
        if payment_type:
            payment_code = payment_type.get("code")
        if not payment_code and payment_method:
            payment_code = payment_method
        
        # Eğer hala payment_code yoksa, bu transaction'ı atla
        if not payment_code:
            continue
        
        # transfer_to_cari, write_off ve check_promissory hariç (check_promissory vade tarihine göre)
        if payment_code in ["transfer_to_cari", "write_off"]:
            continue
        
        currency = transaction.get("currency", "TRY")
        amount = transaction.get("net_amount") or transaction.get("amount", 0)
        valor_date = transaction.get("valor_date")
        is_settled = transaction.get("is_settled", True)
        
        # Exchange ve Transfer transaction'ları için direkt kullanılabilir tutarlara ekle (valör süresi yok)
        if payment_code == "exchange" or payment_code == "transfer":
            available_amounts[currency] += amount
            total_amounts[currency] += amount
            continue
        
        # Check/Promissory için vade tarihini kontrol et
        if payment_code == "check_promissory":
            check = await db.check_promissories.find_one(
                {"transaction_id": transaction.get("id")},
                {"_id": 0}
            )
            if check:
                due_date = check.get("due_date")
                is_collected = check.get("is_collected", False)
                if due_date:
                    if due_date <= today and is_collected:
                        # Vade geçmiş ve tahsil edilmiş - kullanılabilir
                        available_amounts[currency] += amount
                    elif due_date > today or not is_collected:
                        # Vade bekleniyor - vadedeki
                        pending_amounts[currency] += amount
                total_amounts[currency] += amount
        elif payment_code == "credit_card":
            # Kredi kartı ödemeleri için valör süresi ve komisyon mantığı (bank_account tanımlamalarından dinamik)
            bank_account_id = transaction.get("bank_account_id")
            # Banka hesabı tanımlamalarından güncel komisyon ve valör bilgilerini al
            if bank_account_id:
                bank_account = await db.bank_accounts.find_one({"id": bank_account_id}, {"_id": 0})
                if bank_account:
                    # Eğer transaction'da commission_amount yoksa, bank_account tanımlamalarından hesapla
                    if transaction.get("commission_amount") is None and bank_account.get("commission_rate"):
                        commission_rate = bank_account.get("commission_rate")
                        transaction["commission_amount"] = (amount * commission_rate) / 100
                        transaction["net_amount"] = amount - transaction["commission_amount"]
                    # Eğer transaction'da valor_date yoksa ama bank_account'ta valor_days varsa, hesapla
                    if not valor_date and bank_account.get("valor_days"):
                        valor_days = bank_account.get("valor_days")
                        from datetime import timedelta
                        transaction_date = datetime.strptime(transaction.get("date"), "%Y-%m-%d")
                        valor_date = (transaction_date + timedelta(days=valor_days)).strftime("%Y-%m-%d")
                        transaction["valor_date"] = valor_date
            
            total_amounts[currency] += amount
            
            # Valör tarihi varsa ve henüz geçmemişse vadedeki tutara ekle
            if valor_date and valor_date > today:
                # Valör süresi dolmamış - vadedeki tutara ekle (net_amount kullan)
                net_amount = transaction.get("net_amount") or amount
                pending_amounts[currency] += net_amount
            elif valor_date and valor_date <= today:
                # Valör süresi dolmuş - kullanılabilir tutara ekle (komisyon düşülmüş net_amount)
                net_amount = transaction.get("net_amount") or amount
                available_amounts[currency] += net_amount
            elif not valor_date:
                # Valör tarihi yoksa - kullanılabilir tutara ekle (komisyon düşülmüş net_amount)
                net_amount = transaction.get("net_amount") or amount
                available_amounts[currency] += net_amount
            else:
                # Henüz settle edilmemiş - vadedeki tutara ekle
                net_amount = transaction.get("net_amount") or amount
                pending_amounts[currency] += net_amount
        else:
            # Diğer ödeme tipleri için valör tarihine göre
            total_amounts[currency] += amount
            
            # Nakit ve Havale ödemeleri doğrudan kullanılabilir (valör yok)
            if payment_code == "cash" or payment_code == "bank_transfer":
                available_amounts[currency] += amount
            elif is_settled and (not valor_date or valor_date <= today):
                available_amounts[currency] += amount
            else:
                pending_amounts[currency] += amount
    
    # Her kasa hesabı için transaction'ları hesapla (account detayları için)
    for account in cash_accounts:
        currency = account.get("currency", "TRY")
        account_id = account["id"]
        
        # Bu hesaba ait tüm transaction'lar
        transactions = await db.transactions.find(
            {"cash_account_id": account_id},
            {"_id": 0}
        ).to_list(10000)
        
        account_total = 0
        account_available = 0
        account_pending = 0
        
        # Ödeme tipine göre transaction'ları filtrele
        for transaction in transactions:
            if transaction.get("transaction_type") != "payment":
                continue
                
            amount = transaction.get("net_amount") or transaction.get("amount", 0)
            valor_date = transaction.get("valor_date")
            is_settled = transaction.get("is_settled", True)
            
            account_total += amount
            
            if is_settled and (not valor_date or valor_date <= today):
                account_available += amount
            else:
                account_pending += amount
        
        # Account'a ekle
        account["total"] = account_total
        account["available"] = account_available
        account["pending"] = account_pending
    
    # Valör listelerini oluştur
    credit_card_valor_list = []
    online_payment_valor_list = []
    mail_order_valor_list = []
    check_promissory_valor_list = []
    
    # Kredi kartı valör listesi - valör tarihi geçmemiş veya is_settled false olanlar
    for payment in credit_card_payments:
        valor_date = payment.get("valor_date")
        is_settled = payment.get("is_settled", False)
        bank_account_id = payment.get("bank_account_id")
        
        # Banka hesabı tanımlamalarından komisyon ve valör bilgilerini dinamik olarak al
        commission_rate = payment.get("commission_rate")  # Zaten transaction'a eklenmiş
        valor_days = payment.get("valor_days")  # Zaten transaction'a eklenmiş
        
        # Eğer transaction'da yoksa, bank_account'tan al
        if bank_account_id and (commission_rate is None or valor_days is None):
            bank_account = await db.bank_accounts.find_one({"id": bank_account_id}, {"_id": 0})
            if bank_account:
                if commission_rate is None:
                    commission_rate = bank_account.get("commission_rate")
                if valor_days is None:
                    valor_days = bank_account.get("valor_days")
        
        # Valör tarihi varsa ve henüz geçmemişse listeye ekle
        if valor_date:
            valor_date_obj = datetime.strptime(valor_date, "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (valor_date_obj.date() - today_obj.date()).days
            
            # Valör tarihi geçmemişse listeye ekle
            if days_remaining > 0:
                credit_card_valor_list.append({
                    "transaction_id": payment["id"],
                    "date": payment.get("date"),
                    "time": payment.get("time"),
                    "valor_date": valor_date,
                    "original_amount": payment.get("amount", 0),
                    "commission_amount": payment.get("commission_amount", 0),
                    "net_amount": payment.get("net_amount", 0),
                    "currency": payment.get("currency", "TRY"),
                    "days_remaining": days_remaining,
                    "cash_account_id": payment.get("cash_account_id"),
                    "bank_account_id": bank_account_id,
                    "cari_name": payment.get("cari_name"),
                    "bank_account_name": payment.get("bank_account_name"),
                    "commission_rate": commission_rate,  # Banka tanımlamalarından dinamik
                    "valor_days": valor_days  # Banka tanımlamalarından dinamik
                })
    
    # Online ödeme valör listesi
    for payment in online_payment_payments:
        if payment.get("valor_date") and not payment.get("is_settled"):
            valor_date_obj = datetime.strptime(payment.get("valor_date"), "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (valor_date_obj.date() - today_obj.date()).days
            
            online_payment_valor_list.append({
                "transaction_id": payment["id"],
                "date": payment.get("date"),
                "time": payment.get("time"),
                "valor_date": payment.get("valor_date"),
                "original_amount": payment.get("amount", 0),
                "commission_amount": payment.get("commission_amount", 0),
                "net_amount": payment.get("net_amount", 0),
                "currency": payment.get("currency", "TRY"),
                "days_remaining": days_remaining,
                "cash_account_id": payment.get("cash_account_id"),
                "bank_account_id": payment.get("bank_account_id")
            })
    
    # Mail order valör listesi
    for payment in mail_order_payments:
        if payment.get("valor_date") and not payment.get("is_settled"):
            valor_date_obj = datetime.strptime(payment.get("valor_date"), "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (valor_date_obj.date() - today_obj.date()).days
            
            mail_order_valor_list.append({
                "transaction_id": payment["id"],
                "date": payment.get("date"),
                "time": payment.get("time"),
                "valor_date": payment.get("valor_date"),
                "original_amount": payment.get("amount", 0),
                "commission_amount": payment.get("commission_amount", 0),
                "net_amount": payment.get("net_amount", 0),
                "currency": payment.get("currency", "TRY"),
                "days_remaining": days_remaining,
                "cash_account_id": payment.get("cash_account_id"),
                "bank_account_id": payment.get("bank_account_id")
            })
    
    # Çek/Senet valör listesi - vade tarihine göre oluştur
    for item in check_promissory_list:
        check = item.get("transaction") or item
        due_date = check.get("due_date")
        is_collected = check.get("is_collected", False)
        
        if due_date:
            due_date_obj = datetime.strptime(due_date, "%Y-%m-%d")
            today_obj = datetime.now(timezone.utc)
            days_remaining = (due_date_obj.date() - today_obj.date()).days
            
            # Vade tarihi geçmemişse veya henüz tahsil edilmemişse listeye ekle
            if days_remaining > 0 or not is_collected:
                transaction = item.get("transaction", {})
                check_promissory_valor_list.append({
                    "check_id": item.get("id"),
                    "transaction_id": transaction.get("id") or item.get("transaction_id"),
                    "date": item.get("date") or transaction.get("date") or check.get("date"),
                    "time": item.get("time") or transaction.get("time") or check.get("time"),
                    "due_date": due_date,
                    "amount": check.get("amount") or item.get("amount", 0),
                    "currency": check.get("currency") or item.get("currency", "TRY"),
                    "days_remaining": days_remaining,
                    "check_number": item.get("check_number", ""),
                    "bank_name": item.get("bank_name", ""),
                    "cari_name": item.get("cari_name") or check.get("cari_name"),
                    "is_collected": is_collected
                })
    
    # Çek/Senet listesini vade tarihine göre sırala (en yakın vade en üstte)
    check_promissory_list.sort(key=lambda x: (x.get("transaction", {}).get("due_date") or x.get("due_date") or "9999-12-31"))
    
    # Valör listelerini tarihe göre sırala (en yakın tarih en üstte)
    credit_card_valor_list.sort(key=lambda x: x["valor_date"])
    online_payment_valor_list.sort(key=lambda x: x["valor_date"])
    mail_order_valor_list.sort(key=lambda x: x["valor_date"])
    check_promissory_valor_list.sort(key=lambda x: x["due_date"])
    
    return {
        "cash_accounts": cash_accounts,
        "cash_accounts_list": cash_accounts_list,
        "bank_accounts_list": bank_accounts_list,
        "credit_card_accounts_list": credit_card_accounts_list,
        "total_collected": total_collected,
        "total_amounts": total_amounts,
        "available_amounts": available_amounts,
        "pending_amounts": pending_amounts,
        "cash_payments": cash_payments,
        "bank_transfer_payments": bank_transfer_payments,
        "credit_card_payments": credit_card_payments,
        "credit_card_valor_list": credit_card_valor_list,
        "online_payment_payments": online_payment_payments,
        "online_payment_valor_list": online_payment_valor_list,
        "mail_order_payments": mail_order_payments,
        "mail_order_valor_list": mail_order_valor_list,
        "check_promissory_list": check_promissory_list,
        "check_promissory_valor_list": check_promissory_valor_list
    }

@api_router.post("/cash/fix-payment-methods")
async def fix_payment_methods(current_user: dict = Depends(get_current_user)):
    """Mevcut transaction'larda payment_method null olanları düzelt"""
    # payment_method null olan transaction'ları bul
    transactions = await db.transactions.find(
        {
            "company_id": current_user["company_id"],
            "transaction_type": "payment",
            "$or": [
                {"payment_method": None},
                {"payment_method": {"$exists": False}}
            ]
        },
        {"_id": 0}
    ).to_list(10000)
    
    fixed_count = 0
    
    for transaction in transactions:
        payment_type_id = transaction.get("payment_type_id")
        if not payment_type_id:
            continue
        
        # payment_type'ı al
        payment_type = await db.payment_types.find_one({"id": payment_type_id}, {"_id": 0})
        if not payment_type:
            continue
        
        payment_code = payment_type.get("code")
        
        # Eğer code yoksa, payment_type_name'den türet
        if not payment_code:
            payment_type_name = payment_type.get("name", "").lower()
            name_to_code_map = {
                "nakit": "cash",
                "havale": "bank_transfer",
                "banka transferi": "bank_transfer",
                "kredi kartı": "credit_card",
                "kredi karti": "credit_card",
                "çek": "check_promissory",
                "senet": "check_promissory",
                "çek/senet": "check_promissory",
                "cariye aktar": "transfer_to_cari",
                "cari aktarma": "transfer_to_cari",
                "mahsup": "write_off",
                "online ödeme": "online_payment",
                "mail order": "mail_order"
            }
            
            payment_code = name_to_code_map.get(payment_type_name)
            
            if not payment_code:
                payment_code = payment_type_name.replace(" ", "_").replace("ş", "s").replace("ç", "c").replace("ğ", "g").replace("ı", "i").replace("ö", "o").replace("ü", "u")
            
            # payment_type MongoDB kaydını güncelle
            await db.payment_types.update_one(
                {"id": payment_type_id},
                {"$set": {"code": payment_code}}
            )
        
        # Transaction'ı güncelle
        await db.transactions.update_one(
            {"id": transaction.get("id")},
            {"$set": {"payment_method": payment_code}}
        )
        fixed_count += 1
    
    return {
        "message": f"{fixed_count} transaction düzeltildi",
        "fixed_count": fixed_count
    }

@api_router.post("/cash/exchange")
async def exchange_currency(
    data: dict,  # { from_currency: str, to_currency: str, amount: float, exchange_rate: float, date: str, from_account_id: str, to_account_id: str }
    current_user: dict = Depends(get_current_user)
):
    """Döviz bozma - Bir kasa hesabından diğerine"""
    from_account = await db.cash_accounts.find_one({
        "id": data.get("from_account_id"),
        "company_id": current_user["company_id"]
    })
    
    if not from_account:
        raise HTTPException(status_code=404, detail="Kaynak kasa hesabı bulunamadı")
    
    to_account = await db.cash_accounts.find_one({
        "id": data.get("to_account_id"),
        "company_id": current_user["company_id"]
    })
    
    if not to_account:
        raise HTTPException(status_code=404, detail="Hedef kasa hesabı bulunamadı")
    
    from_amount = data.get("amount", 0)
    exchange_rate = data.get("exchange_rate", 1.0)
    to_amount = from_amount * exchange_rate
    
    # Kaynak hesaptan düş
    await db.cash_accounts.update_one(
        {"id": from_account["id"]},
        {"$inc": {"current_balance": -from_amount}}
    )
    
    # Hedef hesaba ekle
    await db.cash_accounts.update_one(
        {"id": to_account["id"]},
        {"$inc": {"current_balance": to_amount}}
    )
    
    # Exchange transaction kaydı
    exchange_transaction = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "transaction_type": "exchange",
        "from_account_id": from_account["id"],
        "to_account_id": to_account["id"],
        "from_currency": data.get("from_currency"),
        "to_currency": data.get("to_currency"),
        "from_amount": from_amount,
        "to_amount": to_amount,
        "exchange_rate": exchange_rate,
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    
    # cash_exchanges collection'ı yoksa oluştur (MongoDB otomatik oluşturur)
    await db.cash_exchanges.insert_one(exchange_transaction)
    
    # Hedef hesaba giren tutar için payment transaction oluştur (kasa kartlarına yansısın)
    payment_transaction = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "cash_account_id": to_account["id"],
        "amount": to_amount,
        "net_amount": to_amount,
        "currency": data.get("to_currency"),
        "exchange_rate": 1.0,
        "description": f"Döviz bozma: {from_amount} {data.get('from_currency')} → {to_amount} {data.get('to_currency')}",
        "payment_method": "exchange",
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "time": datetime.now(timezone.utc).strftime("%H:%M"),
        "reference_id": exchange_transaction["id"],
        "reference_type": "exchange",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.transactions.insert_one(payment_transaction)
    
    # Kaynak hesaptan çıkan tutar için negatif payment transaction oluştur
    negative_payment_transaction = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "cash_account_id": from_account["id"],
        "amount": -from_amount,
        "net_amount": -from_amount,
        "currency": data.get("from_currency"),
        "exchange_rate": 1.0,
        "description": f"Döviz bozma: {from_amount} {data.get('from_currency')} → {to_amount} {data.get('to_currency')}",
        "payment_method": "exchange",
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "time": datetime.now(timezone.utc).strftime("%H:%M"),
        "reference_id": exchange_transaction["id"],
        "reference_type": "exchange",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.transactions.insert_one(negative_payment_transaction)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="exchange",
        entity_type="cash_exchange",
        entity_id=exchange_transaction["id"],
        entity_name="Döviz Bozma",
        description=f"Döviz bozma: {from_amount} {data.get('from_currency')} → {to_amount} {data.get('to_currency')} (Kur: {exchange_rate})"
    )
    
    return {"message": "Döviz bozma işlemi tamamlandı"}

@api_router.get("/cash/exchange-history")
async def get_exchange_history(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Döviz bozma geçmişini getir"""
    query = {
        "company_id": current_user["company_id"]
    }
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    if currency:
        query["$or"] = [
            {"from_currency": currency},
            {"to_currency": currency}
        ]
    
    exchanges = await db.cash_exchanges.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Exchange'leri frontend formatına çevir
    result = []
    for exchange in exchanges:
        result.append({
            "id": exchange.get("id"),
            "date": exchange.get("date"),
            "from_currency": exchange.get("from_currency"),
            "to_currency": exchange.get("to_currency"),
            "from_amount": exchange.get("from_amount", 0),
            "to_amount": exchange.get("to_amount", 0),
            "exchange_rate": exchange.get("exchange_rate", 1.0),
            "payment_method": "exchange"  # Frontend'de filtreleme için
        })
    
    return result

@api_router.post("/cash/transfer")
async def transfer_cash(
    data: dict,  # { from_account_id: str, to_account_id: str, amount: float, currency: str, date: str, description: str }
    current_user: dict = Depends(get_current_user)
):
    """Kasa transferi - Bir kasa hesabından diğerine"""
    from_account = await db.cash_accounts.find_one({
        "id": data.get("from_account_id"),
        "company_id": current_user["company_id"]
    })
    
    if not from_account:
        raise HTTPException(status_code=404, detail="Kaynak kasa hesabı bulunamadı")
    
    to_account = await db.cash_accounts.find_one({
        "id": data.get("to_account_id"),
        "company_id": current_user["company_id"]
    })
    
    if not to_account:
        raise HTTPException(status_code=404, detail="Hedef kasa hesabı bulunamadı")
    
    amount = data.get("amount", 0)
    
    if from_account.get("current_balance", 0) < amount:
        raise HTTPException(status_code=400, detail="Yetersiz bakiye")
    
    # Kaynak hesaptan düş
    await db.cash_accounts.update_one(
        {"id": from_account["id"]},
        {"$inc": {"current_balance": -amount}}
    )
    
    # Hedef hesaba ekle
    await db.cash_accounts.update_one(
        {"id": to_account["id"]},
        {"$inc": {"current_balance": amount}}
    )
    
    # Transfer transaction kaydı
    transfer_transaction = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "transaction_type": "transfer",
        "from_account_id": from_account["id"],
        "to_account_id": to_account["id"],
        "amount": amount,
        "currency": data.get("currency", "TRY"),
        "description": data.get("description", "Kasa transferi"),
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    
    # cash_transfers collection'ı yoksa oluştur (MongoDB otomatik oluşturur)
    await db.cash_transfers.insert_one(transfer_transaction)
    
    # Hedef hesaba giren tutar için payment transaction oluştur (kasa kartlarına yansısın)
    payment_transaction = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "cash_account_id": to_account["id"],
        "amount": amount,
        "net_amount": amount,
        "currency": data.get("currency", "TRY"),
        "exchange_rate": 1.0,
        "description": data.get("description", "Kasa transferi"),
        "payment_method": "transfer",
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "time": datetime.now(timezone.utc).strftime("%H:%M"),
        "reference_id": transfer_transaction["id"],
        "reference_type": "transfer",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.transactions.insert_one(payment_transaction)
    
    # Kaynak hesaptan çıkan tutar için negatif payment transaction oluştur
    negative_payment_transaction = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "cash_account_id": from_account["id"],
        "amount": -amount,
        "net_amount": -amount,
        "currency": data.get("currency", "TRY"),
        "exchange_rate": 1.0,
        "description": data.get("description", "Kasa transferi"),
        "payment_method": "transfer",
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "time": datetime.now(timezone.utc).strftime("%H:%M"),
        "reference_id": transfer_transaction["id"],
        "reference_type": "transfer",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.transactions.insert_one(negative_payment_transaction)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="transfer",
        entity_type="cash_transfer",
        entity_id=transfer_transaction["id"],
        entity_name="Kasa Transferi",
        description=f"Kasa transferi: {amount} {data.get('currency', 'TRY')} - {data.get('description', 'Kasa transferi')}"
    )
    
    return {"message": "Transfer işlemi tamamlandı"}

@api_router.post("/cash/process-valor-settlements")
async def process_valor_settlements(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Valör süresi dolan tutarları kasa hesaplarına yerleştir"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Valör süresi dolmuş transaction'ları bul
    transactions = await db.transactions.find({
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "valor_date": {"$lte": date},
        "is_settled": False
    }, {"_id": 0}).to_list(1000)
    
    processed = []
    
    for transaction in transactions:
        cash_account_id = transaction.get("cash_account_id")
        if not cash_account_id:
            continue
        
        net_amount = transaction.get("net_amount") or transaction.get("amount", 0)
        commission_amount = transaction.get("commission_amount", 0)
        cari_id = transaction.get("cari_id")
        payment_method = transaction.get("payment_method")
        bank_account_id = transaction.get("bank_account_id")
        payment_type_id = transaction.get("payment_type_id")
        
        # Payment method'u belirle (payment_method varsa onu kullan, yoksa payment_type'dan al)
        if not payment_method and payment_type_id:
            payment_type = await db.payment_types.find_one({"id": payment_type_id}, {"_id": 0})
            if payment_type:
                payment_method = payment_type.get("code")
        
        # Eğer komisyon tutarı transaction'da yoksa, bank_account tanımlamalarından hesapla
        if commission_amount == 0 and bank_account_id and payment_method == "credit_card":
            bank_account = await db.bank_accounts.find_one({"id": bank_account_id}, {"_id": 0})
            if bank_account and bank_account.get("commission_rate"):
                amount = transaction.get("amount", 0)
                commission_rate = bank_account.get("commission_rate")
                commission_amount = (amount * commission_rate) / 100
        
        # Kasa bakiyesini artır
        await db.cash_accounts.update_one(
            {"id": cash_account_id},
            {"$inc": {"current_balance": net_amount}}
        )
        
        # Eğer komisyon tutarı varsa ve kredi kartı ödemesi ise, gider olarak kaydet
        if commission_amount > 0 and payment_method == "credit_card" and cari_id:
            # "Banka Komisyonu" kategorisini bul veya oluştur
            expense_category = await db.expense_categories.find_one({
                "company_id": current_user["company_id"],
                "name": "Banka Komisyonu"
            }, {"_id": 0})
            
            if not expense_category:
                # Kategori yoksa oluştur
                expense_category_id = str(uuid.uuid4())
                expense_category_doc = {
                    "id": expense_category_id,
                    "company_id": current_user["company_id"],
                    "name": "Banka Komisyonu",
                    "description": "Banka komisyon giderleri",
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.expense_categories.insert_one(expense_category_doc)
            else:
                expense_category_id = expense_category["id"]
            
            # Aynı transaction için daha önce gider kaydı oluşturulmuş mu kontrol et
            existing_expense = await db.expenses.find_one({
                "company_id": current_user["company_id"],
                "reference_type": "commission",
                "reference_id": transaction["id"]
            })
            
            if not existing_expense:
                # Gider kaydı oluştur
                expense_doc = {
                    "id": str(uuid.uuid4()),
                    "company_id": current_user["company_id"],
                    "cari_id": cari_id,
                    "expense_category_id": expense_category_id,
                    "description": f"Banka komisyonu - {transaction.get('description', 'Kredi kartı komisyonu')}",
                    "amount": commission_amount,
                    "currency": transaction.get("currency", "TRY"),
                    "exchange_rate": transaction.get("exchange_rate", 1.0),
                    "date": transaction.get("date", date),
                    "notes": f"Valör süresi dolan kredi kartı ödemesi komisyonu - Transaction ID: {transaction['id']}",
                    "reference_type": "commission",
                    "reference_id": transaction["id"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": current_user["user_id"]
                }
                await db.expenses.insert_one(expense_doc)
        
        # Transaction'ı işaretle
        await db.transactions.update_one(
            {"id": transaction["id"]},
            {"$set": {
                "is_settled": True,
                "settled_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        processed.append({
            "transaction_id": transaction["id"],
            "amount": net_amount,
            "currency": transaction.get("currency", "TRY")
        })
    
    return {
        "message": f"{len(processed)} tutar yerleştirildi",
        "processed": processed
    }

# ==================== VEHICLES / INVENTORY ====================

@api_router.get("/inventory")
async def get_inventory(
    category_id: Optional[str] = None,
    warning_type: Optional[str] = None,  # 'expired', '1month', '3months'
    current_user: dict = Depends(get_current_user)
):
    """Araç envanterini getir - kategoriler ve uyarılar ile"""
    query = {"company_id": current_user["company_id"]}
    
    if category_id:
        query["category_id"] = category_id
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).sort("plate_number", 1).to_list(1000)
    
    # Kategorileri populate et
    categories = await db.vehicle_categories.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(100)
    category_map = {cat["id"]: cat["name"] for cat in categories}
    
    # Uyarıları hesapla
    today = datetime.now(timezone.utc).date()
    result = []
    
    for vehicle in vehicles:
        warnings = []
        
        # Sigorta uyarısı
        if vehicle.get("insurance_expiry"):
            expiry_date = datetime.strptime(vehicle["insurance_expiry"], "%Y-%m-%d").date()
            days_left = (expiry_date - today).days
            
            if days_left < 0:
                warnings.append({"type": "insurance", "status": "expired", "days": days_left})
            elif days_left <= 30:
                warnings.append({"type": "insurance", "status": "1month", "days": days_left})
            elif days_left <= 90:
                warnings.append({"type": "insurance", "status": "3months", "days": days_left})
        
        # Muayene uyarısı
        if vehicle.get("inspection_expiry"):
            expiry_date = datetime.strptime(vehicle["inspection_expiry"], "%Y-%m-%d").date()
            days_left = (expiry_date - today).days
            
            if days_left < 0:
                warnings.append({"type": "inspection", "status": "expired", "days": days_left})
            elif days_left <= 30:
                warnings.append({"type": "inspection", "status": "1month", "days": days_left})
            elif days_left <= 90:
                warnings.append({"type": "inspection", "status": "3months", "days": days_left})
        
        # Uyarı filtreleme
        if warning_type:
            if warning_type == "expired":
                warnings = [w for w in warnings if w["status"] == "expired"]
            elif warning_type == "1month":
                warnings = [w for w in warnings if w["status"] in ["expired", "1month"]]
            elif warning_type == "3months":
                warnings = [w for w in warnings if w["status"] in ["expired", "1month", "3months"]]
            
            if not warnings:
                continue  # Bu uyarı filtresine uymuyor, atla
        
        vehicle["warnings"] = warnings
        vehicle["category_name"] = category_map.get(vehicle.get("category_id"), vehicle.get("vehicle_type", "Diğer"))
        result.append(vehicle)
    
    return result

@api_router.get("/inventory/statistics")
async def get_inventory_statistics(current_user: dict = Depends(get_current_user)):
    """Envanter istatistiklerini getir"""
    # Kategori bazlı araç sayıları
    categories = await db.vehicle_categories.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    category_stats = []
    total_vehicles = 0
    
    for category in categories:
        count = await db.vehicles.count_documents({
            "company_id": current_user["company_id"],
            "category_id": category["id"]
        })
        category_stats.append({
            "category_id": category["id"],
            "category_name": category["name"],
            "count": count
        })
        total_vehicles += count
    
    # Kategorisiz araçlar
    uncategorized_count = await db.vehicles.count_documents({
        "company_id": current_user["company_id"],
        "$or": [
            {"category_id": {"$exists": False}},
            {"category_id": None}
        ]
    })
    if uncategorized_count > 0:
        category_stats.append({
            "category_id": None,
            "category_name": "Kategorisiz",
            "count": uncategorized_count
        })
        total_vehicles += uncategorized_count
    
    # Uyarı istatistikleri
    today = datetime.now(timezone.utc).date()
    vehicles = await db.vehicles.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0, "insurance_expiry": 1, "inspection_expiry": 1}
    ).to_list(1000)
    
    expired_count = 0
    one_month_count = 0
    three_months_count = 0
    vehicles_with_warnings = set()
    
    for vehicle in vehicles:
        for expiry_field in ["insurance_expiry", "inspection_expiry"]:
            if vehicle.get(expiry_field):
                expiry_date = datetime.strptime(vehicle[expiry_field], "%Y-%m-%d").date()
                days_left = (expiry_date - today).days
                
                if days_left < 0:
                    expired_count += 1
                    vehicles_with_warnings.add(vehicle.get("id"))
                    break
                elif days_left <= 30:
                    one_month_count += 1
                    vehicles_with_warnings.add(vehicle.get("id"))
                    break
                elif days_left <= 90:
                    three_months_count += 1
                    vehicles_with_warnings.add(vehicle.get("id"))
                    break
    
    return {
        "total_vehicles": total_vehicles,
        "category_stats": category_stats,
        "warning_stats": {
            "expired": expired_count,
            "one_month": one_month_count,
            "three_months": three_months_count,
            "total_warnings": len(vehicles_with_warnings)
        }
    }

@api_router.post("/inventory")
async def create_vehicle_inventory(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Yeni araç ekle"""
    # Eğer category_id varsa ve vehicle_type yoksa, kategori adını vehicle_type olarak kullan
    if data.get("category_id") and not data.get("vehicle_type"):
        category = await db.vehicle_categories.find_one({
            "id": data["category_id"],
            "company_id": current_user["company_id"]
        })
        if category:
            data["vehicle_type"] = category.get("name", "Diğer")
    
    # Eğer hiç vehicle_type yoksa varsayılan değer
    if not data.get("vehicle_type"):
        data["vehicle_type"] = "Diğer"
    
    vehicle = Vehicle(company_id=current_user["company_id"], **data)
    vehicle_doc = vehicle.model_dump()
    vehicle_doc['created_at'] = vehicle_doc['created_at'].isoformat()
    await db.vehicles.insert_one(vehicle_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="create",
        entity_type="vehicle",
        entity_id=vehicle.id,
        entity_name=f"{vehicle.plate_number}",
        description=f"Yeni araç eklendi: {vehicle.plate_number}",
        changes=data
    )
    
    return vehicle

@api_router.put("/inventory/{vehicle_id}")
async def update_vehicle_inventory(
    vehicle_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Aracı güncelle"""
    existing = await db.vehicles.find_one({
        "id": vehicle_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    # Eğer category_id güncelleniyorsa ve vehicle_type yoksa, kategori adını vehicle_type olarak kullan
    if data.get("category_id") and not data.get("vehicle_type"):
        category = await db.vehicle_categories.find_one({
            "id": data["category_id"],
            "company_id": current_user["company_id"]
        })
        if category:
            data["vehicle_type"] = category.get("name", existing.get("vehicle_type", "Diğer"))
    
    result = await db.vehicles.update_one(
        {"id": vehicle_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="vehicle",
        entity_id=vehicle_id,
        entity_name=existing.get("plate_number", "Araç"),
        description=f"Araç güncellendi: {existing.get('plate_number', '')}",
        changes=data
    )
    
    return {"message": "Araç güncellendi"}

@api_router.delete("/inventory/{vehicle_id}")
async def delete_vehicle_inventory(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Aracı sil"""
    existing = await db.vehicles.find_one({
        "id": vehicle_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    result = await db.vehicles.delete_one({
        "id": vehicle_id,
        "company_id": current_user["company_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="vehicle",
        entity_id=vehicle_id,
        entity_name=existing.get("plate_number", "Araç"),
        description=f"Araç silindi: {existing.get('plate_number', '')}"
    )
    
    return {"message": "Araç silindi"}

# ==================== VEHICLES (Backward Compatibility) ====================

@api_router.get("/vehicles")
async def get_vehicles(filter_days: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Araçları getir (backward compatibility)"""
    vehicles = await db.vehicles.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    
    if filter_days:
        from datetime import date, timedelta
        threshold_date = (date.today() + timedelta(days=filter_days)).isoformat()
        filtered = []
        for v in vehicles:
            if v.get("insurance_expiry") and v["insurance_expiry"] <= threshold_date:
                filtered.append(v)
            elif v.get("inspection_expiry") and v["inspection_expiry"] <= threshold_date:
                filtered.append(v)
        return filtered
    
    return vehicles

@api_router.post("/vehicles")
async def create_vehicle(data: dict, current_user: dict = Depends(get_current_user)):
    """Araç oluştur (backward compatibility)"""
    vehicle = Vehicle(company_id=current_user["company_id"], **data)
    vehicle_doc = vehicle.model_dump()
    vehicle_doc['created_at'] = vehicle_doc['created_at'].isoformat()
    await db.vehicles.insert_one(vehicle_doc)
    return vehicle

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Araç güncelle (backward compatibility)"""
    result = await db.vehicles.update_one(
        {"id": vehicle_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle updated"}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Araç sil (backward compatibility)"""
    result = await db.vehicles.delete_one({"id": vehicle_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

# ==================== STAFF ROLES ====================

@api_router.get("/staff-roles")
async def get_staff_roles(current_user: dict = Depends(get_current_user)):
    """Personel rollerini getir"""
    roles = await db.staff_roles.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return roles

@api_router.post("/staff-roles")
async def create_staff_role(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Yeni personel rolü oluştur"""
    role = StaffRole(company_id=current_user["company_id"], **data)
    role_doc = role.model_dump()
    role_doc['created_at'] = role_doc['created_at'].isoformat()
    await db.staff_roles.insert_one(role_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="create",
        entity_type="staff_role",
        entity_id=role.id,
        entity_name=role.name,
        description=f"Yeni personel rolü oluşturuldu: {role.name}",
        changes=data
    )
    
    return role

@api_router.put("/staff-roles/{role_id}")
async def update_staff_role(
    role_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Personel rolünü güncelle"""
    existing = await db.staff_roles.find_one({
        "id": role_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    
    result = await db.staff_roles.update_one(
        {"id": role_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="staff_role",
        entity_id=role_id,
        entity_name=existing.get("name", "Personel Rolü"),
        description=f"Personel rolü güncellendi: {existing.get('name', '')}",
        changes=data
    )
    
    return {"message": "Rol güncellendi"}

@api_router.delete("/staff-roles/{role_id}")
async def delete_staff_role(
    role_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Personel rolünü sil"""
    # Bu role ait personel var mı kontrol et
    staff_count = await db.users.count_documents({
        "company_id": current_user["company_id"],
        "role_id": role_id
    })
    
    if staff_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Bu role ait {staff_count} personel bulunmaktadır. Önce personelleri silin veya rollerini değiştirin."
        )
    
    existing = await db.staff_roles.find_one({
        "id": role_id,
        "company_id": current_user["company_id"]
    })
    
    result = await db.staff_roles.delete_one({
        "id": role_id,
        "company_id": current_user["company_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="delete",
        entity_type="staff_role",
        entity_id=role_id,
        entity_name=existing.get("name", "Personel Rolü") if existing else "Personel Rolü",
        description=f"Personel rolü silindi: {existing.get('name', '') if existing else ''}"
    )
    
    return {"message": "Rol silindi"}

# ==================== USERS (PERSONNEL) ====================

@api_router.get("/users")
async def get_users(
    role_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Personelleri getir - roller ve filtreleme ile"""
    query = {"company_id": current_user["company_id"]}
    
    if role_id:
        query["role_id"] = role_id
    
    if is_active is not None:
        query["is_active"] = is_active
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).sort("full_name", 1).to_list(1000)
    
    # Rolleri populate et
    roles = await db.staff_roles.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(100)
    role_map = {role["id"]: role for role in roles}
    
    for user in users:
        if user.get("role_id"):
            role = role_map.get(user["role_id"])
            if role:
                user["role_name"] = role.get("name")
                user["role_color"] = role.get("color", "#3EA6FF")
    
    return users

@api_router.get("/users/statistics")
async def get_user_statistics(current_user: dict = Depends(get_current_user)):
    """Personel istatistiklerini getir"""
    # Rol bazlı personel sayıları
    roles = await db.staff_roles.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    role_stats = []
    total_active = 0
    total_inactive = 0
    
    for role in roles:
        active_count = await db.users.count_documents({
            "company_id": current_user["company_id"],
            "role_id": role["id"],
            "is_active": True
        })
        inactive_count = await db.users.count_documents({
            "company_id": current_user["company_id"],
            "role_id": role["id"],
            "is_active": False
        })
        
        role_stats.append({
            "role_id": role["id"],
            "role_name": role["name"],
            "role_color": role.get("color", "#3EA6FF"),
            "active_count": active_count,
            "inactive_count": inactive_count,
            "total_count": active_count + inactive_count
        })
        
        total_active += active_count
        total_inactive += inactive_count
    
    # Kategorisiz personeller
    uncategorized_active = await db.users.count_documents({
        "company_id": current_user["company_id"],
        "$or": [
            {"role_id": {"$exists": False}},
            {"role_id": None}
        ],
        "is_active": True
    })
    uncategorized_inactive = await db.users.count_documents({
        "company_id": current_user["company_id"],
        "$or": [
            {"role_id": {"$exists": False}},
            {"role_id": None}
        ],
        "is_active": False
    })
    if uncategorized_active > 0 or uncategorized_inactive > 0:
        role_stats.append({
            "role_id": None,
            "role_name": "Kategorisiz",
            "role_color": "#A5A5A5",
            "active_count": uncategorized_active,
            "inactive_count": uncategorized_inactive,
            "total_count": uncategorized_active + uncategorized_inactive
        })
        total_active += uncategorized_active
        total_inactive += uncategorized_inactive
    
    # Web panel aktif personel sayısı
    web_panel_active = await db.users.count_documents({
        "company_id": current_user["company_id"],
        "web_panel_active": True,
        "is_active": True
    })
    
    return {
        "total_active": total_active,
        "total_inactive": total_inactive,
        "total_staff": total_active + total_inactive,
        "web_panel_active": web_panel_active,
        "role_stats": role_stats
    }

@api_router.post("/users")
async def create_user(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni personel oluştur"""
    # Validation
    if not data.get("full_name"):
        raise HTTPException(status_code=400, detail="Ad Soyad zorunludur")
    
    # Web panel aktifse username ve password zorunlu
    if data.get("web_panel_active"):
        if not data.get("username"):
            raise HTTPException(status_code=400, detail="Web panel aktifse kullanıcı adı zorunludur")
        if not data.get("password"):
            raise HTTPException(status_code=400, detail="Web panel aktifse şifre zorunludur")
        
        # Username kontrolü
        existing = await db.users.find_one({"username": data["username"]})
        if existing:
            raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kullanılıyor")
    
    # User oluştur
    user_data = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "full_name": data["full_name"],
        "email": data.get("email"),
        "phone": data.get("phone"),
        "address": data.get("address"),
        "role_id": data.get("role_id"),
        "tc_no": data.get("tc_no"),
        "birth_date": data.get("birth_date"),
        "gender": data.get("gender"),
        "nationality": data.get("nationality"),
        "emergency_contact_name": data.get("emergency_contact_name"),
        "emergency_contact_phone": data.get("emergency_contact_phone"),
        "employee_id": data.get("employee_id"),
        "hire_date": data.get("hire_date"),
        "termination_date": data.get("termination_date"),
        "is_active": data.get("is_active", True),
        "gross_salary": data.get("gross_salary"),
        "net_salary": data.get("net_salary"),
        "salary_currency": data.get("salary_currency", "TRY"),
        "advance_limit": data.get("advance_limit"),
        "languages": data.get("languages", []),
        "skills": data.get("skills", []),
        "education_level": data.get("education_level"),
        "education_field": data.get("education_field"),
        "driving_license_class": data.get("driving_license_class"),
        "driving_license_no": data.get("driving_license_no"),
        "driving_license_expiry": data.get("driving_license_expiry"),
        "web_panel_active": data.get("web_panel_active", False),
        "permissions": data.get("permissions", {}),
        "is_admin": data.get("is_admin", False),
        "notes": data.get("notes"),
        "avatar_url": data.get("avatar_url"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None
    }
    
    # Web panel aktifse username ve password ekle
    if data.get("web_panel_active"):
        user_data["username"] = data["username"]
        user_data["password"] = hash_password(data["password"])
    
    await db.users.insert_one(user_data)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="create",
        entity_type="user",
        entity_id=user_data["id"],
        entity_name=user_data["full_name"],
        description=f"Yeni personel oluşturuldu: {user_data['full_name']}",
        changes=data
    )
    
    return {"message": "Personel oluşturuldu", "id": user_data["id"]}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Personeli güncelle"""
    user = await db.users.find_one({"id": user_id, "company_id": current_user["company_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    # Full name validation
    if "full_name" in data and not data["full_name"]:
        raise HTTPException(status_code=400, detail="Ad Soyad zorunludur")
    
    # Web panel aktif ediliyorsa username kontrolü
    if data.get("web_panel_active") and not user.get("username"):
        if not data.get("username"):
            raise HTTPException(status_code=400, detail="Web panel aktifse kullanıcı adı zorunludur")
        if not data.get("password"):
            raise HTTPException(status_code=400, detail="Web panel aktifse şifre zorunludur")
        
        # Username kontrolü
        existing = await db.users.find_one({"username": data["username"], "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kullanılıyor")
    
    # Şifre güncelleme
    if "password" in data and data["password"]:
        data["password"] = hash_password(data["password"])
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="user",
        entity_id=user_id,
        entity_name=user.get("full_name", "Personel"),
        description=f"Personel güncellendi: {user.get('full_name', '')}",
        changes=data
    )
    
    return {"message": "Personel güncellendi"}

@api_router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: dict = Depends(get_current_user)):
    """Personelin aktif/pasif durumunu değiştir"""
    user = await db.users.find_one({"id": user_id, "company_id": current_user["company_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    new_status = not user.get("is_active", True)
    
    update_data = {
        "is_active": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Pasif yapılıyorsa işten ayrılma tarihini ekle
    if not new_status and not user.get("termination_date"):
        update_data["termination_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # Web panel erişimini de kapat
        update_data["web_panel_active"] = False
    
    # Aktif yapılıyorsa işten ayrılma tarihini kaldır
    if new_status:
        update_data["termination_date"] = None
    
    await db.users.update_one(
        {"id": user_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="update",
        entity_type="user",
        entity_id=user_id,
        entity_name=user.get("full_name", "Personel"),
        description=f"Personel {'aktif' if new_status else 'pasif'} yapıldı: {user.get('full_name', '')}",
        changes={"is_active": new_status}
    )
    
    return {"message": f"Personel {'aktif' if new_status else 'pasif'} yapıldı", "is_active": new_status}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ==================== DASHBOARD ====================

@api_router.get("/dashboard")
async def get_dashboard(date: str, current_user: dict = Depends(get_current_user)):
    # Get reservations for the date (cancelled hariç tüm rezervasyonlar)
    query = {
        "company_id": current_user["company_id"],
        "date": date,
        "status": {"$ne": "cancelled"}  # Cancelled olanları hariç tut
    }
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("time", 1).to_list(1000)
    
    # Tour type bilgilerini populate et
    for reservation in reservations:
        if reservation.get("tour_type_id"):
            tour_type = await db.tour_types.find_one({"id": reservation["tour_type_id"]})
            if tour_type:
                reservation["tour_type_name"] = tour_type.get("name")
                reservation["duration_hours"] = tour_type.get("duration_hours", 2.0)  # Varsayılan 2 saat
                reservation["tour_type_color"] = tour_type.get("color", "#3EA6FF")  # Varsayılan renk
            else:
                # Tur tipi bulunamazsa varsayılan değerler
                reservation["duration_hours"] = 2.0
                reservation["tour_type_color"] = "#3EA6FF"
        else:
            # Tur tipi yoksa varsayılan değerler
            reservation["duration_hours"] = 2.0
            reservation["tour_type_color"] = "#3EA6FF"
    
    total_atvs = sum(r.get("atv_count", 0) for r in reservations)
    
    return {
        "date": date,
        "total_departures": len(reservations),
        "total_atvs": total_atvs,
        "reservations": reservations
    }

# ==================== ACTIVITY LOGS ====================

@api_router.get("/activity-logs")
async def get_activity_logs(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Activity log kayıtlarını getir"""
    query = {"company_id": current_user["company_id"]}
    
    # Tarih filtresi
    if date_from or date_to:
        date_query = {}
        if date_from:
            # YYYY-MM-DD formatını datetime'a çevir (başlangıç: 00:00:00)
            try:
                date_from_dt = datetime.strptime(date_from, "%Y-%m-%d")
                date_from_dt = date_from_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                # MongoDB için hem datetime hem string formatını destekle
                date_query["$gte"] = date_from_dt
            except Exception as e:
                logging.error(f"Tarih parse hatası (date_from): {e}")
        if date_to:
            # YYYY-MM-DD formatını datetime'a çevir (bitiş: 23:59:59)
            try:
                date_to_dt = datetime.strptime(date_to, "%Y-%m-%d")
                date_to_dt = date_to_dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
                date_query["$lte"] = date_to_dt
            except Exception as e:
                logging.error(f"Tarih parse hatası (date_to): {e}")
        if date_query:
            query["created_at"] = date_query
    
    # Kullanıcı filtresi
    if user_id:
        query["user_id"] = user_id
    
    # Action filtresi
    if action:
        query["action"] = action
    
    # Entity type filtresi
    if entity_type:
        query["entity_type"] = entity_type
    
    # Logları getir (en yeni önce)
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    logging.info(f"Activity logs query: {query}, found {len(logs)} logs")
    
    # ISO format string'leri datetime'a çevir ve ISO formatına geri çevir (frontend için)
    for log in logs:
        if isinstance(log.get("created_at"), str):
            try:
                # String ise parse et
                dt = datetime.fromisoformat(log["created_at"].replace("Z", "+00:00"))
                log["created_at"] = dt.isoformat()
            except Exception as e:
                logging.error(f"Tarih parse hatası (log): {e}, created_at: {log.get('created_at')}")
        elif isinstance(log.get("created_at"), datetime):
            # Datetime ise ISO formatına çevir
            log["created_at"] = log["created_at"].isoformat()
        elif hasattr(log.get("created_at"), 'isoformat'):
            # MongoDB datetime objesi
            log["created_at"] = log["created_at"].isoformat()
    
    return logs

# ==================== REPORTS ====================

from datetime import datetime, timedelta
from collections import defaultdict

@api_router.get("/reports/dashboard")
async def get_dashboard_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Genel Dashboard Raporu"""
    # Varsayılan: son 30 gün
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    # Bugünkü özet
    today = datetime.now().strftime("%Y-%m-%d")
    today_reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": today,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(1000)
    
    today_total_atvs = sum(r.get("atv_count", 0) for r in today_reservations)
    today_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in today_reservations:
        if r.get("price") and r.get("currency"):
            today_revenue[r["currency"]] += r["price"]
    
    # Günlük trend (son 30 gün)
    daily_trend = []
    for i in range(30):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        day_reservations = await db.reservations.find({
            "company_id": current_user["company_id"],
            "date": date,
            "status": {"$ne": "cancelled"}
        }, {"_id": 0}).to_list(1000)
        
        daily_trend.append({
            "date": date,
            "reservations": len(day_reservations),
            "atvs": sum(r.get("atv_count", 0) for r in day_reservations),
            "revenue": sum(r.get("price", 0) for r in day_reservations if r.get("currency") == "EUR")
        })
    
    daily_trend.reverse()
    
    # En çok rezervasyon yapan cari firmalar (top 5)
    cari_stats = defaultdict(lambda: {"count": 0, "revenue": 0})
    all_reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"},
        "cari_id": {"$ne": ""}
    }, {"_id": 0}).to_list(10000)
    
    for r in all_reservations:
        if r.get("cari_id"):
            cari_stats[r["cari_id"]]["count"] += 1
            if r.get("price"):
                cari_stats[r["cari_id"]]["revenue"] += r.get("price", 0)
    
    top_cari = sorted(cari_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    top_cari_list = []
    for cari_id, stats in top_cari:
        cari = await db.cari_accounts.find_one({"id": cari_id}, {"_id": 0})
        if cari:
            top_cari_list.append({
                "cari_name": cari.get("name", ""),
                "reservation_count": stats["count"],
                "revenue": stats["revenue"]
            })
    
    # En çok kullanılan tur tipleri (top 5)
    tour_type_stats = defaultdict(lambda: {"count": 0})
    for r in all_reservations:
        if r.get("tour_type_id"):
            tour_type_stats[r["tour_type_id"]]["count"] += 1
    
    top_tour_types = sorted(tour_type_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    top_tour_types_list = []
    for tour_type_id, stats in top_tour_types:
        tour_type = await db.tour_types.find_one({"id": tour_type_id}, {"_id": 0})
        if tour_type:
            top_tour_types_list.append({
                "tour_type_name": tour_type.get("name", ""),
                "count": stats["count"]
            })
    
    return {
        "today": {
            "total_reservations": len(today_reservations),
            "total_atvs": today_total_atvs,
            "revenue": today_revenue
        },
        "daily_trend": daily_trend,
        "top_cari_accounts": top_cari_list,
        "top_tour_types": top_tour_types_list
    }

@api_router.get("/reports/daily")
async def get_daily_report(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Günlük İşlem Raporu"""
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).sort("time", 1).to_list(1000)
    
    # İstatistikler
    total_customers = len(set(r.get("customer_name", "") for r in reservations if r.get("customer_name")))
    total_atvs = sum(r.get("atv_count", 0) for r in reservations)
    revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in reservations:
        if r.get("price") and r.get("currency"):
            revenue[r["currency"]] += r.get("price", 0)
    
    # Pick-up dağılımı
    pickup_distribution = defaultdict(int)
    for r in reservations:
        if r.get("pickup_location"):
            pickup_distribution[r["pickup_location"]] += 1
    
    # Saatlik dağılım
    hourly_distribution = defaultdict(int)
    for r in reservations:
        if r.get("time"):
            hour = int(r["time"].split(":")[0]) if ":" in r["time"] else 0
            hourly_distribution[hour] += r.get("atv_count", 0)
    
    # Cari firmalara göre dağılım
    cari_distribution = defaultdict(lambda: {"count": 0, "revenue": 0})
    for r in reservations:
        if r.get("cari_id"):
            cari_distribution[r["cari_id"]]["count"] += 1
            if r.get("price"):
                cari_distribution[r["cari_id"]]["revenue"] += r.get("price", 0)
    
    cari_list = []
    for cari_id, stats in cari_distribution.items():
        cari = await db.cari_accounts.find_one({"id": cari_id}, {"_id": 0})
        if cari:
            cari_list.append({
                "cari_name": cari.get("name", ""),
                "count": stats["count"],
                "revenue": stats["revenue"]
            })
    
    # Tur tiplerine göre dağılım
    tour_type_distribution = defaultdict(lambda: {"count": 0, "revenue": 0})
    for r in reservations:
        if r.get("tour_type_id"):
            tour_type_distribution[r["tour_type_id"]]["count"] += 1
            if r.get("price"):
                tour_type_distribution[r["tour_type_id"]]["revenue"] += r.get("price", 0)
    
    tour_type_list = []
    for tour_type_id, stats in tour_type_distribution.items():
        tour_type = await db.tour_types.find_one({"id": tour_type_id}, {"_id": 0})
        if tour_type:
            tour_type_list.append({
                "tour_type_name": tour_type.get("name", ""),
                "count": stats["count"],
                "revenue": stats["revenue"]
            })
    
    return {
        "date": date,
        "total_reservations": len(reservations),
        "total_customers": total_customers,
        "total_atvs": total_atvs,
        "revenue": revenue,
        "reservations": reservations,
        "pickup_distribution": dict(pickup_distribution),
        "hourly_distribution": dict(hourly_distribution),
        "cari_distribution": cari_list,
        "tour_type_distribution": tour_type_list
    }

@api_router.get("/reports/reservations")
async def get_reservations_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tour_type_id: Optional[str] = None,
    cari_id: Optional[str] = None,
    pickup_location: Optional[str] = None,
    currency: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Rezervasyon Raporları"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from and date_to:
        query["date"] = {"$gte": date_from, "$lte": date_to}
    if tour_type_id:
        query["tour_type_id"] = tour_type_id
    if cari_id:
        query["cari_id"] = cari_id
    if pickup_location:
        query["pickup_location"] = pickup_location
    if currency:
        query["currency"] = currency
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "cancelled"}
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("date", -1).sort("time", 1).to_list(10000)
    
    # Toplam istatistikler
    total_atvs = sum(r.get("atv_count", 0) for r in reservations)
    total_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in reservations:
        if r.get("price") and r.get("currency"):
            total_revenue[r["currency"]] += r.get("price", 0)
    
    return {
        "reservations": reservations,
        "total_count": len(reservations),
        "total_atvs": total_atvs,
        "total_revenue": total_revenue
    }

@api_router.get("/reports/customers")
async def get_customers_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    cari_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Müşteri Raporları"""
    query = {"company_id": current_user["company_id"], "status": {"$ne": "cancelled"}}
    
    if date_from and date_to:
        query["date"] = {"$gte": date_from, "$lte": date_to}
    if cari_id:
        query["cari_id"] = cari_id
    
    reservations = await db.reservations.find(query, {"_id": 0}).to_list(10000)
    
    # Müşteri bazlı istatistikler
    customer_stats = defaultdict(lambda: {"count": 0, "revenue": {"EUR": 0, "USD": 0, "TRY": 0}, "cari_name": ""})
    
    for r in reservations:
        customer_name = r.get("customer_name", "Belirtilmedi")
        customer_stats[customer_name]["count"] += 1
        if r.get("price") and r.get("currency"):
            customer_stats[customer_name]["revenue"][r["currency"]] += r.get("price", 0)
        if r.get("cari_id"):
            cari = await db.cari_accounts.find_one({"id": r["cari_id"]}, {"_id": 0})
            if cari:
                customer_stats[customer_name]["cari_name"] = cari.get("name", "")
    
    # Top 10 müşteri
    top_customers = sorted(customer_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    top_customers_list = []
    for customer_name, stats in top_customers:
        total_revenue = sum(stats["revenue"].values())
        avg_revenue = total_revenue / stats["count"] if stats["count"] > 0 else 0
        top_customers_list.append({
            "customer_name": customer_name,
            "reservation_count": stats["count"],
            "total_revenue": stats["revenue"],
            "average_revenue": avg_revenue,
            "cari_name": stats["cari_name"]
        })
    
    return {
        "top_customers": top_customers_list
    }

@api_router.get("/reports/income")
async def get_income_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tour_type_id: Optional[str] = None,
    currency: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gelir Raporu - Tur tipi ve döviz filtreleri ile"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    # Rezervasyon gelirleri - filtrelerle
    reservation_query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }
    if tour_type_id:
        reservation_query["tour_type_id"] = tour_type_id
    if currency:
        reservation_query["currency"] = currency
    
    reservations = await db.reservations.find(reservation_query, {"_id": 0}).to_list(10000)
    
    reservation_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    total_atvs = 0
    for r in reservations:
        if r.get("price") and r.get("currency"):
            reservation_revenue[r["currency"]] += r.get("price", 0)
        total_atvs += r.get("atv_count", 0)
    
    # Extra sales gelirleri
    extra_sales_query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }
    if currency:
        extra_sales_query["currency"] = currency
    
    extra_sales = await db.extra_sales.find(extra_sales_query, {"_id": 0}).to_list(10000)
    
    extra_sales_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for s in extra_sales:
        if s.get("sale_price") and s.get("currency"):
            extra_sales_revenue[s["currency"]] += s.get("sale_price", 0)
    
    # Ekstra gelirler
    income_query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }
    if currency:
        income_query["currency"] = currency
    
    incomes = await db.incomes.find(income_query, {"_id": 0}).to_list(10000)
    
    extra_income = {"EUR": 0, "USD": 0, "TRY": 0}
    for i in incomes:
        if i.get("amount") and i.get("currency"):
            extra_income[i["currency"]] += i.get("amount", 0)
    
    # Toplam gelir
    total_revenue = {
        "EUR": reservation_revenue["EUR"] + extra_sales_revenue["EUR"] + extra_income["EUR"],
        "USD": reservation_revenue["USD"] + extra_sales_revenue["USD"] + extra_income["USD"],
        "TRY": reservation_revenue["TRY"] + extra_sales_revenue["TRY"] + extra_income["TRY"]
    }
    
    # Tur tipine göre gruplandırılmış gelir
    tour_type_stats = defaultdict(lambda: {
        "reservation_count": 0,
        "revenue": {"EUR": 0, "USD": 0, "TRY": 0}
    })
    
    for r in reservations:
        if r.get("tour_type_id"):
            tour_type_stats[r["tour_type_id"]]["reservation_count"] += 1
            if r.get("price") and r.get("currency"):
                tour_type_stats[r["tour_type_id"]]["revenue"][r["currency"]] += r.get("price", 0)
    
    tour_type_list = []
    for tour_type_id, stats in tour_type_stats.items():
        tour_type = await db.tour_types.find_one({"id": tour_type_id}, {"_id": 0})
        if tour_type:
            tour_type_list.append({
                "tour_type_id": tour_type_id,
                "tour_type_name": tour_type.get("name", ""),
                "reservation_count": stats["reservation_count"],
                "revenue": stats["revenue"]
            })
    
    # Günlük trend verisi
    daily_trend = defaultdict(lambda: {"EUR": 0, "USD": 0, "TRY": 0})
    for r in reservations:
        date = r.get("date", "")
        if date and r.get("price") and r.get("currency"):
            daily_trend[date][r["currency"]] += r.get("price", 0)
    
    for s in extra_sales:
        date = s.get("date", "")
        if date and s.get("sale_price") and s.get("currency"):
            daily_trend[date][s["currency"]] += s.get("sale_price", 0)
    
    for i in incomes:
        date = i.get("date", "")
        if date and i.get("amount") and i.get("currency"):
            daily_trend[date][i["currency"]] += i.get("amount", 0)
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "reservation_revenue": reservation_revenue,
        "extra_sales_revenue": extra_sales_revenue,
        "extra_income": extra_income,
        "total_revenue": total_revenue,
        "total_atvs": total_atvs,
        "tour_type_stats": sorted(tour_type_list, key=lambda x: sum(x["revenue"].values()), reverse=True),
        "daily_trend": dict(daily_trend)
    }

@api_router.get("/reports/atv-usage")
async def get_atv_usage_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tour_type_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """ATV Kullanım / Doluluk Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }
    if tour_type_id:
        query["tour_type_id"] = tour_type_id
    
    reservations = await db.reservations.find(query, {"_id": 0}).to_list(10000)
    
    # Günlük ATV kullanım
    daily_usage = defaultdict(int)
    for r in reservations:
        date = r.get("date", "")
        daily_usage[date] += r.get("atv_count", 0)
    
    # Saatlik ATV kullanım
    hourly_usage = defaultdict(int)
    for r in reservations:
        if r.get("time"):
            hour = int(r["time"].split(":")[0]) if ":" in r["time"] else 0
            hourly_usage[hour] += r.get("atv_count", 0)
    
    # Tur tipine göre ATV kullanımı
    tour_type_usage = defaultdict(int)
    for r in reservations:
        if r.get("tour_type_id"):
            tour_type_usage[r["tour_type_id"]] += r.get("atv_count", 0)
    
    tour_type_list = []
    for tour_type_id, count in tour_type_usage.items():
        tour_type = await db.tour_types.find_one({"id": tour_type_id}, {"_id": 0})
        if tour_type:
            tour_type_list.append({
                "tour_type_name": tour_type.get("name", ""),
                "atv_count": count
            })
    
    # En yoğun günler
    busiest_days = sorted(daily_usage.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Ortalama ATV kullanımı
    total_days = len(set(r.get("date", "") for r in reservations))
    avg_daily_usage = sum(daily_usage.values()) / total_days if total_days > 0 else 0
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "daily_usage": dict(daily_usage),
        "hourly_usage": dict(hourly_usage),
        "tour_type_usage": tour_type_list,
        "busiest_days": [{"date": d[0], "atv_count": d[1]} for d in busiest_days],
        "avg_daily_usage": avg_daily_usage,
        "total_atvs": sum(daily_usage.values())
    }

@api_router.get("/reports/tour-types")
async def get_tour_types_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Tur Tipi Analiz Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    tour_type_stats = defaultdict(lambda: {"count": 0, "revenue": {"EUR": 0, "USD": 0, "TRY": 0}, "atv_count": 0})
    
    for r in reservations:
        if r.get("tour_type_id"):
            tour_type_stats[r["tour_type_id"]]["count"] += 1
            if r.get("price") and r.get("currency"):
                tour_type_stats[r["tour_type_id"]]["revenue"][r["currency"]] += r.get("price", 0)
            tour_type_stats[r["tour_type_id"]]["atv_count"] += r.get("atv_count", 0)
    
    tour_type_list = []
    for tour_type_id, stats in tour_type_stats.items():
        tour_type = await db.tour_types.find_one({"id": tour_type_id}, {"_id": 0})
        if tour_type:
            total_revenue = sum(stats["revenue"].values())
            avg_revenue = total_revenue / stats["count"] if stats["count"] > 0 else 0
            tour_type_list.append({
                "tour_type_id": tour_type_id,
                "tour_type_name": tour_type.get("name", ""),
                "reservation_count": stats["count"],
                "revenue": stats["revenue"],
                "atv_count": stats["atv_count"],
                "avg_revenue": avg_revenue
            })
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "tour_type_stats": sorted(tour_type_list, key=lambda x: x["reservation_count"], reverse=True)
    }

@api_router.get("/reports/pickup-performance")
async def get_pickup_performance_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Pick-Up Noktası Performans Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    pickup_stats = defaultdict(lambda: {"customer_count": 0, "atv_count": 0, "revenue": {"EUR": 0, "USD": 0, "TRY": 0}})
    
    for r in reservations:
        if r.get("pickup_location"):
            pickup_stats[r["pickup_location"]]["customer_count"] += 1
            pickup_stats[r["pickup_location"]]["atv_count"] += r.get("atv_count", 0)
            if r.get("price") and r.get("currency"):
                pickup_stats[r["pickup_location"]]["revenue"][r["currency"]] += r.get("price", 0)
    
    pickup_list = []
    for pickup_location, stats in pickup_stats.items():
        total_revenue = sum(stats["revenue"].values())
        avg_revenue = total_revenue / stats["customer_count"] if stats["customer_count"] > 0 else 0
        pickup_list.append({
            "pickup_location": pickup_location,
            "customer_count": stats["customer_count"],
            "atv_count": stats["atv_count"],
            "revenue": stats["revenue"],
            "avg_revenue": avg_revenue
        })
    
    # Top 10
    top_pickups = sorted(pickup_list, key=lambda x: x["customer_count"], reverse=True)[:10]
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "pickup_stats": top_pickups
    }

@api_router.get("/reports/seasonal-pricing-impact")
async def get_seasonal_pricing_impact_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Dönemsel Fiyatlama Etki Analizi"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    # Dönemsel fiyatlar
    seasonal_prices = await db.seasonal_prices.find({
        "company_id": current_user["company_id"],
        "$or": [
            {"start_date": {"$lte": date_to}, "end_date": {"$gte": date_from}}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Rezervasyonlar
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    # Dönemsel fiyat uygulanan günler
    seasonal_days = set()
    for sp in seasonal_prices:
        start = datetime.strptime(sp.get("start_date", date_from), "%Y-%m-%d")
        end = datetime.strptime(sp.get("end_date", date_to), "%Y-%m-%d")
        current = start
        while current <= end:
            seasonal_days.add(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
    
    # Fiyat değişikliği öncesi/sonrası karşılaştırma
    seasonal_reservations = [r for r in reservations if r.get("date") in seasonal_days]
    normal_reservations = [r for r in reservations if r.get("date") not in seasonal_days]
    
    seasonal_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in seasonal_reservations:
        if r.get("price") and r.get("currency"):
            seasonal_revenue[r["currency"]] += r.get("price", 0)
    
    normal_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in normal_reservations:
        if r.get("price") and r.get("currency"):
            normal_revenue[r["currency"]] += r.get("price", 0)
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "seasonal_days_count": len(seasonal_days),
        "seasonal_reservations_count": len(seasonal_reservations),
        "normal_reservations_count": len(normal_reservations),
        "seasonal_revenue": seasonal_revenue,
        "normal_revenue": normal_revenue
    }

@api_router.get("/reports/expenses")
async def get_expenses_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    expense_category_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gider / Masraf Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }
    if expense_category_id:
        query["expense_category_id"] = expense_category_id
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Gider kalemlerine göre toplam
    category_totals = defaultdict(lambda: {"EUR": 0, "USD": 0, "TRY": 0})
    for e in expenses:
        if e.get("expense_category_id") and e.get("amount") and e.get("currency"):
            category_totals[e["expense_category_id"]][e["currency"]] += e.get("amount", 0)
    
    category_list = []
    for category_id, totals in category_totals.items():
        category = await db.expense_categories.find_one({"id": category_id}, {"_id": 0})
        if category:
            category_list.append({
                "category_id": category_id,
                "category_name": category.get("name", ""),
                "totals": totals
            })
    
    # Toplam giderler
    total_expenses = {"EUR": 0, "USD": 0, "TRY": 0}
    for e in expenses:
        if e.get("amount") and e.get("currency"):
            total_expenses[e["currency"]] += e.get("amount", 0)
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "expenses": expenses,
        "category_totals": category_list,
        "total_expenses": total_expenses
    }

@api_router.get("/reports/cari-accounts")
async def get_cari_accounts_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Cari Hesap Raporu - Geliştirilmiş"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    cari_accounts = await db.cari_accounts.find({
        "company_id": current_user["company_id"]
    }, {"_id": 0}).to_list(1000)
    
    # Toplam bakiyeler
    total_balances = {"EUR": 0, "USD": 0, "TRY": 0}
    alacaklilar = []
    borclular = []
    
    # İşlem hacmi ve gelir hesaplamaları için
    transactions = await db.transactions.find({
        "company_id": current_user["company_id"],
        "cari_id": {"$ne": ""},
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "cari_id": {"$ne": ""},
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    # Cari bazlı istatistikler
    cari_stats = defaultdict(lambda: {
        "transaction_count": 0,
        "transaction_volume": {"EUR": 0, "USD": 0, "TRY": 0},
        "reservation_count": 0,
        "reservation_revenue": {"EUR": 0, "USD": 0, "TRY": 0}
    })
    
    for t in transactions:
        if t.get("cari_id"):
            cari_stats[t["cari_id"]]["transaction_count"] += 1
            if t.get("amount") and t.get("currency"):
                cari_stats[t["cari_id"]]["transaction_volume"][t["currency"]] += abs(t.get("amount", 0))
    
    for r in reservations:
        if r.get("cari_id"):
            cari_stats[r["cari_id"]]["reservation_count"] += 1
            if r.get("price") and r.get("currency"):
                cari_stats[r["cari_id"]]["reservation_revenue"][r["currency"]] += r.get("price", 0)
    
    for cari in cari_accounts:
        balance_eur = cari.get("balance_eur", 0)
        balance_usd = cari.get("balance_usd", 0)
        balance_try = cari.get("balance_try", 0)
        
        total_balances["EUR"] += balance_eur
        total_balances["USD"] += balance_usd
        total_balances["TRY"] += balance_try
        
        stats = cari_stats.get(cari["id"], {})
        total_revenue = sum(stats.get("reservation_revenue", {}).values())
        total_volume = sum(stats.get("transaction_volume", {}).values())
        
        cari_data = {
            "cari_id": cari["id"],
            "cari_name": cari.get("name", ""),
            "balance_eur": balance_eur,
            "balance_usd": balance_usd,
            "balance_try": balance_try,
            "transaction_count": stats.get("transaction_count", 0),
            "transaction_volume": stats.get("transaction_volume", {}),
            "reservation_count": stats.get("reservation_count", 0),
            "reservation_revenue": stats.get("reservation_revenue", {}),
            "total_revenue": total_revenue,
            "total_volume": total_volume
        }
        
        if balance_eur > 0 or balance_usd > 0 or balance_try > 0:
            alacaklilar.append(cari_data)
        elif balance_eur < 0 or balance_usd < 0 or balance_try < 0:
            borclular.append(cari_data)
    
    # En fazla işlem hacmi
    top_volume = sorted(
        [c for c in cari_accounts if cari_stats.get(c["id"], {}).get("transaction_count", 0) > 0],
        key=lambda x: sum(cari_stats.get(x["id"], {}).get("transaction_volume", {}).values()),
        reverse=True
    )[:10]
    top_volume_list = []
    for cari in top_volume:
        stats = cari_stats.get(cari["id"], {})
        top_volume_list.append({
            "cari_name": cari.get("name", ""),
            "transaction_count": stats.get("transaction_count", 0),
            "transaction_volume": stats.get("transaction_volume", {}),
            "total_volume": sum(stats.get("transaction_volume", {}).values())
        })
    
    # En fazla kazandıran
    top_revenue = sorted(
        [c for c in cari_accounts if cari_stats.get(c["id"], {}).get("reservation_count", 0) > 0],
        key=lambda x: sum(cari_stats.get(x["id"], {}).get("reservation_revenue", {}).values()),
        reverse=True
    )[:10]
    top_revenue_list = []
    for cari in top_revenue:
        stats = cari_stats.get(cari["id"], {})
        top_revenue_list.append({
            "cari_name": cari.get("name", ""),
            "reservation_count": stats.get("reservation_count", 0),
            "reservation_revenue": stats.get("reservation_revenue", {}),
            "total_revenue": sum(stats.get("reservation_revenue", {}).values())
        })
    
    return {
        "total_balances": total_balances,
        "alacaklilar": sorted(alacaklilar, key=lambda x: x["balance_eur"] + x["balance_usd"] + x["balance_try"], reverse=True),
        "borclular": sorted(borclular, key=lambda x: abs(x["balance_eur"] + x["balance_usd"] + x["balance_try"]), reverse=True),
        "top_volume": top_volume_list,
        "top_revenue": top_revenue_list
    }

@api_router.get("/reports/cash-status")
async def get_cash_status_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Kasa Durum Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    # Kasa bakiyeleri (cash endpoint'inden al)
    # Rezervasyon gelirleri
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    reservation_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in reservations:
        if r.get("price") and r.get("currency"):
            reservation_revenue[r["currency"]] += r.get("price", 0)
    
    # Extra sales gelirleri
    extra_sales = await db.extra_sales.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    extra_sales_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for s in extra_sales:
        if s.get("sale_price") and s.get("currency"):
            extra_sales_revenue[s["currency"]] += s.get("sale_price", 0)
    
    # Ekstra gelirler
    incomes = await db.incomes.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    extra_income = {"EUR": 0, "USD": 0, "TRY": 0}
    for i in incomes:
        if i.get("amount") and i.get("currency"):
            extra_income[i["currency"]] += i.get("amount", 0)
    
    # Tahsilatlar
    payments = await db.transactions.find({
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "reference_type": {"$ne": "outgoing_payment"},
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    payment_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for p in payments:
        if p.get("amount") and p.get("currency"):
            payment_revenue[p["currency"]] += p.get("amount", 0)
    
    # Ödemeler
    outgoing_payments = await db.transactions.find({
        "company_id": current_user["company_id"],
        "reference_type": "outgoing_payment",
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    outgoing_payment_amount = {"EUR": 0, "USD": 0, "TRY": 0}
    for p in outgoing_payments:
        if p.get("amount") and p.get("currency"):
            outgoing_payment_amount[p["currency"]] += abs(p.get("amount", 0))
    
    # Giderler
    expenses = await db.expenses.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    expense_amount = {"EUR": 0, "USD": 0, "TRY": 0}
    for e in expenses:
        if e.get("amount") and e.get("currency"):
            expense_amount[e["currency"]] += e.get("amount", 0)
    
    # Döviz bozma işlemleri
    exchanges = await db.transactions.find({
        "company_id": current_user["company_id"],
        "reference_type": "currency_exchange",
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    total_income = {
        "EUR": reservation_revenue["EUR"] + extra_sales_revenue["EUR"] + extra_income["EUR"] + payment_revenue["EUR"],
        "USD": reservation_revenue["USD"] + extra_sales_revenue["USD"] + extra_income["USD"] + payment_revenue["USD"],
        "TRY": reservation_revenue["TRY"] + extra_sales_revenue["TRY"] + extra_income["TRY"] + payment_revenue["TRY"]
    }
    
    total_expenses = {
        "EUR": outgoing_payment_amount["EUR"] + expense_amount["EUR"],
        "USD": outgoing_payment_amount["USD"] + expense_amount["USD"],
        "TRY": outgoing_payment_amount["TRY"] + expense_amount["TRY"]
    }
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "reservation_revenue": reservation_revenue,
        "extra_sales_revenue": extra_sales_revenue,
        "extra_income": extra_income,
        "payment_revenue": payment_revenue,
        "outgoing_payments": outgoing_payment_amount,
        "expenses": expense_amount,
        "exchanges": len(exchanges),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_cash_flow": {
            "EUR": total_income["EUR"] - total_expenses["EUR"],
            "USD": total_income["USD"] - total_expenses["USD"],
            "TRY": total_income["TRY"] - total_expenses["TRY"]
        }
    }

@api_router.get("/reports/extra-sales")
async def get_extra_sales_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    cari_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Extra Sales Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }
    if cari_id:
        query["cari_id"] = cari_id
    
    extra_sales = await db.extra_sales.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Toplam gelir
    total_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for s in extra_sales:
        if s.get("sale_price") and s.get("currency"):
            total_revenue[s["currency"]] += s.get("sale_price", 0)
    
    # En çok satılan ürünler
    product_stats = defaultdict(lambda: {"count": 0, "revenue": {"EUR": 0, "USD": 0, "TRY": 0}})
    for s in extra_sales:
        product_name = s.get("product_name", "Belirtilmedi")
        product_stats[product_name]["count"] += 1
        if s.get("sale_price") and s.get("currency"):
            product_stats[product_name]["revenue"][s["currency"]] += s.get("sale_price", 0)
    
    top_products = sorted(product_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    top_products_list = []
    for product_name, stats in top_products:
        top_products_list.append({
            "product_name": product_name,
            "count": stats["count"],
            "revenue": stats["revenue"]
        })
    
    # Cari firmalara göre dağılım
    cari_stats = defaultdict(lambda: {"count": 0, "revenue": {"EUR": 0, "USD": 0, "TRY": 0}})
    for s in extra_sales:
        if s.get("cari_id"):
            cari_stats[s["cari_id"]]["count"] += 1
            if s.get("sale_price") and s.get("currency"):
                cari_stats[s["cari_id"]]["revenue"][s["currency"]] += s.get("sale_price", 0)
    
    cari_list = []
    for cari_id, stats in cari_stats.items():
        cari = await db.cari_accounts.find_one({"id": cari_id}, {"_id": 0})
        if cari:
            cari_list.append({
                "cari_name": cari.get("name", ""),
                "count": stats["count"],
                "revenue": stats["revenue"]
            })
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "extra_sales": extra_sales,
        "total_revenue": total_revenue,
        "top_products": top_products_list,
        "cari_distribution": cari_list
    }

@api_router.get("/reports/profit-loss")
async def get_profit_loss_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Kar/Zarar Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    # Toplam gelir (rezervasyonlar + extra sales + ekstra gelirler)
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to},
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    reservation_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in reservations:
        if r.get("price") and r.get("currency"):
            reservation_revenue[r["currency"]] += r.get("price", 0)
    
    extra_sales = await db.extra_sales.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    extra_sales_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for s in extra_sales:
        if s.get("sale_price") and s.get("currency"):
            extra_sales_revenue[s["currency"]] += s.get("sale_price", 0)
    
    incomes = await db.incomes.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    extra_income = {"EUR": 0, "USD": 0, "TRY": 0}
    for i in incomes:
        if i.get("amount") and i.get("currency"):
            extra_income[i["currency"]] += i.get("amount", 0)
    
    total_income = {
        "EUR": reservation_revenue["EUR"] + extra_sales_revenue["EUR"] + extra_income["EUR"],
        "USD": reservation_revenue["USD"] + extra_sales_revenue["USD"] + extra_income["USD"],
        "TRY": reservation_revenue["TRY"] + extra_sales_revenue["TRY"] + extra_income["TRY"]
    }
    
    # Toplam gider
    expenses = await db.expenses.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    total_expenses = {"EUR": 0, "USD": 0, "TRY": 0}
    for e in expenses:
        if e.get("amount") and e.get("currency"):
            total_expenses[e["currency"]] += e.get("amount", 0)
    
    # Net kar/zarar
    net_profit_loss = {
        "EUR": total_income["EUR"] - total_expenses["EUR"],
        "USD": total_income["USD"] - total_expenses["USD"],
        "TRY": total_income["TRY"] - total_expenses["TRY"]
    }
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit_loss": net_profit_loss,
        "reservation_revenue": reservation_revenue,
        "extra_sales_revenue": extra_sales_revenue,
        "extra_income": extra_income
    }

@api_router.get("/reports/extra-sales")
async def get_extra_sales_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    cari_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Extra Sales Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }
    if cari_id:
        query["cari_id"] = cari_id
    
    extra_sales = await db.extra_sales.find(query, {"_id": 0}).to_list(10000)
    
    # Toplam gelir
    total_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for s in extra_sales:
        if s.get("sale_price") and s.get("currency"):
            total_revenue[s["currency"]] += s.get("sale_price", 0)
    
    # En çok satılan ürünler
    product_stats = defaultdict(lambda: {"count": 0, "revenue": {"EUR": 0, "USD": 0, "TRY": 0}})
    for s in extra_sales:
        product_name = s.get("product_name", "Bilinmeyen")
        product_stats[product_name]["count"] += 1
        if s.get("sale_price") and s.get("currency"):
            product_stats[product_name]["revenue"][s["currency"]] += s.get("sale_price", 0)
    
    top_products = sorted(
        [{"product_name": k, "count": v["count"], "revenue": v["revenue"]} for k, v in product_stats.items()],
        key=lambda x: sum(x["revenue"].values()),
        reverse=True
    )[:10]
    
    # Cari firmalara göre dağılım
    cari_stats = defaultdict(lambda: {"count": 0, "revenue": {"EUR": 0, "USD": 0, "TRY": 0}})
    for s in extra_sales:
        if s.get("cari_id"):
            cari = await db.cari_accounts.find_one({"id": s["cari_id"]}, {"_id": 0})
            cari_name = cari.get("name", "Bilinmeyen") if cari else "Bilinmeyen"
            cari_stats[cari_name]["count"] += 1
            if s.get("sale_price") and s.get("currency"):
                cari_stats[cari_name]["revenue"][s["currency"]] += s.get("sale_price", 0)
    
    cari_distribution = sorted(
        [{"cari_name": k, "count": v["count"], "revenue": v["revenue"]} for k, v in cari_stats.items()],
        key=lambda x: sum(x["revenue"].values()),
        reverse=True
    )[:10]
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_revenue": total_revenue,
        "top_products": top_products,
        "cari_distribution": cari_distribution,
        "extra_sales": extra_sales[:100]  # İlk 100 kayıt
    }

@api_router.get("/reports/balanced-accounts")
async def get_balanced_accounts_report(current_user: dict = Depends(get_current_user)):
    """Bakiyesi Olanlar Raporu"""
    cari_accounts = await db.cari_accounts.find({
        "company_id": current_user["company_id"]
    }, {"_id": 0}).to_list(1000)
    
    balanced = []
    for cari in cari_accounts:
        balance_eur = cari.get("balance_eur", 0)
        balance_usd = cari.get("balance_usd", 0)
        balance_try = cari.get("balance_try", 0)
        
        # Herhangi bir dövizde bakiye varsa (pozitif veya negatif)
        if balance_eur != 0 or balance_usd != 0 or balance_try != 0:
            balanced.append({
                "cari_id": cari["id"],
                "cari_name": cari.get("name", ""),
                "balance_eur": balance_eur,
                "balance_usd": balance_usd,
                "balance_try": balance_try,
                "total_balance": balance_eur + balance_usd + balance_try
            })
    
    return {
        "balanced_accounts": sorted(balanced, key=lambda x: abs(x["total_balance"]), reverse=True)
    }

@api_router.get("/reports/creditors")
async def get_creditors_report(current_user: dict = Depends(get_current_user)):
    """Alacaklı Olanlar Raporu (Bize borçlu olanlar - pozitif bakiye)"""
    cari_accounts = await db.cari_accounts.find({
        "company_id": current_user["company_id"]
    }, {"_id": 0}).to_list(1000)
    
    creditors = []
    for cari in cari_accounts:
        balance_eur = cari.get("balance_eur", 0)
        balance_usd = cari.get("balance_usd", 0)
        balance_try = cari.get("balance_try", 0)
        
        # Pozitif bakiye = bize borçlu (alacaklıyız)
        if balance_eur > 0 or balance_usd > 0 or balance_try > 0:
            creditors.append({
                "cari_id": cari["id"],
                "cari_name": cari.get("name", ""),
                "balance_eur": balance_eur,
                "balance_usd": balance_usd,
                "balance_try": balance_try,
                "total_balance": balance_eur + balance_usd + balance_try
            })
    
    return {
        "creditors": sorted(creditors, key=lambda x: x["total_balance"], reverse=True)
    }

@api_router.get("/reports/performance")
async def get_performance_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Performans Raporu"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    reservations = await db.reservations.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }, {"_id": 0}).to_list(10000)
    
    total_reservations = len(reservations)
    completed = len([r for r in reservations if r.get("status") == "completed"])
    cancelled = len([r for r in reservations if r.get("status") == "cancelled"])
    confirmed = len([r for r in reservations if r.get("status") == "confirmed"])
    
    completion_rate = (completed / total_reservations * 100) if total_reservations > 0 else 0
    cancellation_rate = (cancelled / total_reservations * 100) if total_reservations > 0 else 0
    
    # Ortalama rezervasyon değeri
    total_revenue = {"EUR": 0, "USD": 0, "TRY": 0}
    for r in reservations:
        if r.get("price") and r.get("currency") and r.get("status") != "cancelled":
            total_revenue[r["currency"]] += r.get("price", 0)
    
    valid_reservations = [r for r in reservations if r.get("status") != "cancelled"]
    avg_reservation_value = {
        "EUR": total_revenue["EUR"] / len(valid_reservations) if len(valid_reservations) > 0 else 0,
        "USD": total_revenue["USD"] / len(valid_reservations) if len(valid_reservations) > 0 else 0,
        "TRY": total_revenue["TRY"] / len(valid_reservations) if len(valid_reservations) > 0 else 0
    }
    
    # En verimli günler
    daily_performance = defaultdict(lambda: {"reservations": 0, "revenue": 0})
    for r in valid_reservations:
        date = r.get("date", "")
        daily_performance[date]["reservations"] += 1
        if r.get("price") and r.get("currency") == "EUR":
            daily_performance[date]["revenue"] += r.get("price", 0)
    
    busiest_days = sorted(daily_performance.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
    
    # En verimli saatler
    hourly_performance = defaultdict(lambda: {"reservations": 0, "revenue": 0})
    for r in valid_reservations:
        if r.get("time"):
            hour = int(r["time"].split(":")[0]) if ":" in r["time"] else 0
            hourly_performance[hour]["reservations"] += 1
            if r.get("price") and r.get("currency") == "EUR":
                hourly_performance[hour]["revenue"] += r.get("price", 0)
    
    busiest_hours = sorted(hourly_performance.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_reservations": total_reservations,
        "completed": completed,
        "cancelled": cancelled,
        "confirmed": confirmed,
        "completion_rate": completion_rate,
        "cancellation_rate": cancellation_rate,
        "avg_reservation_value": avg_reservation_value,
        "busiest_days": [{"date": d[0], "reservations": d[1]["reservations"], "revenue": d[1]["revenue"]} for d in busiest_days],
        "busiest_hours": [{"hour": h[0], "reservations": h[1]["reservations"], "revenue": h[1]["revenue"]} for h in busiest_hours]
    }

@api_router.get("/reports/earnings")
async def get_earnings_report(
    date_from: str,
    date_to: str,
    current_user: dict = Depends(get_current_user)
):
    # Reservations
    reservations = await db.reservations.find(
        {
            "company_id": current_user["company_id"],
            "date": {"$gte": date_from, "$lte": date_to},
            "status": "completed"
        },
        {"_id": 0}
    ).to_list(10000)
    
    # Extra sales
    extra_sales = await db.extra_sales.find(
        {
            "company_id": current_user["company_id"],
            "date": {"$gte": date_from, "$lte": date_to}
        },
        {"_id": 0}
    ).to_list(10000)
    
    earnings = {"EUR": 0, "USD": 0, "TRY": 0}
    
    for r in reservations:
        earnings[r["currency"]] += r["price"]
    
    for s in extra_sales:
        profit = s["sale_price"] - s.get("purchase_price", 0)
        earnings[s["currency"]] += profit
    
    return {"earnings": earnings, "reservations_count": len(reservations), "sales_count": len(extra_sales)}

@api_router.get("/reports/collections")
async def get_collections_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    payment_type_id: Optional[str] = None,
    currency: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Tahsilat Raporu - Ödeme tipi ve döviz filtreleri ile"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = {
        "company_id": current_user["company_id"],
        "transaction_type": "payment",
        "reference_type": {"$ne": "outgoing_payment"},
        "date": {"$gte": date_from, "$lte": date_to}
    }
    
    if payment_type_id:
        query["payment_type_id"] = payment_type_id
    if currency:
        query["currency"] = currency
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    collections = {"EUR": 0, "USD": 0, "TRY": 0}
    for t in transactions:
        if t.get("amount") and t.get("currency"):
            collections[t["currency"]] += t.get("amount", 0)
    
    # Ödeme tipine göre gruplandırılmış tahsilat
    payment_type_stats = defaultdict(lambda: {
        "transaction_count": 0,
        "totals": {"EUR": 0, "USD": 0, "TRY": 0}
    })
    
    for t in transactions:
        payment_type_id = t.get("payment_type_id")
        if payment_type_id:
            payment_type_stats[payment_type_id]["transaction_count"] += 1
            if t.get("amount") and t.get("currency"):
                payment_type_stats[payment_type_id]["totals"][t["currency"]] += t.get("amount", 0)
    
    payment_type_list = []
    for payment_type_id, stats in payment_type_stats.items():
        payment_type = await db.payment_types.find_one({"id": payment_type_id}, {"_id": 0})
        if payment_type:
            payment_type_list.append({
                "payment_type_id": payment_type_id,
                "payment_type_name": payment_type.get("name", ""),
                "transaction_count": stats["transaction_count"],
                "totals": stats["totals"]
            })
    
    # Günlük trend verisi
    daily_trend = defaultdict(lambda: {"EUR": 0, "USD": 0, "TRY": 0})
    for t in transactions:
        date = t.get("date", "")
        if date and t.get("amount") and t.get("currency"):
            daily_trend[date][t["currency"]] += t.get("amount", 0)
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "collections": collections,
        "transactions": transactions,
        "payment_type_stats": sorted(payment_type_list, key=lambda x: sum(x["totals"].values()), reverse=True),
        "daily_trend": dict(daily_trend)
    }

@api_router.get("/reports/expenses")
async def get_expenses_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    expense_category_id: Optional[str] = None,
    currency: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gider Raporu - Gider kalemi ve döviz filtreleri ile"""
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = {
        "company_id": current_user["company_id"],
        "date": {"$gte": date_from, "$lte": date_to}
    }
    
    if expense_category_id:
        query["expense_category_id"] = expense_category_id
    if currency:
        query["currency"] = currency
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    # Toplam giderler
    total_expenses = {"EUR": 0, "USD": 0, "TRY": 0}
    for e in expenses:
        if e.get("amount") and e.get("currency"):
            total_expenses[e["currency"]] += e.get("amount", 0)
    
    # Gider kalemlerine göre gruplandırılmış gider
    category_totals = defaultdict(lambda: {
        "totals": {"EUR": 0, "USD": 0, "TRY": 0}
    })
    
    for e in expenses:
        category_id = e.get("expense_category_id")
        if category_id:
            if e.get("amount") and e.get("currency"):
                category_totals[category_id]["totals"][e["currency"]] += e.get("amount", 0)
    
    category_list = []
    for category_id, stats in category_totals.items():
        category = await db.expense_categories.find_one({"id": category_id}, {"_id": 0})
        if category:
            category_list.append({
                "category_id": category_id,
                "category_name": category.get("name", ""),
                "totals": stats["totals"]
            })
    
    # Günlük trend verisi
    daily_trend = defaultdict(lambda: {"EUR": 0, "USD": 0, "TRY": 0})
    for e in expenses:
        date = e.get("date", "")
        if date and e.get("amount") and e.get("currency"):
            daily_trend[date][e["currency"]] += e.get("amount", 0)
    
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_expenses": total_expenses,
        "expenses": expenses,
        "category_totals": sorted(category_list, key=lambda x: sum(x["totals"].values()), reverse=True),
        "daily_trend": dict(daily_trend)
    }

@api_router.get("/reports/debtors")
async def get_debtors_report(current_user: dict = Depends(get_current_user)):
    cari_accounts = await db.cari_accounts.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    debtors = [c for c in cari_accounts if c["balance_eur"] > 0 or c["balance_usd"] > 0 or c["balance_try"] > 0]
    return debtors

@api_router.get("/reports/creditors")
async def get_creditors_report(current_user: dict = Depends(get_current_user)):
    cari_accounts = await db.cari_accounts.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    creditors = [c for c in cari_accounts if c["balance_eur"] < 0 or c["balance_usd"] < 0 or c["balance_try"] < 0]
    return creditors

@api_router.get("/reports/cancelled")
async def get_cancelled_report(
    date_from: str,
    date_to: str,
    current_user: dict = Depends(get_current_user)
):
    reservations = await db.reservations.find(
        {
            "company_id": current_user["company_id"],
            "status": "cancelled",
            "date": {"$gte": date_from, "$lte": date_to}
        },
        {"_id": 0}
    ).to_list(10000)
    
    return reservations

@api_router.post("/reservations/{reservation_id}/voucher")
async def generate_reservation_voucher(reservation_id: str, current_user: dict = Depends(get_current_user)):
    """Rezervasyon için voucher oluştur veya mevcut voucher'ı getir"""
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "company_id": current_user["company_id"]
    })
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Voucher kodu yoksa oluştur
    if not reservation.get("voucher_code"):
        voucher_code = generate_voucher_code()
        # Benzersizlik kontrolü (hem rezervasyonlarda hem extra sales'te kontrol et)
        while await db.reservations.find_one({"voucher_code": voucher_code}) or \
              await db.extra_sales.find_one({"voucher_code": voucher_code}):
            voucher_code = generate_voucher_code()
        
        await db.reservations.update_one(
            {"id": reservation_id},
            {"$set": {"voucher_code": voucher_code}}
        )
        reservation["voucher_code"] = voucher_code
    
    # Firma bilgilerini al
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    
    return {
        "reservation": reservation,
        "company": company,
        "voucher_code": reservation["voucher_code"]
    }

@api_router.post("/extra-sales/{sale_id}/voucher")
async def generate_extra_sale_voucher(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Açık satış için voucher oluştur veya mevcut voucher'ı getir"""
    sale = await db.extra_sales.find_one({
        "id": sale_id,
        "company_id": current_user["company_id"]
    })
    
    if not sale:
        raise HTTPException(status_code=404, detail="Extra sale not found")
    
    # Voucher kodu yoksa oluştur
    if not sale.get("voucher_code"):
        voucher_code = generate_voucher_code()
        # Benzersizlik kontrolü (hem rezervasyonlarda hem extra sales'te kontrol et)
        while await db.reservations.find_one({"voucher_code": voucher_code}) or \
              await db.extra_sales.find_one({"voucher_code": voucher_code}):
            voucher_code = generate_voucher_code()
        
        await db.extra_sales.update_one(
            {"id": sale_id},
            {"$set": {"voucher_code": voucher_code}}
        )
        sale["voucher_code"] = voucher_code
    
    # Firma bilgilerini al
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    
    return {
        "sale": sale,
        "company": company,
        "voucher_code": sale["voucher_code"]
    }

# ==================== EXPENSE CATEGORIES ====================

@api_router.get("/expense-categories")
async def get_expense_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.expense_categories.find({"company_id": current_user["company_id"]}, {"_id": 0}).sort("name", 1).to_list(1000)
    return categories

@api_router.post("/expense-categories")
async def create_expense_category(data: dict, current_user: dict = Depends(get_current_user)):
    category = ExpenseCategory(company_id=current_user["company_id"], **data)
    category_doc = category.model_dump()
    category_doc['created_at'] = category_doc['created_at'].isoformat()
    await db.expense_categories.insert_one(category_doc)
    return category

@api_router.put("/expense-categories/{category_id}")
async def update_expense_category(category_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    result = await db.expense_categories.update_one(
        {"id": category_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense category not found")
    return {"message": "Expense category updated"}

@api_router.delete("/expense-categories/{category_id}")
async def delete_expense_category(category_id: str, current_user: dict = Depends(get_current_user)):
    # Kategori kullanım kontrolü
    expense_count = await db.expenses.count_documents({"expense_category_id": category_id, "company_id": current_user["company_id"]})
    if expense_count > 0:
        raise HTTPException(status_code=400, detail=f"Bu kategori {expense_count} gider kaydında kullanılıyor. Önce bu kayıtları düzenleyin.")
    
    result = await db.expense_categories.delete_one({"id": category_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense category not found")
    return {"message": "Expense category deleted"}

# ==================== INCOME CATEGORIES ====================

@api_router.get("/income-categories")
async def get_income_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.income_categories.find({"company_id": current_user["company_id"]}, {"_id": 0}).sort("name", 1).to_list(1000)
    return categories

@api_router.post("/income-categories")
async def create_income_category(data: dict, current_user: dict = Depends(get_current_user)):
    category = IncomeCategory(company_id=current_user["company_id"], **data)
    category_doc = category.model_dump()
    category_doc['created_at'] = category_doc['created_at'].isoformat()
    await db.income_categories.insert_one(category_doc)
    return category

@api_router.put("/income-categories/{category_id}")
async def update_income_category(category_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    result = await db.income_categories.update_one(
        {"id": category_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Income category not found")
    return {"message": "Income category updated"}

@api_router.delete("/income-categories/{category_id}")
async def delete_income_category(category_id: str, current_user: dict = Depends(get_current_user)):
    # Kategori kullanım kontrolü
    income_count = await db.incomes.count_documents({"income_category_id": category_id, "company_id": current_user["company_id"]})
    if income_count > 0:
        raise HTTPException(status_code=400, detail=f"Bu kategori {income_count} gelir kaydında kullanılıyor. Önce bu kayıtları düzenleyin.")
    
    result = await db.income_categories.delete_one({"id": category_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income category not found")
    return {"message": "Income category deleted"}

# ==================== INCOME ====================

@api_router.get("/income")
async def get_incomes(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    
    # Tarih filtresi
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        query["date"] = date_query
    
    # Para birimi filtresi
    if currency:
        query["currency"] = currency
    
    # Kategori filtresi
    if category_id:
        query["income_category_id"] = category_id
    
    # Arama filtresi (description veya notes içinde)
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    incomes = await db.incomes.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Income category name'leri populate et
    for income in incomes:
        if income.get("income_category_id") and not income.get("income_category_name"):
            category = await db.income_categories.find_one({"id": income["income_category_id"]})
            if category:
                income["income_category_name"] = category.get("name")
    
    return incomes

@api_router.get("/income/statistics")
async def get_income_statistics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gelir istatistiklerini getir"""
    query = {"company_id": current_user["company_id"]}
    
    # Tarih filtresi
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        query["date"] = date_query
    
    incomes = await db.incomes.find(query, {"_id": 0}).to_list(10000)
    
    # Güncel kurları al
    try:
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        rates = {
            "EUR": company.get("currency_rates", {}).get("EUR", 1.0) if company.get("currency_rates") else 1.0,
            "USD": company.get("currency_rates", {}).get("USD", 35.0) if company.get("currency_rates") else 35.0,
            "TRY": 1.0
        }
    except:
        rates = {"EUR": 1.0, "USD": 35.0, "TRY": 1.0}
    
    # Toplamlar
    totals = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    total_try_value = 0.0
    count = 0
    
    # Bu ay toplam
    today = datetime.now(timezone.utc)
    this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d")
    this_month_total = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    this_month_try_value = 0.0
    
    for income in incomes:
        currency = income.get("currency", "EUR")
        amount = income.get("amount", 0.0)
        totals[currency] += amount
        
        # TRY değeri hesapla
        if currency == "TRY":
            try_value = amount
        else:
            try_value = amount * rates.get(currency, 1.0)
        total_try_value += try_value
        
        count += 1
        
        # Bu ay kontrolü
        if income.get("date", "") >= this_month_start:
            this_month_total[currency] += amount
            this_month_try_value += try_value
    
    # Ortalama
    avg_try_value = total_try_value / count if count > 0 else 0.0
    
    # Para birimi dağılımı
    distribution = {}
    if total_try_value > 0:
        for currency in ["EUR", "USD", "TRY"]:
            currency_try_value = totals[currency] * (rates.get(currency, 1.0) if currency != "TRY" else 1.0)
            distribution[currency] = (currency_try_value / total_try_value) * 100
    else:
        distribution = {"EUR": 0, "USD": 0, "TRY": 0}
    
    return {
        "totals": totals,
        "total_try_value": total_try_value,
        "this_month_total": this_month_total,
        "this_month_try_value": this_month_try_value,
        "average_try_value": avg_try_value,
        "count": count,
        "distribution": distribution,
        "rates": rates
    }

@api_router.post("/income")
async def create_income(data: dict, current_user: dict = Depends(get_current_user)):
    # Get income category name if provided
    income_category_name = None
    if data.get("income_category_id"):
        category = await db.income_categories.find_one({"id": data["income_category_id"]})
        if category:
            income_category_name = category.get("name")
    
    income = Income(
        company_id=current_user["company_id"],
        created_by=current_user["user_id"],
        income_category_name=income_category_name,
        **data
    )
    income_doc = income.model_dump()
    income_doc['created_at'] = income_doc['created_at'].isoformat()
    await db.incomes.insert_one(income_doc)
    return income

@api_router.put("/income/{income_id}")
async def update_income(income_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    # Get income category name if provided
    if data.get("income_category_id"):
        category = await db.income_categories.find_one({"id": data["income_category_id"]})
        if category:
            data["income_category_name"] = category.get("name")
        else:
            data["income_category_name"] = None
    elif "income_category_id" in data and data["income_category_id"] is None:
        data["income_category_name"] = None
    
    result = await db.incomes.update_one(
        {"id": income_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Income not found")
    return {"message": "Income updated"}

@api_router.delete("/income/{income_id}")
async def delete_income(income_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.incomes.delete_one({"id": income_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income not found")
    return {"message": "Income deleted"}

# ==================== EXPENSES ====================

@api_router.get("/expenses")
async def get_expenses(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    
    # Tarih filtresi
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        query["date"] = date_query
    
    # Para birimi filtresi
    if currency:
        query["currency"] = currency
    
    # Kategori filtresi
    if category_id:
        query["expense_category_id"] = category_id
    
    # Arama filtresi (description veya notes içinde)
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Expense category name'leri populate et
    for expense in expenses:
        if expense.get("expense_category_id") and not expense.get("expense_category_name"):
            category = await db.expense_categories.find_one({"id": expense["expense_category_id"]})
            if category:
                expense["expense_category_name"] = category.get("name")
    
    return expenses

@api_router.get("/expenses/statistics")
async def get_expense_statistics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gider istatistiklerini getir"""
    query = {"company_id": current_user["company_id"]}
    
    # Tarih filtresi
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        query["date"] = date_query
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    # Güncel kurları al
    try:
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        rates = {
            "EUR": company.get("currency_rates", {}).get("EUR", 1.0) if company.get("currency_rates") else 1.0,
            "USD": company.get("currency_rates", {}).get("USD", 35.0) if company.get("currency_rates") else 35.0,
            "TRY": 1.0
        }
    except:
        rates = {"EUR": 1.0, "USD": 35.0, "TRY": 1.0}
    
    # Toplamlar
    totals = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    total_try_value = 0.0
    count = 0
    
    # Bu ay toplam
    today = datetime.now(timezone.utc)
    this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d")
    this_month_total = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    this_month_try_value = 0.0
    
    # Kategori bazlı toplamlar
    category_totals = {}
    
    for expense in expenses:
        currency = expense.get("currency", "EUR")
        amount = expense.get("amount", 0.0)
        totals[currency] += amount
        
        # TRY değeri hesapla
        if currency == "TRY":
            try_value = amount
        else:
            try_value = amount * rates.get(currency, 1.0)
        total_try_value += try_value
        
        count += 1
        
        # Bu ay kontrolü
        if expense.get("date", "") >= this_month_start:
            this_month_total[currency] += amount
            this_month_try_value += try_value
        
        # Kategori bazlı toplam
        category_id = expense.get("expense_category_id")
        category_name = expense.get("expense_category_name") or "Kategori Yok"
        if category_id not in category_totals:
            category_totals[category_id] = {
                "id": category_id,
                "name": category_name,
                "total_try_value": 0.0,
                "count": 0
            }
        category_totals[category_id]["total_try_value"] += try_value
        category_totals[category_id]["count"] += 1
    
    # Ortalama
    avg_try_value = total_try_value / count if count > 0 else 0.0
    
    # Para birimi dağılımı
    distribution = {}
    if total_try_value > 0:
        for currency in ["EUR", "USD", "TRY"]:
            currency_try_value = totals[currency] * (rates.get(currency, 1.0) if currency != "TRY" else 1.0)
            distribution[currency] = (currency_try_value / total_try_value) * 100
    else:
        distribution = {"EUR": 0, "USD": 0, "TRY": 0}
    
    return {
        "totals": totals,
        "total_try_value": total_try_value,
        "this_month_total": this_month_total,
        "this_month_try_value": this_month_try_value,
        "average_try_value": avg_try_value,
        "count": count,
        "distribution": distribution,
        "category_totals": list(category_totals.values()),
        "rates": rates
    }

@api_router.get("/expenses/by-category")
async def get_expenses_by_category(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Kategori bazlı gider toplamlarını getir"""
    query = {"company_id": current_user["company_id"]}
    
    # Tarih filtresi
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        query["date"] = date_query
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    # Güncel kurları al
    try:
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        rates = {
            "EUR": company.get("currency_rates", {}).get("EUR", 1.0) if company.get("currency_rates") else 1.0,
            "USD": company.get("currency_rates", {}).get("USD", 35.0) if company.get("currency_rates") else 35.0,
            "TRY": 1.0
        }
    except:
        rates = {"EUR": 1.0, "USD": 35.0, "TRY": 1.0}
    
    # Kategori bazlı toplamlar
    category_totals = {}
    
    for expense in expenses:
        category_id = expense.get("expense_category_id")
        category_name = expense.get("expense_category_name") or "Kategori Yok"
        currency = expense.get("currency", "EUR")
        amount = expense.get("amount", 0.0)
        
        # TRY değeri hesapla
        if currency == "TRY":
            try_value = amount
        else:
            try_value = amount * rates.get(currency, 1.0)
        
        if category_id not in category_totals:
            category_totals[category_id] = {
                "id": category_id,
                "name": category_name,
                "total_try_value": 0.0,
                "count": 0,
                "totals": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
            }
        
        category_totals[category_id]["total_try_value"] += try_value
        category_totals[category_id]["count"] += 1
        category_totals[category_id]["totals"][currency] += amount
    
    return list(category_totals.values())

@api_router.post("/expenses")
async def create_expense(data: dict, current_user: dict = Depends(get_current_user)):
    # Get expense category name if provided
    expense_category_name = None
    if data.get("expense_category_id"):
        category = await db.expense_categories.find_one({"id": data["expense_category_id"]})
        if category:
            expense_category_name = category.get("name")
    
    expense = Expense(
        company_id=current_user["company_id"],
        created_by=current_user["user_id"],
        expense_category_name=expense_category_name,
        **data
    )
    expense_doc = expense.model_dump()
    expense_doc['created_at'] = expense_doc['created_at'].isoformat()
    await db.expenses.insert_one(expense_doc)
    return expense

@api_router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    # Get expense category name if provided
    if data.get("expense_category_id"):
        category = await db.expense_categories.find_one({"id": data["expense_category_id"]})
        if category:
            data["expense_category_name"] = category.get("name")
        else:
            data["expense_category_name"] = None
    elif "expense_category_id" in data and data["expense_category_id"] is None:
        data["expense_category_name"] = None
    
    result = await db.expenses.update_one(
        {"id": expense_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense updated"}

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ==================== CASH ====================

@api_router.get("/cash")
async def get_cash(current_user: dict = Depends(get_current_user)):
    """Kasa bakiyelerini hesapla"""
    # Rezervasyon gelirleri
    reservations = await db.reservations.find(
        {"company_id": current_user["company_id"], "status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).to_list(10000)
    
    # Extra sales gelirleri
    extra_sales = await db.extra_sales.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    # Tahsilatlar (transactions - payment type)
    payments = await db.transactions.find(
        {"company_id": current_user["company_id"], "transaction_type": "payment", "reference_type": {"$ne": "outgoing_payment"}},
        {"_id": 0}
    ).to_list(10000)
    
    # Ödemeler (outgoing payments)
    outgoing_payments = await db.transactions.find(
        {"company_id": current_user["company_id"], "reference_type": "outgoing_payment"},
        {"_id": 0}
    ).to_list(10000)
    
    # Döviz bozma işlemleri (exchange transactions)
    exchange_transactions = await db.transactions.find(
        {"company_id": current_user["company_id"], "reference_type": "currency_exchange"},
        {"_id": 0}
    ).to_list(10000)
    
    # Ekstra gelirler
    incomes = await db.incomes.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    # Giderler
    expenses = await db.expenses.find(
        {"company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    # Döviz bozma işlemleri (cash collection'larından)
    # Bu işlemler zaten transactions içinde olacak
    
    balance = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    
    # Rezervasyon gelirleri
    for r in reservations:
        balance[r["currency"]] += r["price"]
    
    # Extra sales gelirleri
    for s in extra_sales:
        balance[s["currency"]] += s["sale_price"]
    
    # Tahsilatlar
    for p in payments:
        balance[p["currency"]] += p["amount"]
    
    # Ödemeler (eksi)
    for op in outgoing_payments:
        balance[op["currency"]] -= op["amount"]
    
    # Ekstra gelirler
    for i in incomes:
        balance[i["currency"]] += i["amount"]
    
    # Giderler (eksi)
    for e in expenses:
        balance[e["currency"]] -= e["amount"]
    
    # Döviz bozma işlemleri (negatif ve pozitif tutarlar)
    for et in exchange_transactions:
        balance[et["currency"]] += et["amount"]  # amount zaten negatif veya pozitif olarak geliyor
    
    return {"balance": balance}

@api_router.post("/cash/exchange")
async def exchange_currency(data: dict, current_user: dict = Depends(get_current_user)):
    """Çift yönlü döviz bozma işlemi"""
    from_currency = data["from_currency"]
    to_currency = data.get("to_currency", "TRY")  # Varsayılan TRY
    amount = float(data["amount"])
    exchange_rate = float(data["exchange_rate"])
    date = data["date"]
    
    # Aynı para birimine çeviri yapılamaz
    if from_currency == to_currency:
        raise HTTPException(status_code=400, detail="Aynı para birimine çeviri yapılamaz")
    
    # To currency tutarı hesapla
    to_amount = amount * exchange_rate
    
    # Exchange ID oluştur (iki transaction'ı birleştirmek için)
    exchange_id = str(uuid.uuid4())
    
    # İki transaction oluştur:
    # 1. From currency için negatif (çıkış)
    transaction_out = Transaction(
        company_id=current_user["company_id"],
        cari_id="",  # Döviz bozma için cari yok
        transaction_type="exchange_out",
        amount=-amount,  # Negatif tutar
        currency=from_currency,
        exchange_rate=exchange_rate,
        description=f"Döviz Çevirisi (Çıkış): {amount} {from_currency} → {to_amount} {to_currency}",
        reference_id=exchange_id,
        reference_type="currency_exchange",
        date=date,
        created_by=current_user["user_id"]
    )
    transaction_out_doc = transaction_out.model_dump()
    transaction_out_doc['created_at'] = transaction_out_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_out_doc)
    
    # 2. To currency için pozitif (giriş)
    transaction_in = Transaction(
        company_id=current_user["company_id"],
        cari_id="",  # Döviz bozma için cari yok
        transaction_type="exchange_in",
        amount=to_amount,  # Pozitif tutar
        currency=to_currency,
        exchange_rate=1.0 if to_currency == "TRY" else (1.0 / exchange_rate),
        description=f"Döviz Çevirisi (Giriş): {to_amount} {to_currency}",
        reference_id=exchange_id,
        reference_type="currency_exchange",
        date=date,
        created_by=current_user["user_id"]
    )
    transaction_in_doc = transaction_in.model_dump()
    transaction_in_doc['created_at'] = transaction_in_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_in_doc)
    
    return {
        "message": "Currency exchanged",
        "from_amount": amount,
        "from_currency": from_currency,
        "to_amount": to_amount,
        "to_currency": to_currency,
        "exchange_rate": exchange_rate,
        "exchange_id": exchange_id
    }

@api_router.get("/cash/exchange-history")
async def get_exchange_history(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Döviz işlem geçmişini getir"""
    query = {
        "company_id": current_user["company_id"],
        "reference_type": "currency_exchange"
    }
    
    # Tarih filtresi
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    # Para birimi filtresi
    if currency:
        query["currency"] = currency
    
    # Tüm exchange transaction'larını getir
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).sort("created_at", -1).to_list(1000)
    
    # Exchange ID'ye göre grupla
    exchange_groups = {}
    for t in transactions:
        exchange_id = t.get("reference_id")
        if not exchange_id:
            continue
        
        if exchange_id not in exchange_groups:
            exchange_groups[exchange_id] = {
                "id": exchange_id,
                "date": t["date"],
                "created_at": t.get("created_at"),
                "from_transaction": None,
                "to_transaction": None
            }
        
        if t["transaction_type"] == "exchange_out":
            exchange_groups[exchange_id]["from_transaction"] = t
        elif t["transaction_type"] == "exchange_in":
            exchange_groups[exchange_id]["to_transaction"] = t
    
    # Grupları listeye çevir
    exchange_history = []
    for exchange_id, group in exchange_groups.items():
        if group["from_transaction"] and group["to_transaction"]:
            from_t = group["from_transaction"]
            to_t = group["to_transaction"]
            
            exchange_history.append({
                "id": exchange_id,
                "date": group["date"],
                "created_at": group["created_at"],
                "from_currency": from_t["currency"],
                "from_amount": abs(from_t["amount"]),
                "to_currency": to_t["currency"],
                "to_amount": to_t["amount"],
                "exchange_rate": from_t.get("exchange_rate", 0),
                "description": from_t.get("description", "")
            })
    
    return exchange_history

@api_router.delete("/cash/exchange/{exchange_id}")
async def delete_exchange(exchange_id: str, current_user: dict = Depends(get_current_user)):
    """Döviz işlemini sil"""
    # Exchange ID'ye sahip tüm transaction'ları bul
    transactions = await db.transactions.find({
        "company_id": current_user["company_id"],
        "reference_id": exchange_id,
        "reference_type": "currency_exchange"
    }).to_list(10)
    
    if not transactions:
        raise HTTPException(status_code=404, detail="Exchange transaction not found")
    
    # Tüm transaction'ları sil
    result = await db.transactions.delete_many({
        "company_id": current_user["company_id"],
        "reference_id": exchange_id,
        "reference_type": "currency_exchange"
    })
    
    return {"message": "Exchange transaction deleted", "deleted_count": result.deleted_count}

@api_router.get("/cash/statistics")
async def get_cash_statistics(current_user: dict = Depends(get_current_user)):
    """Kasa istatistiklerini getir"""
    # Kasa bakiyelerini al
    cash_response = await get_cash(current_user)
    balance = cash_response["balance"]
    
    # Güncel kurları al (currency/rates endpoint'inden)
    try:
        rates_response = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        rates = {
            "EUR": rates_response.get("currency_rates", {}).get("EUR", 1.0) if rates_response.get("currency_rates") else 1.0,
            "USD": rates_response.get("currency_rates", {}).get("USD", 35.0) if rates_response.get("currency_rates") else 35.0,
            "TRY": 1.0
        }
    except:
        rates = {"EUR": 1.0, "USD": 35.0, "TRY": 1.0}
    
    # TRY değerlerini hesapla
    eur_try_value = balance["EUR"] * (rates.get("EUR", 1.0) if rates.get("EUR") else 1.0)
    usd_try_value = balance["USD"] * (rates.get("USD", 35.0) if rates.get("USD") else 35.0)
    try_value = balance["TRY"]
    
    total_try_value = eur_try_value + usd_try_value + try_value
    
    # Para birimi dağılımı
    distribution = {}
    if total_try_value > 0:
        distribution["EUR"] = (eur_try_value / total_try_value) * 100
        distribution["USD"] = (usd_try_value / total_try_value) * 100
        distribution["TRY"] = (try_value / total_try_value) * 100
    else:
        distribution = {"EUR": 0, "USD": 0, "TRY": 0}
    
    return {
        "balance": balance,
        "try_values": {
            "EUR": eur_try_value,
            "USD": usd_try_value,
            "TRY": try_value
        },
        "total_try_value": total_try_value,
        "distribution": distribution,
        "rates": rates
    }

# ==================== ADMIN ENDPOINTS ====================

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Admin kullanıcı kontrolü"""
    # System admin kontrolü (company_code = "1000")
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    company = await db.companies.find_one({"id": current_user["company_id"]})
    if not company:
        raise HTTPException(status_code=401, detail="Company not found")
    
    is_system_admin = company.get("company_code") == "1000"
    is_owner = user.get("is_admin", False) or user.get("role") == "owner"
    
    if not is_system_admin:
        raise HTTPException(status_code=403, detail="Only system admins can access this endpoint")
    
    return current_user

@api_router.get("/admin/customers")
async def get_admin_customers(current_user: dict = Depends(get_admin_user)):
    """Sistem admin için tüm müşterileri (şirketleri) listele"""
    # Tüm şirketleri getir (system admin hariç)
    companies = await db.companies.find(
        {"company_code": {"$ne": "1000"}},
        {"_id": 0}
    ).sort("company_name", 1).to_list(10000)
    
    # Her şirket için owner kullanıcıyı bul
    result = []
    for company in companies:
        # Owner kullanıcıyı bul (is_admin=True veya role="owner")
        owner = await db.users.find_one(
            {
                "company_id": company["id"],
                "$or": [
                    {"is_admin": True},
                    {"role": "owner"}
                ]
            },
            {"_id": 0, "password": 0}
        )
        
        company_data = {
            "id": company["id"],
            "company_code": company.get("company_code", ""),
            "company_name": company.get("company_name", ""),
            "email": company.get("email"),
            "package_start_date": company.get("package_start_date"),
            "package_end_date": company.get("package_end_date"),
            "owner": owner
        }
        result.append(company_data)
    
    return result

@api_router.get("/admin/customers/{company_id}")
async def get_admin_customer(company_id: str, current_user: dict = Depends(get_admin_user)):
    """Sistem admin için tek bir müşteriyi (şirketi) getir"""
    company = await db.companies.find_one(
        {"id": company_id, "company_code": {"$ne": "1000"}},
        {"_id": 0}
    )
    
    if not company:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Owner kullanıcıyı bul
    owner = await db.users.find_one(
        {
            "company_id": company_id,
            "$or": [
                {"is_admin": True},
                {"role": "owner"}
            ]
        },
        {"_id": 0, "password": 0}
    )
    
    return {
        "id": company["id"],
        "company_code": company.get("company_code", ""),
        "company_name": company.get("company_name", ""),
        "email": company.get("email"),
        "package_start_date": company.get("package_start_date"),
        "package_end_date": company.get("package_end_date"),
        "owner": owner
    }

@api_router.post("/admin/impersonate")
async def admin_impersonate(data: dict, current_user: dict = Depends(get_admin_user)):
    """Sistem admin için müşteri hesabına geçiş (impersonate)"""
    company_id = data.get("company_id")
    user_id = data.get("user_id")
    
    if not company_id or not user_id:
        raise HTTPException(status_code=400, detail="company_id and user_id are required")
    
    # Şirketi kontrol et (system admin olamaz)
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if company.get("company_code") == "1000":
        raise HTTPException(status_code=403, detail="Cannot impersonate system admin")
    
    # Kullanıcıyı kontrol et
    user = await db.users.find_one({"id": user_id, "company_id": company_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Yeni token oluştur (impersonate için)
    token = create_access_token({
        "sub": user["id"],
        "company_id": company_id,
        "is_admin": user.get("is_admin", False),
        "impersonated_by": current_user["user_id"]  # Hangi admin tarafından impersonate edildi
    })
    
    return {
        "token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "email": user.get("email"),
            "is_admin": user.get("is_admin", False),
            "permissions": user.get("permissions", {})
        },
        "company": {
            "id": company["id"],
            "name": company.get("company_name", ""),
            "code": company.get("company_code", "")
        }
    }

# ==================== STAFF SALARY MANAGEMENT ====================

@api_router.get("/users/{user_id}/detail")
async def get_user_detail(user_id: str, current_user: dict = Depends(get_current_user)):
    """Personel detay bilgilerini getir - maaş, fazla mesai, izin bilgileri ile"""
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_user["company_id"]
    }, {"_id": 0, "password": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    # Salary transactions
    salary_transactions = await db.salary_transactions.find(
        {"user_id": user_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(100)
    
    # Overtime records
    overtime_records = await db.overtimes.find(
        {"user_id": user_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    unpaid_overtime = [o for o in overtime_records if not o.get("is_paid")]
    unpaid_overtime_hours = sum(o.get("hours", 0) for o in unpaid_overtime)
    
    # Leave records
    leave_records = await db.leaves.find(
        {"user_id": user_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    ).sort("start_date", -1).to_list(100)
    
    # Bu yıl kullanılan izin günleri
    current_year = datetime.now(timezone.utc).year
    year_leaves = [l for l in leave_records if l.get("start_date", "")[:4] == str(current_year)]
    used_leave_days = sum(l.get("days", 0) for l in year_leaves if l.get("is_paid", False))
    
    # Maaş ödeme durumu kontrolü
    today = datetime.now(timezone.utc)
    salary_payment_day = user.get("salary_payment_day")
    last_paid_date = user.get("last_salary_paid_date")
    
    is_salary_due = False
    if salary_payment_day and user.get("net_salary"):
        # Bu ayın maaş gününü kontrol et
        current_month = today.month
        current_year = today.year
        try:
            salary_due_date = datetime(current_year, current_month, salary_payment_day, tzinfo=timezone.utc)
        except ValueError:
            # Ayın son günü (örn: 31. günü olmayan aylar için)
            last_day = (datetime(current_year, current_month + 1, 1) - timedelta(days=1)).day
            salary_due_date = datetime(current_year, current_month, min(salary_payment_day, last_day), tzinfo=timezone.utc)
        
        # Maaş günü geçmişse ve henüz ödenmemişse
        if today >= salary_due_date:
            if not last_paid_date or last_paid_date < salary_due_date.strftime("%Y-%m-%d"):
                is_salary_due = True
    
    return {
        "user": user,
        "salary_transactions": salary_transactions,
        "overtime_records": overtime_records,
        "unpaid_overtime_hours": unpaid_overtime_hours,
        "leave_records": leave_records,
        "used_leave_days": used_leave_days,
        "is_salary_due": is_salary_due,
        "current_balance": user.get("current_balance", 0),
        "current_balance_currency": user.get("current_balance_currency", "TRY")
    }

@api_router.post("/users/{user_id}/pay-salary")
async def pay_salary(
    user_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Personel maaşını öde - bakiye sıfırlanır ve cari hesaba eklenir"""
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_user["company_id"]
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Pasif personel için maaş ödenemez")
    
    amount = data.get("amount") or user.get("net_salary", 0)
    currency = data.get("currency") or user.get("salary_currency", "TRY")
    payment_date = data.get("payment_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    description = data.get("description") or f"Maaş ödemesi - {user.get('full_name', '')}"
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Maaş tutarı 0'dan büyük olmalıdır")
    
    # Mevcut bakiyeyi al
    current_balance = user.get("current_balance", 0) or 0
    balance_currency = user.get("current_balance_currency", "TRY")
    
    # Ödeme tutarı bakiyeden düş - bakiye sıfırlanır
    new_balance = 0.0
    
    # Salary transaction oluştur
    salary_transaction = SalaryTransaction(
        company_id=current_user["company_id"],
        user_id=user_id,
        transaction_type="salary_payment",
        amount=amount,
        currency=currency,
        exchange_rate=data.get("exchange_rate", 1.0),
        description=description,
        payment_date=payment_date,
        created_by=current_user["user_id"]
    )
    salary_transaction_doc = salary_transaction.model_dump()
    salary_transaction_doc['created_at'] = salary_transaction_doc['created_at'].isoformat()
    await db.salary_transactions.insert_one(salary_transaction_doc)
    
    # Personel bakiyesini güncelle
    await db.users.update_one(
        {"id": user_id, "company_id": current_user["company_id"]},
        {"$set": {
            "current_balance": new_balance,
            "current_balance_currency": currency,
            "last_salary_paid_date": payment_date,
            "last_salary_paid_amount": amount,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Cari hesaba ekle - Personel maaş cari hesabı bul veya oluştur
    staff_cari = await db.cari_accounts.find_one({
        "company_id": current_user["company_id"],
        "staff_user_id": user_id
    })
    
    if not staff_cari:
        # Personel için cari hesap oluştur
        staff_cari = CariAccount(
            company_id=current_user["company_id"],
            name=f"Personel: {user.get('full_name', '')}",
            is_staff_payment=True,
            staff_user_id=user_id
        )
        staff_cari_doc = staff_cari.model_dump()
        staff_cari_doc['created_at'] = staff_cari_doc['created_at'].isoformat()
        await db.cari_accounts.insert_one(staff_cari_doc)
        staff_cari_id = staff_cari.id
    else:
        staff_cari_id = staff_cari["id"]
    
    # Cari hesap bakiyesini güncelle (maaş ödemesi = gider = biz borçluyuz)
    balance_field = f"balance_{currency.lower()}"
    current_cari_balance = staff_cari.get(balance_field, 0) or 0
    new_cari_balance = current_cari_balance - amount
    
    await db.cari_accounts.update_one(
        {"id": staff_cari_id},
        {"$set": {balance_field: new_cari_balance}}
    )
    
    # Transaction kaydı oluştur (cari hesap için)
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=staff_cari_id,
        transaction_type="expense",
        amount=amount,
        currency=currency,
        exchange_rate=data.get("exchange_rate", 1.0),
        reference_type="salary_payment",
        reference_id=user_id,
        description=f"Maaş ödemesi: {user.get('full_name', '')} - {description}",
        date=payment_date,
        created_by=current_user["user_id"]
    )
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="pay_salary",
        entity_type="user",
        entity_id=user_id,
        entity_name=user.get("full_name", ""),
        description=f"Maaş ödemesi: {amount} {currency}",
        changes={"amount": amount, "currency": currency, "payment_date": payment_date}
    )
    
    return {
        "message": "Maaş ödendi",
        "amount": amount,
        "currency": currency,
        "new_balance": new_balance
    }

@api_router.post("/users/{user_id}/add-advance")
async def add_advance(
    user_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Personel avans ekle - bakiye artar ve cari hesaba eklenir"""
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_user["company_id"]
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    amount = data.get("amount", 0)
    currency = data.get("currency") or user.get("salary_currency", "TRY")
    payment_date = data.get("payment_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    description = data.get("description") or f"Avans ödemesi - {user.get('full_name', '')}"
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Avans tutarı 0'dan büyük olmalıdır")
    
    # Avans limiti kontrolü
    advance_limit = user.get("advance_limit")
    current_balance = user.get("current_balance", 0) or 0
    balance_currency = user.get("current_balance_currency", "TRY")
    
    # Avans limiti kontrolü (sadece aynı para biriminde)
    if advance_limit and currency == balance_currency:
        if current_balance + amount > advance_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Avans limiti ({advance_limit} {currency}) aşıldı. Mevcut bakiye: {current_balance} {balance_currency}"
            )
    
    # Yeni bakiye hesapla
    # Avans = personel bize borçlu (pozitif bakiye artar)
    if balance_currency == currency:
        new_balance = current_balance + amount
    else:
        # Para birimi farklıysa sadece yeni para biriminde bakiye oluştur
        new_balance = amount
        balance_currency = currency
    
    # Salary transaction oluştur
    salary_transaction = SalaryTransaction(
        company_id=current_user["company_id"],
        user_id=user_id,
        transaction_type="advance_payment",
        amount=amount,
        currency=currency,
        exchange_rate=data.get("exchange_rate", 1.0),
        description=description,
        payment_date=payment_date,
        created_by=current_user["user_id"]
    )
    salary_transaction_doc = salary_transaction.model_dump()
    salary_transaction_doc['created_at'] = salary_transaction_doc['created_at'].isoformat()
    await db.salary_transactions.insert_one(salary_transaction_doc)
    
    # Personel bakiyesini güncelle
    await db.users.update_one(
        {"id": user_id, "company_id": current_user["company_id"]},
        {"$set": {
            "current_balance": new_balance,
            "current_balance_currency": balance_currency,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Cari hesaba ekle
    staff_cari = await db.cari_accounts.find_one({
        "company_id": current_user["company_id"],
        "staff_user_id": user_id
    })
    
    if not staff_cari:
        staff_cari = CariAccount(
            company_id=current_user["company_id"],
            name=f"Personel: {user.get('full_name', '')}",
            is_staff_payment=True,
            staff_user_id=user_id
        )
        staff_cari_doc = staff_cari.model_dump()
        staff_cari_doc['created_at'] = staff_cari_doc['created_at'].isoformat()
        await db.cari_accounts.insert_one(staff_cari_doc)
        staff_cari_id = staff_cari.id
    else:
        staff_cari_id = staff_cari["id"]
    
    # Cari hesap bakiyesini güncelle (avans = gider = biz borçluyuz)
    balance_field = f"balance_{currency.lower()}"
    current_cari_balance = staff_cari.get(balance_field, 0) or 0
    new_cari_balance = current_cari_balance - amount
    
    await db.cari_accounts.update_one(
        {"id": staff_cari_id},
        {"$set": {balance_field: new_cari_balance}}
    )
    
    # Transaction kaydı
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=staff_cari_id,
        transaction_type="expense",
        amount=amount,
        currency=currency,
        exchange_rate=data.get("exchange_rate", 1.0),
        reference_type="advance_payment",
        reference_id=user_id,
        description=f"Avans ödemesi: {user.get('full_name', '')} - {description}",
        date=payment_date,
        created_by=current_user["user_id"]
    )
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    # Activity log
    await create_activity_log(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        username=current_user.get("username", ""),
        full_name=current_user.get("full_name", ""),
        action="add_advance",
        entity_type="user",
        entity_id=user_id,
        entity_name=user.get("full_name", ""),
        description=f"Avans eklendi: {amount} {currency}",
        changes={"amount": amount, "currency": currency, "payment_date": payment_date}
    )
    
    return {
        "message": "Avans eklendi",
        "amount": amount,
        "currency": currency,
        "new_balance": new_balance
    }

@api_router.get("/users/{user_id}/overtime")
async def get_user_overtime(user_id: str, current_user: dict = Depends(get_current_user)):
    """Personel fazla mesai kayıtlarını getir"""
    overtime_records = await db.overtimes.find(
        {"user_id": user_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    return overtime_records

@api_router.post("/users/{user_id}/overtime")
async def add_overtime(
    user_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Personel fazla mesai ekle"""
    user = await db.users.find_one({"id": user_id, "company_id": current_user["company_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    hours = data.get("hours", 0)
    hourly_rate = data.get("hourly_rate")
    currency = data.get("currency") or user.get("salary_currency", "TRY")
    
    # Saatlik ücret yoksa net maaştan hesapla (ayda 160 saat varsayımı)
    if not hourly_rate and user.get("net_salary"):
        hourly_rate = user.get("net_salary") / 160
    
    amount = hours * (hourly_rate or 0)
    
    overtime = Overtime(
        company_id=current_user["company_id"],
        user_id=user_id,
        date=data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        hours=hours,
        hourly_rate=hourly_rate,
        amount=amount,
        currency=currency,
        description=data.get("description"),
        created_by=current_user["user_id"]
    )
    overtime_doc = overtime.model_dump()
    overtime_doc['created_at'] = overtime_doc['created_at'].isoformat()
    await db.overtimes.insert_one(overtime_doc)
    
    return overtime

@api_router.put("/users/{user_id}/overtime/{overtime_id}/pay")
async def pay_overtime(
    user_id: str,
    overtime_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Fazla mesai ödemesi yap - bakiye artar ve cari hesaba eklenir"""
    overtime = await db.overtimes.find_one({
        "id": overtime_id,
        "user_id": user_id,
        "company_id": current_user["company_id"]
    })
    
    if not overtime:
        raise HTTPException(status_code=404, detail="Fazla mesai kaydı bulunamadı")
    
    if overtime.get("is_paid"):
        raise HTTPException(status_code=400, detail="Bu fazla mesai zaten ödenmiş")
    
    user = await db.users.find_one({"id": user_id, "company_id": current_user["company_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    amount = overtime.get("amount", 0)
    currency = overtime.get("currency", "TRY")
    payment_date = data.get("payment_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Personel bakiyesini artır (fazla mesai = ek ödeme = personel alacaklı)
    current_balance = user.get("current_balance", 0) or 0
    balance_currency = user.get("current_balance_currency", "TRY")
    
    if balance_currency == currency:
        new_balance = current_balance - amount  # Negatif = personel alacaklı
    else:
        new_balance = -amount
        balance_currency = currency
    
    # Salary transaction oluştur
    salary_transaction = SalaryTransaction(
        company_id=current_user["company_id"],
        user_id=user_id,
        transaction_type="overtime_payment",
        amount=amount,
        currency=currency,
        exchange_rate=data.get("exchange_rate", 1.0),
        description=f"Fazla mesai ödemesi: {overtime.get('hours', 0)} saat",
        payment_date=payment_date,
        reference_id=overtime_id,
        created_by=current_user["user_id"]
    )
    salary_transaction_doc = salary_transaction.model_dump()
    salary_transaction_doc['created_at'] = salary_transaction_doc['created_at'].isoformat()
    await db.salary_transactions.insert_one(salary_transaction_doc)
    
    # Fazla mesaiyi ödendi olarak işaretle
    await db.overtimes.update_one(
        {"id": overtime_id},
        {"$set": {
            "is_paid": True,
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Personel bakiyesini güncelle
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "current_balance": new_balance,
            "current_balance_currency": balance_currency,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Cari hesaba ekle
    staff_cari = await db.cari_accounts.find_one({
        "company_id": current_user["company_id"],
        "staff_user_id": user_id
    })
    
    if not staff_cari:
        staff_cari = CariAccount(
            company_id=current_user["company_id"],
            name=f"Personel: {user.get('full_name', '')}",
            is_staff_payment=True,
            staff_user_id=user_id
        )
        staff_cari_doc = staff_cari.model_dump()
        staff_cari_doc['created_at'] = staff_cari_doc['created_at'].isoformat()
        await db.cari_accounts.insert_one(staff_cari_doc)
        staff_cari_id = staff_cari.id
    else:
        staff_cari_id = staff_cari["id"]
    
    balance_field = f"balance_{currency.lower()}"
    current_cari_balance = staff_cari.get(balance_field, 0) or 0
    new_cari_balance = current_cari_balance - amount
    
    await db.cari_accounts.update_one(
        {"id": staff_cari_id},
        {"$set": {balance_field: new_cari_balance}}
    )
    
    # Transaction kaydı
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=staff_cari_id,
        transaction_type="expense",
        amount=amount,
        currency=currency,
        exchange_rate=data.get("exchange_rate", 1.0),
        reference_type="overtime_payment",
        reference_id=overtime_id,
        description=f"Fazla mesai ödemesi: {user.get('full_name', '')}",
        date=payment_date,
        created_by=current_user["user_id"]
    )
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    return {"message": "Fazla mesai ödemesi yapıldı", "amount": amount}

@api_router.get("/users/{user_id}/leaves")
async def get_user_leaves(user_id: str, current_user: dict = Depends(get_current_user)):
    """Personel izin kayıtlarını getir"""
    leave_records = await db.leaves.find(
        {"user_id": user_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    ).sort("start_date", -1).to_list(100)
    return leave_records

@api_router.post("/users/{user_id}/leaves")
async def add_leave(
    user_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Personel izin ekle"""
    user = await db.users.find_one({"id": user_id, "company_id": current_user["company_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    # Tarih aralığından gün sayısını hesapla
    start_date = datetime.strptime(data.get("start_date"), "%Y-%m-%d")
    end_date = datetime.strptime(data.get("end_date"), "%Y-%m-%d")
    days = (end_date - start_date).days + 1
    
    leave = Leave(
        company_id=current_user["company_id"],
        user_id=user_id,
        leave_type=data.get("leave_type", "annual"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        days=days,
        is_paid=data.get("is_paid", False),
        description=data.get("description"),
        created_by=current_user["user_id"]
    )
    leave_doc = leave.model_dump()
    leave_doc['created_at'] = leave_doc['created_at'].isoformat()
    await db.leaves.insert_one(leave_doc)
    
    return leave

@api_router.post("/staff/process-monthly-salaries")
async def process_monthly_salaries(
    month: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Belirlenen maaş günü gelince personelleri otomatik olarak alacaklı yap"""
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    year, month_num = month.split("-")
    year = int(year)
    month_num = int(month_num)
    
    # Tüm aktif personelleri getir
    users = await db.users.find({
        "company_id": current_user["company_id"],
        "is_active": True,
        "salary_payment_day": {"$exists": True, "$ne": None},
        "net_salary": {"$exists": True, "$ne": None, "$gt": 0}
    }, {"_id": 0}).to_list(1000)
    
    processed = []
    
    for user in users:
        salary_payment_day = user.get("salary_payment_day")
        net_salary = user.get("net_salary")
        salary_currency = user.get("salary_currency", "TRY")
        
        if not salary_payment_day or not net_salary:
            continue
        
        # Bu ayın maaş günü
        try:
            salary_due_date = datetime(year, month_num, salary_payment_day, tzinfo=timezone.utc)
        except ValueError:
            # Ayın son günü (örn: 31. günü olmayan aylar için)
            last_day = (datetime(year, month_num + 1, 1) - timedelta(days=1)).day
            salary_due_date = datetime(year, month_num, min(salary_payment_day, last_day), tzinfo=timezone.utc)
        
        last_paid_date = user.get("last_salary_paid_date")
        
        # Bu ayın maaşı henüz ödenmemişse ve maaş günü geçmişse
        if (not last_paid_date or last_paid_date < salary_due_date.strftime("%Y-%m-%d")):
            # Personel bakiyesini artır (maş ödenmemiş = personel alacaklı = negatif bakiye)
            current_balance = user.get("current_balance", 0) or 0
            balance_currency = user.get("current_balance_currency", "TRY")
            
            if balance_currency == salary_currency:
                new_balance = current_balance - net_salary  # Negatif = personel alacaklı
            else:
                new_balance = -net_salary
                balance_currency = salary_currency
            
            # Personel bakiyesini güncelle
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "current_balance": new_balance,
                    "current_balance_currency": balance_currency,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            processed.append({
                "user_id": user["id"],
                "user_name": user.get("full_name"),
                "amount": net_salary,
                "currency": salary_currency
            })
    
    return {
        "message": f"{len(processed)} personel için maaş borçlandırması yapıldı",
        "processed": processed
    }

# ==================== COMPANY PROFILE ENDPOINTS ====================

@api_router.get("/company/profile")
async def get_company_profile(current_user: dict = Depends(get_current_user)):
    """Firma profil bilgilerini getir"""
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return company

@api_router.put("/company/profile")
async def update_company_profile(data: dict, current_user: dict = Depends(get_current_user)):
    """Firma profil bilgilerini güncelle (sadece değiştirilebilir alanlar)"""
    company = await db.companies.find_one({"id": current_user["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Sadece değiştirilebilir alanları güncelle
    update_data = {}
    if "website" in data:
        update_data["website"] = data["website"]
    if "social_media" in data:
        update_data["social_media"] = data["social_media"]
    if "bank_info" in data:
        update_data["bank_info"] = data["bank_info"]
    
    if update_data:
        await db.companies.update_one(
            {"id": current_user["company_id"]},
            {"$set": update_data}
        )
    
    # Güncellenmiş firmayı getir
    updated_company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    return updated_company

@api_router.post("/company/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Firma logosunu yükle"""
    # Logo klasörünü oluştur
    logo_dir = ROOT_DIR / "uploads" / "logos"
    logo_dir.mkdir(parents=True, exist_ok=True)
    
    # Dosya uzantısını kontrol et
    allowed_extensions = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPG, JPEG, GIF, SVG, WEBP")
    
    # Dosya boyutunu kontrol et (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size too large. Maximum 5MB")
    
    # Dosyayı kaydet
    company_id = current_user["company_id"]
    logo_filename = f"{company_id}{file_ext}"
    logo_path = logo_dir / logo_filename
    
    # Eski logoyu sil (varsa)
    for ext in allowed_extensions:
        old_logo = logo_dir / f"{company_id}{ext}"
        if old_logo.exists():
            old_logo.unlink()
    
    # Yeni logoyu kaydet
    with open(logo_path, "wb") as f:
        f.write(file_content)
    
    # Logo URL'ini oluştur (base64 veya file path)
    # Base64 formatında döndür (PDF'lerde kullanmak için)
    logo_base64 = base64.b64encode(file_content).decode('utf-8')
    logo_data_url = f"data:{file.content_type};base64,{logo_base64}"
    
    # Company'ye logo bilgisini ekle
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "logo": logo_data_url,
            "logo_filename": logo_filename,
            "logo_path": str(logo_path.relative_to(ROOT_DIR))
        }}
    )
    
    return {
        "message": "Logo uploaded successfully",
        "logo": logo_data_url,
        "filename": logo_filename
    }

@api_router.delete("/company/logo")
async def delete_company_logo(current_user: dict = Depends(get_current_user)):
    """Firma logosunu sil"""
    company = await db.companies.find_one({"id": current_user["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Logo dosyasını sil
    logo_path = company.get("logo_path")
    if logo_path:
        full_path = ROOT_DIR / logo_path
        if full_path.exists():
            full_path.unlink()
    
    # Company'den logo bilgisini kaldır
    await db.companies.update_one(
        {"id": current_user["company_id"]},
        {"$unset": {"logo": "", "logo_filename": "", "logo_path": ""}}
    )
    
    return {"message": "Logo deleted successfully"}

# ==================== EXPENSES ====================

@api_router.get("/expense-categories")
async def get_expense_categories(current_user: dict = Depends(get_current_user)):
    """Gider kategorilerini getir"""
    categories = await db.expense_categories.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("name", 1).to_list(1000)
    return categories

@api_router.post("/expense-categories")
async def create_expense_category(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni gider kategorisi oluştur"""
    category_doc = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "name": data.get("name"),
        "description": data.get("description", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.expense_categories.insert_one(category_doc)
    return {**category_doc, "_id": None}

@api_router.get("/expenses")
async def get_expenses(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Giderleri getir"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    if currency:
        query["currency"] = currency
    
    if category_id:
        query["expense_category_id"] = category_id
    
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Kategori isimlerini ekle
    for expense in expenses:
        if expense.get("expense_category_id"):
            category = await db.expense_categories.find_one(
                {"id": expense["expense_category_id"]},
                {"_id": 0, "name": 1}
            )
            if category:
                expense["expense_category_name"] = category.get("name")
    
    return expenses

@api_router.post("/expenses")
async def create_expense(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni gider oluştur"""
    expense_doc = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "expense_category_id": data.get("expense_category_id"),
        "payment_type_id": data.get("payment_type_id"),
        "description": data.get("description", ""),
        "amount": data.get("amount", 0),
        "currency": data.get("currency", "TRY"),
        "exchange_rate": data.get("exchange_rate", 1.0),
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    
    await db.expenses.insert_one(expense_doc)
    
    # Eğer payment_type_id ve cari_id varsa, transaction kaydı oluştur
    cari_id = data.get("cari_id")
    if data.get("payment_type_id") and cari_id:
        payment_type = await db.payment_types.find_one({"id": data.get("payment_type_id")}, {"_id": 0})
        if payment_type:
            payment_code = payment_type.get("code")
            
            # Kullanılabilir tutardan düşmek için transaction oluştur
            # Payment transaction oluştur (negatif amount ile)
            transaction_doc = {
                "id": str(uuid.uuid4()),
                "company_id": current_user["company_id"],
                "cari_id": cari_id,
                "transaction_type": "payment",
                "amount": -data.get("amount", 0),  # Negatif tutar (gider)
                "net_amount": -data.get("amount", 0),
                "currency": data.get("currency", "TRY"),
                "exchange_rate": data.get("exchange_rate", 1.0),
                "payment_type_id": data.get("payment_type_id"),
                "payment_type_name": payment_type.get("name"),
                "payment_method": payment_code,
                "description": f"Gider: {data.get('description', '')}",
                "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                "time": datetime.now(timezone.utc).strftime("%H:%M"),
                "reference_id": expense_doc["id"],
                "reference_type": "expense",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user["user_id"]
            }
            
            # Cash account seç (payment_type'a göre)
            cash_account = None
            if payment_code == "cash":
                # Nakit kasası bul
                cash_account = await db.cash_accounts.find_one({
                    "company_id": current_user["company_id"],
                    "account_type": "cash",
                    "currency": data.get("currency", "TRY"),
                    "is_active": True
                }, {"_id": 0})
            elif payment_code == "bank_transfer":
                # Banka hesabı cash_account'u bul
                cash_account = await db.cash_accounts.find_one({
                    "company_id": current_user["company_id"],
                    "account_type": "bank_account",
                    "currency": data.get("currency", "TRY"),
                    "is_active": True
                }, {"_id": 0})
            
            if cash_account:
                transaction_doc["cash_account_id"] = cash_account["id"]
                
                # Banka hesabı için bank_account_id de ekle
                if payment_code == "bank_transfer":
                    bank_account = await db.bank_accounts.find_one({
                        "company_id": current_user["company_id"],
                        "account_type": "bank_account",
                        "currency": data.get("currency", "TRY"),
                        "is_active": True
                    }, {"_id": 0})
                    if bank_account:
                        transaction_doc["bank_account_id"] = bank_account["id"]
                
                await db.transactions.insert_one(transaction_doc)
                
                # Cash account bakiyesini güncelle (gider = bakiye azalır)
                await db.cash_accounts.update_one(
                    {"id": cash_account["id"]},
                    {"$inc": {"current_balance": transaction_doc["amount"]}}
                )
    
    return {**expense_doc, "_id": None}

@api_router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Gideri güncelle"""
    existing = await db.expenses.find_one({
        "id": expense_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = {}
    if "description" in data:
        update_data["description"] = data["description"]
    if "expense_category_id" in data:
        update_data["expense_category_id"] = data["expense_category_id"]
    if "payment_type_id" in data:
        update_data["payment_type_id"] = data["payment_type_id"]
    if "amount" in data:
        update_data["amount"] = data["amount"]
    if "currency" in data:
        update_data["currency"] = data["currency"]
    if "exchange_rate" in data:
        update_data["exchange_rate"] = data["exchange_rate"]
    if "date" in data:
        update_data["date"] = data["date"]
    if "notes" in data:
        update_data["notes"] = data["notes"]
    
    await db.expenses.update_one(
        {"id": expense_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Expense updated"}

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    """Gideri sil"""
    existing = await db.expenses.find_one({
        "id": expense_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # İlgili transaction'ı bul ve sil
    transaction = await db.transactions.find_one({
        "company_id": current_user["company_id"],
        "reference_type": "expense",
        "reference_id": expense_id
    })
    
    if transaction:
        # Transaction'ı sil
        await db.transactions.delete_one({"id": transaction["id"]})
        
        # Cash account bakiyesini geri al
        cash_account_id = transaction.get("cash_account_id")
        if cash_account_id:
            amount = transaction.get("amount", 0)
            await db.cash_accounts.update_one(
                {"id": cash_account_id},
                {"$inc": {"current_balance": -amount}}
            )
    
    await db.expenses.delete_one({"id": expense_id, "company_id": current_user["company_id"]})
    
    return {"message": "Expense deleted"}

@api_router.get("/expenses/statistics")
async def get_expense_statistics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gider istatistiklerini getir"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    total_by_currency = {"EUR": 0, "USD": 0, "TRY": 0}
    total_by_category = {}
    
    for expense in expenses:
        currency = expense.get("currency", "TRY")
        amount = expense.get("amount", 0)
        total_by_currency[currency] += amount
        
        category_id = expense.get("expense_category_id")
        if category_id:
            if category_id not in total_by_category:
                category = await db.expense_categories.find_one({"id": category_id}, {"_id": 0, "name": 1})
                total_by_category[category_id] = {
                    "name": category.get("name", "Bilinmeyen") if category else "Bilinmeyen",
                    "total": 0
                }
            total_by_category[category_id]["total"] += amount
    
    return {
        "total_by_currency": total_by_currency,
        "total_by_category": list(total_by_category.values()),
        "total_expenses": len(expenses)
    }

# ==================== INCOME ====================

@api_router.get("/income-categories")
async def get_income_categories(current_user: dict = Depends(get_current_user)):
    """Gelir kategorilerini getir"""
    categories = await db.income_categories.find(
        {"company_id": current_user["company_id"], "is_active": True},
        {"_id": 0}
    ).sort("name", 1).to_list(1000)
    return categories

@api_router.post("/income-categories")
async def create_income_category(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni gelir kategorisi oluştur"""
    category_doc = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "name": data.get("name"),
        "description": data.get("description", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.income_categories.insert_one(category_doc)
    return {**category_doc, "_id": None}

@api_router.put("/income-categories/{category_id}")
async def update_income_category(category_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Gelir kategorisini güncelle"""
    existing = await db.income_categories.find_one({
        "id": category_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Income category not found")
    
    update_data = {}
    if "name" in data:
        update_data["name"] = data["name"]
    if "description" in data:
        update_data["description"] = data["description"]
    if "is_active" in data:
        update_data["is_active"] = data["is_active"]
    
    await db.income_categories.update_one(
        {"id": category_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Income category updated"}

@api_router.delete("/income-categories/{category_id}")
async def delete_income_category(category_id: str, current_user: dict = Depends(get_current_user)):
    """Gelir kategorisini sil"""
    existing = await db.income_categories.find_one({
        "id": category_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Income category not found")
    
    await db.income_categories.delete_one({"id": category_id, "company_id": current_user["company_id"]})
    
    return {"message": "Income category deleted"}

@api_router.get("/income")
async def get_incomes(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gelirleri getir"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    if currency:
        query["currency"] = currency
    
    if category_id:
        query["income_category_id"] = category_id
    
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    incomes = await db.incomes.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Kategori isimlerini ekle
    for income in incomes:
        if income.get("income_category_id"):
            category = await db.income_categories.find_one(
                {"id": income["income_category_id"]},
                {"_id": 0, "name": 1}
            )
            if category:
                income["income_category_name"] = category.get("name")
    
    return incomes

@api_router.post("/income")
async def create_income(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni gelir oluştur"""
    income_doc = {
        "id": str(uuid.uuid4()),
        "company_id": current_user["company_id"],
        "income_category_id": data.get("income_category_id"),
        "payment_type_id": data.get("payment_type_id"),
        "description": data.get("description", ""),
        "amount": data.get("amount", 0),
        "currency": data.get("currency", "TRY"),
        "exchange_rate": data.get("exchange_rate", 1.0),
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    
    await db.incomes.insert_one(income_doc)
    
    # Eğer payment_type_id ve cari_id varsa, transaction kaydı oluştur
    cari_id = data.get("cari_id")
    if data.get("payment_type_id") and cari_id:
        payment_type = await db.payment_types.find_one({"id": data.get("payment_type_id")}, {"_id": 0})
        if payment_type:
            payment_code = payment_type.get("code")
            
            # Kullanılabilir tutara eklemek için transaction oluştur
            # Payment transaction oluştur (pozitif amount ile - gelir)
            transaction_doc = {
                "id": str(uuid.uuid4()),
                "company_id": current_user["company_id"],
                "cari_id": cari_id,
                "transaction_type": "payment",
                "amount": data.get("amount", 0),  # Pozitif tutar (gelir)
                "net_amount": data.get("amount", 0),
                "currency": data.get("currency", "TRY"),
                "exchange_rate": data.get("exchange_rate", 1.0),
                "payment_type_id": data.get("payment_type_id"),
                "payment_type_name": payment_type.get("name"),
                "payment_method": payment_code,
                "description": f"Gelir: {data.get('description', '')}",
                "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                "time": datetime.now(timezone.utc).strftime("%H:%M"),
                "reference_id": income_doc["id"],
                "reference_type": "income",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user["user_id"]
            }
            
            # Cash account seç (payment_type'a göre)
            cash_account = None
            if payment_code == "cash":
                # Nakit kasası bul
                cash_account = await db.cash_accounts.find_one({
                    "company_id": current_user["company_id"],
                    "account_type": "cash",
                    "currency": data.get("currency", "TRY"),
                    "is_active": True
                }, {"_id": 0})
            elif payment_code == "bank_transfer":
                # Banka hesabı cash_account'u bul
                cash_account = await db.cash_accounts.find_one({
                    "company_id": current_user["company_id"],
                    "account_type": "bank_account",
                    "currency": data.get("currency", "TRY"),
                    "is_active": True
                }, {"_id": 0})
            
            if cash_account:
                transaction_doc["cash_account_id"] = cash_account["id"]
                
                # Banka hesabı için bank_account_id de ekle
                if payment_code == "bank_transfer":
                    bank_account = await db.bank_accounts.find_one({
                        "company_id": current_user["company_id"],
                        "account_type": "bank_account",
                        "currency": data.get("currency", "TRY"),
                        "is_active": True
                    }, {"_id": 0})
                    if bank_account:
                        transaction_doc["bank_account_id"] = bank_account["id"]
                
                await db.transactions.insert_one(transaction_doc)
                
                # Cash account bakiyesini güncelle (gelir = bakiye artar)
                await db.cash_accounts.update_one(
                    {"id": cash_account["id"]},
                    {"$inc": {"current_balance": transaction_doc["amount"]}}
                )
    
    return {**income_doc, "_id": None}

@api_router.put("/income/{income_id}")
async def update_income(income_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Geliri güncelle"""
    existing = await db.incomes.find_one({
        "id": income_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Income not found")
    
    update_data = {}
    if "description" in data:
        update_data["description"] = data["description"]
    if "income_category_id" in data:
        update_data["income_category_id"] = data["income_category_id"]
    if "payment_type_id" in data:
        update_data["payment_type_id"] = data["payment_type_id"]
    if "amount" in data:
        update_data["amount"] = data["amount"]
    if "currency" in data:
        update_data["currency"] = data["currency"]
    if "exchange_rate" in data:
        update_data["exchange_rate"] = data["exchange_rate"]
    if "date" in data:
        update_data["date"] = data["date"]
    if "notes" in data:
        update_data["notes"] = data["notes"]
    
    await db.incomes.update_one(
        {"id": income_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Income updated"}

@api_router.delete("/income/{income_id}")
async def delete_income(income_id: str, current_user: dict = Depends(get_current_user)):
    """Geliri sil"""
    existing = await db.incomes.find_one({
        "id": income_id,
        "company_id": current_user["company_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Income not found")
    
    # İlgili transaction'ı bul ve sil
    transaction = await db.transactions.find_one({
        "company_id": current_user["company_id"],
        "reference_type": "income",
        "reference_id": income_id
    })
    
    if transaction:
        # Transaction'ı sil
        await db.transactions.delete_one({"id": transaction["id"]})
        
        # Cash account bakiyesini geri al
        cash_account_id = transaction.get("cash_account_id")
        if cash_account_id:
            amount = transaction.get("amount", 0)
            await db.cash_accounts.update_one(
                {"id": cash_account_id},
                {"$inc": {"current_balance": -amount}}
            )
    
    await db.incomes.delete_one({"id": income_id, "company_id": current_user["company_id"]})
    
    return {"message": "Income deleted"}

@api_router.get("/income/statistics")
async def get_income_statistics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gelir istatistiklerini getir"""
    query = {"company_id": current_user["company_id"]}
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query and isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    incomes = await db.incomes.find(query, {"_id": 0}).to_list(10000)
    
    # TRY değerlerini hesapla
    total_try_value = 0
    this_month_try_value = 0
    this_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    for income in incomes:
        currency = income.get("currency", "TRY")
        amount = income.get("amount", 0)
        exchange_rate = income.get("exchange_rate", 1.0)
        
        # TRY değerini hesapla
        if currency == "TRY":
            try_value = amount
        else:
            try_value = amount * exchange_rate
        
        total_try_value += try_value
        
        # Bu ay kontrolü
        income_date = income.get("date", "")
        if income_date.startswith(this_month):
            this_month_try_value += try_value
    
    average_try_value = total_try_value / len(incomes) if incomes else 0
    
    return {
        "total_try_value": total_try_value,
        "this_month_try_value": this_month_try_value,
        "average_try_value": average_try_value,
        "count": len(incomes)
    }

# ==================== ACTIVITY LOGS ====================

@api_router.get("/activity-logs")
async def get_activity_logs(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    ip_address: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Activity logları getir - IP adresi filtreleme ile"""
    query = {"company_id": current_user["company_id"]}
    
    # Tarih filtresi
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        if date_query:
            query["created_at"] = date_query
    
    # Kullanıcı filtresi
    if user_id:
        query["user_id"] = user_id
    
    # Aksiyon filtresi
    if action:
        query["action"] = action
    
    # IP adresi filtresi
    if ip_address:
        query["ip_address"] = {"$regex": ip_address, "$options": "i"}
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return logs

# ==================== REPORTS ====================

@api_router.get("/reports/income")
async def get_income_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tour_type_id: Optional[str] = None,
    currency: Optional[str] = None,
    income_category_id: Optional[str] = None,
    user_id: Optional[str] = None,
    cari_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gelir raporu - Detaylı filtreleme ile"""
    company_id = current_user["company_id"]
    
    # Rezervasyonlardan gelir
    reservation_query = {
        "company_id": company_id,
        "status": {"$in": ["confirmed", "completed"]}
    }
    if date_from:
        reservation_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in reservation_query and isinstance(reservation_query["date"], dict):
            reservation_query["date"]["$lte"] = date_to
        else:
            reservation_query["date"] = {"$lte": date_to}
    if tour_type_id:
        reservation_query["tour_type_id"] = tour_type_id
    if user_id:
        reservation_query["created_by"] = user_id
    
    reservations = await db.reservations.find(reservation_query, {"_id": 0}).to_list(10000)
    
    # Extra sales'den gelir (Münferit cari için)
    extra_sales_query = {
        "company_id": company_id,
        "status": {"$in": ["confirmed", "completed"]}
    }
    if date_from:
        extra_sales_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in extra_sales_query and isinstance(extra_sales_query["date"], dict):
            extra_sales_query["date"]["$lte"] = date_to
        else:
            extra_sales_query["date"] = {"$lte": date_to}
    if cari_id:
        extra_sales_query["cari_id"] = cari_id
    if user_id:
        extra_sales_query["created_by"] = user_id
    
    extra_sales = await db.extra_sales.find(extra_sales_query, {"_id": 0}).to_list(10000)
    
    # Income transactions (gelir ekle)
    income_query = {"company_id": company_id, "reference_type": "income"}
    if date_from:
        income_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in income_query and isinstance(income_query["date"], dict):
            income_query["date"]["$lte"] = date_to
        else:
            income_query["date"] = {"$lte": date_to}
    if currency:
        income_query["currency"] = currency
    if user_id:
        income_query["created_by"] = user_id
    
    income_transactions = await db.transactions.find(income_query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Income kategorilerini ve kullanıcı bilgilerini populate et
    filtered_transactions = []
    for transaction in income_transactions:
        transaction_category_id = None
        if transaction.get("reference_id"):
            income = await db.incomes.find_one({"id": transaction.get("reference_id")}, {"_id": 0, "income_category_id": 1, "cari_id": 1})
            if income:
                transaction_category_id = income.get("income_category_id")
                transaction["income_category_id"] = transaction_category_id
                if transaction_category_id:
                    category = await db.income_categories.find_one({"id": transaction_category_id}, {"_id": 0, "name": 1})
                    if category:
                        transaction["income_category_name"] = category.get("name")
                if income.get("cari_id"):
                    cari = await db.cari_accounts.find_one({"id": income.get("cari_id")}, {"_id": 0, "name": 1})
                    if cari:
                        transaction["cari_name"] = cari.get("name")
        if transaction.get("created_by"):
            user = await db.users.find_one({"id": transaction.get("created_by")}, {"_id": 0, "full_name": 1, "username": 1})
            if user:
                transaction["user_name"] = user.get("full_name") or user.get("username")
        
        # Kategori filtresi uygula
        if income_category_id:
            if transaction_category_id == income_category_id:
                filtered_transactions.append(transaction)
        else:
            filtered_transactions.append(transaction)
    
    income_transactions = filtered_transactions
    
    # Toplam gelir hesapla
    total_revenue = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    tour_type_stats = defaultdict(lambda: {"tour_type_name": "", "reservation_count": 0, "revenue": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}})
    category_stats = defaultdict(lambda: {"category_name": "", "income_count": 0, "totals": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}})
    daily_trend = defaultdict(lambda: {"EUR": 0.0, "USD": 0.0, "TRY": 0.0})
    
    # Rezervasyonlardan gelir
    for reservation in reservations:
        res_currency = reservation.get("currency", "EUR")
        res_price = reservation.get("price", 0)
        res_date = reservation.get("date", "")
        tour_type_id = reservation.get("tour_type_id")
        
        if currency and res_currency != currency:
            continue
        
        total_revenue[res_currency] += res_price
        if res_date:
            daily_trend[res_date][res_currency] += res_price
        
        if tour_type_id:
            tour_type = await db.tour_types.find_one({"id": tour_type_id}, {"_id": 0})
            tour_type_name = tour_type.get("name", "-") if tour_type else "-"
            tour_type_stats[tour_type_id]["tour_type_name"] = tour_type_name
            tour_type_stats[tour_type_id]["reservation_count"] += 1
            tour_type_stats[tour_type_id]["revenue"][res_currency] += res_price
    
    # Extra sales'den gelir
    for sale in extra_sales:
        sale_currency = sale.get("currency", "EUR")
        sale_price = sale.get("sale_price", 0)
        sale_date = sale.get("date", "")
        
        if currency and sale_currency != currency:
            continue
        
        total_revenue[sale_currency] += sale_price
        if sale_date:
            daily_trend[sale_date][sale_currency] += sale_price
    
    # Income transactions'dan gelir
    for transaction in income_transactions:
        trans_currency = transaction.get("currency", "TRY")
        trans_amount = abs(transaction.get("amount", 0))
        trans_date = transaction.get("date", "")
        category_id = transaction.get("income_category_id")
        category_name = transaction.get("income_category_name", "-")
        
        total_revenue[trans_currency] += trans_amount
        if trans_date:
            daily_trend[trans_date][trans_currency] += trans_amount
        
        if category_id:
            category_stats[category_id]["category_name"] = category_name
            category_stats[category_id]["income_count"] += 1
            category_stats[category_id]["totals"][trans_currency] += trans_amount
    
    return {
        "total_revenue": total_revenue,
        "tour_type_stats": list(tour_type_stats.values()),
        "category_stats": list(category_stats.values()),
        "income_transactions": income_transactions,
        "reservations": reservations,
        "extra_sales": extra_sales,
        "daily_trend": dict(daily_trend)
    }

@api_router.get("/reports/expenses")
async def get_expenses_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    expense_category_id: Optional[str] = None,
    currency: Optional[str] = None,
    user_id: Optional[str] = None,
    cari_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gider raporu - Detaylı filtreleme ile"""
    company_id = current_user["company_id"]
    
    expense_query = {"company_id": company_id}
    if date_from:
        expense_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in expense_query and isinstance(expense_query["date"], dict):
            expense_query["date"]["$lte"] = date_to
        else:
            expense_query["date"] = {"$lte": date_to}
    if expense_category_id:
        expense_query["expense_category_id"] = expense_category_id
    if currency:
        expense_query["currency"] = currency
    if user_id:
        expense_query["created_by"] = user_id
    if cari_id:
        expense_query["cari_id"] = cari_id
    
    expenses = await db.expenses.find(expense_query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Kategori, kullanıcı ve cari bilgilerini populate et
    for expense in expenses:
        exp_category_id = expense.get("expense_category_id")
        if exp_category_id:
            category = await db.expense_categories.find_one({"id": exp_category_id}, {"_id": 0, "name": 1})
            if category:
                expense["category_name"] = category.get("name")
        if expense.get("cari_id"):
            cari = await db.cari_accounts.find_one({"id": expense.get("cari_id")}, {"_id": 0, "name": 1})
            if cari:
                expense["cari_name"] = cari.get("name")
        if expense.get("created_by"):
            user = await db.users.find_one({"id": expense.get("created_by")}, {"_id": 0, "full_name": 1, "username": 1})
            if user:
                expense["user_name"] = user.get("full_name") or user.get("username")
    
    total_expenses = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    category_totals = defaultdict(lambda: {"category_name": "", "expense_count": 0, "totals": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}})
    cari_stats = defaultdict(lambda: {"cari_name": "", "expense_count": 0, "totals": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}})
    daily_trend = defaultdict(lambda: {"EUR": 0.0, "USD": 0.0, "TRY": 0.0})
    
    for expense in expenses:
        exp_currency = expense.get("currency", "TRY")
        exp_amount = abs(expense.get("amount", 0))
        exp_date = expense.get("date", "")
        exp_category_id = expense.get("expense_category_id")
        exp_cari_id = expense.get("cari_id")
        
        total_expenses[exp_currency] += exp_amount
        if exp_date:
            daily_trend[exp_date][exp_currency] += exp_amount
        
        if exp_category_id:
            category_name = expense.get("category_name", "-")
            category_totals[exp_category_id]["category_name"] = category_name
            category_totals[exp_category_id]["expense_count"] += 1
            category_totals[exp_category_id]["totals"][exp_currency] += exp_amount
        
        if exp_cari_id:
            cari_name = expense.get("cari_name", "-")
            cari_stats[exp_cari_id]["cari_name"] = cari_name
            cari_stats[exp_cari_id]["expense_count"] += 1
            cari_stats[exp_cari_id]["totals"][exp_currency] += exp_amount
    
    return {
        "total_expenses": total_expenses,
        "category_totals": list(category_totals.values()),
        "cari_stats": list(cari_stats.values()),
        "expenses": expenses,
        "daily_trend": dict(daily_trend)
    }

@api_router.get("/reports/collections")
async def get_collections_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    payment_type_id: Optional[str] = None,
    currency: Optional[str] = None,
    cari_id: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Tahsilat raporu - Detaylı filtreleme ile"""
    company_id = current_user["company_id"]
    
    transaction_query = {
        "company_id": company_id,
        "transaction_type": "payment",
        "amount": {"$gt": 0}  # Sadece pozitif ödemeler
    }
    if date_from:
        transaction_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in transaction_query and isinstance(transaction_query["date"], dict):
            transaction_query["date"]["$lte"] = date_to
        else:
            transaction_query["date"] = {"$lte": date_to}
    if payment_type_id:
        transaction_query["payment_type_id"] = payment_type_id
    if currency:
        transaction_query["currency"] = currency
    if cari_id:
        transaction_query["cari_id"] = cari_id
    if user_id:
        transaction_query["created_by"] = user_id
    
    transactions = await db.transactions.find(transaction_query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Cari ve kullanıcı bilgilerini populate et
    for transaction in transactions:
        if transaction.get("cari_id"):
            cari = await db.cari_accounts.find_one({"id": transaction.get("cari_id")}, {"_id": 0, "name": 1})
            if cari:
                transaction["cari_name"] = cari.get("name")
        if transaction.get("created_by"):
            user = await db.users.find_one({"id": transaction.get("created_by")}, {"_id": 0, "full_name": 1, "username": 1})
            if user:
                transaction["user_name"] = user.get("full_name") or user.get("username")
    
    collections = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    payment_type_stats = defaultdict(lambda: {"payment_type_name": "", "transaction_count": 0, "totals": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}})
    cari_stats = defaultdict(lambda: {"cari_name": "", "transaction_count": 0, "totals": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}})
    daily_trend = defaultdict(lambda: {"EUR": 0.0, "USD": 0.0, "TRY": 0.0})
    
    for transaction in transactions:
        trans_currency = transaction.get("currency", "TRY")
        trans_amount = abs(transaction.get("amount", 0))
        trans_date = transaction.get("date", "")
        payment_type_id = transaction.get("payment_type_id")
        cari_id = transaction.get("cari_id")
        
        collections[trans_currency] += trans_amount
        if trans_date:
            daily_trend[trans_date][trans_currency] += trans_amount
        
        if payment_type_id:
            payment_type = await db.payment_types.find_one({"id": payment_type_id}, {"_id": 0})
            payment_type_name = payment_type.get("name", "-") if payment_type else transaction.get("payment_type_name", "-")
            payment_type_stats[payment_type_id]["payment_type_name"] = payment_type_name
            payment_type_stats[payment_type_id]["transaction_count"] += 1
            payment_type_stats[payment_type_id]["totals"][trans_currency] += trans_amount
        
        if cari_id:
            cari_name = transaction.get("cari_name", "-")
            cari_stats[cari_id]["cari_name"] = cari_name
            cari_stats[cari_id]["transaction_count"] += 1
            cari_stats[cari_id]["totals"][trans_currency] += trans_amount
    
    return {
        "collections": collections,
        "payment_type_stats": list(payment_type_stats.values()),
        "cari_stats": list(cari_stats.values()),
        "transactions": transactions,
        "daily_trend": dict(daily_trend)
    }

@api_router.get("/reports/profit")
async def get_profit_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Kazanç (Kar/Zarar) Raporu - Gelir ve Gider farkını hesaplar"""
    company_id = current_user["company_id"]
    
    # Gelir hesapla
    income_data = await get_income_report(date_from, date_to, None, currency, current_user)
    total_income = income_data.get("total_revenue", {"EUR": 0.0, "USD": 0.0, "TRY": 0.0})
    
    # Gider hesapla
    expense_data = await get_expenses_report(date_from, date_to, None, currency, current_user)
    total_expenses = expense_data.get("total_expenses", {"EUR": 0.0, "USD": 0.0, "TRY": 0.0})
    
    # Kar/Zarar hesapla
    profit = {}
    profit_percentage = {}
    for curr in ["EUR", "USD", "TRY"]:
        income = total_income.get(curr, 0.0)
        expense = total_expenses.get(curr, 0.0)
        profit[curr] = income - expense
        if income > 0:
            profit_percentage[curr] = ((income - expense) / income) * 100
        else:
            profit_percentage[curr] = 0.0
    
    # Günlük trend (gelir - gider)
    income_trend = income_data.get("daily_trend", {})
    expense_trend = expense_data.get("daily_trend", {})
    profit_trend = defaultdict(lambda: {"EUR": 0.0, "USD": 0.0, "TRY": 0.0})
    
    all_dates = set(list(income_trend.keys()) + list(expense_trend.keys()))
    for date in all_dates:
        for curr in ["EUR", "USD", "TRY"]:
            income_val = income_trend.get(date, {}).get(curr, 0.0)
            expense_val = expense_trend.get(date, {}).get(curr, 0.0)
            profit_trend[date][curr] = income_val - expense_val
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "profit": profit,
        "profit_percentage": profit_percentage,
        "daily_trend": dict(profit_trend),
        "income_by_tour_type": income_data.get("tour_type_stats", []),
        "expenses_by_category": expense_data.get("category_totals", [])
    }

@api_router.get("/reports/cash-flow")
async def get_cash_flow_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    period: Optional[str] = "daily",  # daily, weekly, monthly
    current_user: dict = Depends(get_current_user)
):
    """Nakit Akış Raporu - Günlük/haftalık/aylık nakit giriş-çıkış analizi"""
    company_id = current_user["company_id"]
    
    # Tüm transaction'ları getir (payment type olanlar)
    transaction_query = {
        "company_id": company_id,
        "transaction_type": "payment"
    }
    if date_from:
        transaction_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in transaction_query and isinstance(transaction_query["date"], dict):
            transaction_query["date"]["$lte"] = date_to
        else:
            transaction_query["date"] = {"$lte": date_to}
    if currency:
        transaction_query["currency"] = currency
    
    transactions = await db.transactions.find(transaction_query, {"_id": 0}).to_list(10000)
    
    # Nakit akış hesaplama
    cash_flow = defaultdict(lambda: {
        "date": "",
        "inflow": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0},
        "outflow": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0},
        "net_flow": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0},
        "balance": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    })
    
    running_balance = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    
    for transaction in transactions:
        trans_date = transaction.get("date", "")
        trans_currency = transaction.get("currency", "TRY")
        trans_amount = transaction.get("amount", 0)
        
        if not trans_date:
            continue
        
        # Period'a göre date key oluştur
        date_obj = datetime.strptime(trans_date, "%Y-%m-%d")
        if period == "weekly":
            # Hafta başlangıcı (Pazartesi)
            week_start = date_obj - timedelta(days=date_obj.weekday())
            date_key = week_start.strftime("%Y-%m-%d")
        elif period == "monthly":
            # Ay başlangıcı
            date_key = date_obj.strftime("%Y-%m-01")
        else:  # daily
            date_key = trans_date
        
        if date_key not in cash_flow:
            cash_flow[date_key]["date"] = date_key
        
        # Pozitif = giriş, negatif = çıkış
        if trans_amount > 0:
            cash_flow[date_key]["inflow"][trans_currency] += trans_amount
        else:
            cash_flow[date_key]["outflow"][trans_currency] += abs(trans_amount)
    
    # Net flow ve balance hesapla
    sorted_dates = sorted(cash_flow.keys())
    for date_key in sorted_dates:
        for curr in ["EUR", "USD", "TRY"]:
            inflow = cash_flow[date_key]["inflow"][curr]
            outflow = cash_flow[date_key]["outflow"][curr]
            net = inflow - outflow
            cash_flow[date_key]["net_flow"][curr] = net
            running_balance[curr] += net
            cash_flow[date_key]["balance"][curr] = running_balance[curr]
    
    # Toplam istatistikler
    total_inflow = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    total_outflow = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    for date_key in cash_flow:
        for curr in ["EUR", "USD", "TRY"]:
            total_inflow[curr] += cash_flow[date_key]["inflow"][curr]
            total_outflow[curr] += cash_flow[date_key]["outflow"][curr]
    
    total_net_flow = {}
    for curr in ["EUR", "USD", "TRY"]:
        total_net_flow[curr] = total_inflow[curr] - total_outflow[curr]
    
    # Cash account bakiyelerini al
    cash_accounts = await db.cash_accounts.find(
        {"company_id": company_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    current_balances = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    for account in cash_accounts:
        acc_currency = account.get("currency", "TRY")
        acc_balance = account.get("current_balance", 0) or 0
        if acc_currency in current_balances:
            current_balances[acc_currency] += acc_balance
    
    return {
        "period": period,
        "cash_flow": [cash_flow[date_key] for date_key in sorted_dates],
        "total_inflow": total_inflow,
        "total_outflow": total_outflow,
        "total_net_flow": total_net_flow,
        "current_balances": current_balances,
        "cash_accounts": cash_accounts
    }

@api_router.get("/reports/customer-analysis")
async def get_customer_analysis_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = None,
    min_sales: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Müşteri Analizi Raporu - Müşteri bazlı satış, gelir, tekrar ziyaret analizi"""
    company_id = current_user["company_id"]
    
    # Rezervasyonlardan müşteri verileri
    reservation_query = {
        "company_id": company_id,
        "status": {"$in": ["confirmed", "completed"]}
    }
    if date_from:
        reservation_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in reservation_query and isinstance(reservation_query["date"], dict):
            reservation_query["date"]["$lte"] = date_to
        else:
            reservation_query["date"] = {"$lte": date_to}
    
    reservations = await db.reservations.find(reservation_query, {"_id": 0}).to_list(10000)
    
    # Extra sales'den müşteri verileri
    extra_sales_query = {
        "company_id": company_id,
        "status": {"$in": ["confirmed", "completed"]}
    }
    if date_from:
        extra_sales_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in extra_sales_query and isinstance(extra_sales_query["date"], dict):
            extra_sales_query["date"]["$lte"] = date_to
        else:
            extra_sales_query["date"] = {"$lte": date_to}
    
    extra_sales = await db.extra_sales.find(extra_sales_query, {"_id": 0}).to_list(10000)
    
    # Müşteri bazlı analiz
    customer_stats = defaultdict(lambda: {
        "customer_name": "",
        "customer_contact": "",
        "total_sales": 0,
        "total_revenue": {"EUR": 0.0, "USD": 0.0, "TRY": 0.0},
        "first_sale_date": None,
        "last_sale_date": None,
        "sale_dates": [],
        "reservations": [],
        "extra_sales": []
    })
    
    # Rezervasyonlardan müşteri verileri
    for reservation in reservations:
        customer_name = reservation.get("customer_name", "").strip()
        customer_contact = reservation.get("customer_contact", "").strip()
        
        if not customer_name:
            continue
        
        # Müşteri key'i (isim + iletişim)
        customer_key = f"{customer_name}|{customer_contact}"
        
        res_currency = reservation.get("currency", "EUR")
        res_price = reservation.get("price", 0)
        res_date = reservation.get("date", "")
        
        if currency and res_currency != currency:
            continue
        
        customer_stats[customer_key]["customer_name"] = customer_name
        customer_stats[customer_key]["customer_contact"] = customer_contact
        customer_stats[customer_key]["total_sales"] += 1
        customer_stats[customer_key]["total_revenue"][res_currency] += res_price
        
        if res_date:
            if not customer_stats[customer_key]["first_sale_date"] or res_date < customer_stats[customer_key]["first_sale_date"]:
                customer_stats[customer_key]["first_sale_date"] = res_date
            if not customer_stats[customer_key]["last_sale_date"] or res_date > customer_stats[customer_key]["last_sale_date"]:
                customer_stats[customer_key]["last_sale_date"] = res_date
            customer_stats[customer_key]["sale_dates"].append(res_date)
        
        customer_stats[customer_key]["reservations"].append({
            "id": reservation.get("id"),
            "date": res_date,
            "price": res_price,
            "currency": res_currency,
            "tour_type_id": reservation.get("tour_type_id")
        })
    
    # Extra sales'den müşteri verileri
    for sale in extra_sales:
        customer_name = sale.get("customer_name", "").strip()
        customer_contact = sale.get("customer_contact", "").strip()
        
        if not customer_name:
            continue
        
        customer_key = f"{customer_name}|{customer_contact}"
        
        sale_currency = sale.get("currency", "EUR")
        sale_price = sale.get("sale_price", 0)
        sale_date = sale.get("date", "")
        
        if currency and sale_currency != currency:
            continue
        
        customer_stats[customer_key]["customer_name"] = customer_name
        customer_stats[customer_key]["customer_contact"] = customer_contact
        customer_stats[customer_key]["total_sales"] += 1
        customer_stats[customer_key]["total_revenue"][sale_currency] += sale_price
        
        if sale_date:
            if not customer_stats[customer_key]["first_sale_date"] or sale_date < customer_stats[customer_key]["first_sale_date"]:
                customer_stats[customer_key]["first_sale_date"] = sale_date
            if not customer_stats[customer_key]["last_sale_date"] or sale_date > customer_stats[customer_key]["last_sale_date"]:
                customer_stats[customer_key]["last_sale_date"] = sale_date
            customer_stats[customer_key]["sale_dates"].append(sale_date)
        
        customer_stats[customer_key]["extra_sales"].append({
            "id": sale.get("id"),
            "date": sale_date,
            "price": sale_price,
            "currency": sale_currency,
            "product_name": sale.get("product_name")
        })
    
    # İstatistikleri hesapla
    customer_list = []
    for customer_key, stats in customer_stats.items():
        # Min sales filtresi
        if min_sales and stats["total_sales"] < min_sales:
            continue
        
        # Ortalama satış tutarı
        avg_revenue = {}
        for curr in ["EUR", "USD", "TRY"]:
            if stats["total_sales"] > 0:
                avg_revenue[curr] = stats["total_revenue"][curr] / stats["total_sales"]
            else:
                avg_revenue[curr] = 0.0
        
        # Tekrar ziyaret kontrolü (birden fazla satış varsa)
        is_returning = stats["total_sales"] > 1
        
        customer_list.append({
            "customer_name": stats["customer_name"],
            "customer_contact": stats["customer_contact"],
            "total_sales": stats["total_sales"],
            "total_revenue": stats["total_revenue"],
            "avg_revenue": avg_revenue,
            "first_sale_date": stats["first_sale_date"],
            "last_sale_date": stats["last_sale_date"],
            "is_returning": is_returning,
            "reservations": stats["reservations"],
            "extra_sales": stats["extra_sales"]
        })
    
    # Toplam istatistikler
    total_customers = len(customer_list)
    returning_customers = sum(1 for c in customer_list if c["is_returning"])
    new_customers = total_customers - returning_customers
    total_revenue = {"EUR": 0.0, "USD": 0.0, "TRY": 0.0}
    for customer in customer_list:
        for curr in ["EUR", "USD", "TRY"]:
            total_revenue[curr] += customer["total_revenue"][curr]
    
    # Sıralama: Toplam gelire göre
    customer_list.sort(key=lambda x: sum(x["total_revenue"].values()), reverse=True)
    
    return {
        "total_customers": total_customers,
        "returning_customers": returning_customers,
        "new_customers": new_customers,
        "total_revenue": total_revenue,
        "customers": customer_list
    }

# ==================== DASHBOARD ====================

@api_router.get("/dashboard")
async def get_dashboard(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Dashboard verilerini getir - pending reservations sayısı dahil"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Rezervasyonları getir
    query = {
        "company_id": current_user["company_id"],
        "date": date,
        "status": {"$ne": "cancelled"}
    }
    
    reservations = await db.reservations.find(query, {"_id": 0}).to_list(1000)
    
    # Pending reservations sayısı
    pending_count = await db.reservations.count_documents({
        "company_id": current_user["company_id"],
        "status": "pending_approval",
        "reservation_source": "cari"
    })
    
    # Toplam ATV sayısı
    total_atvs = sum(r.get("atv_count", 0) for r in reservations)
    
    # Toplam kalkış sayısı
    total_departures = len(reservations)
    
    return {
        "date": date,
        "total_departures": total_departures,
        "total_atvs": total_atvs,
        "pending_reservations_count": pending_count,
        "reservations": reservations
    }

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(
    current_user: dict = Depends(get_current_user),
    unread_only: bool = False
):
    """Kullanıcının bildirimlerini getir"""
    query = {
        "company_id": current_user["company_id"],
        "user_id": current_user["user_id"]
    }
    
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    
    # created_at'i ISO format string'e çevir (eğer datetime objesi ise)
    for notif in notifications:
        if notif.get("created_at"):
            created_at = notif["created_at"]
            if isinstance(created_at, datetime):
                notif["created_at"] = created_at.isoformat()
            elif isinstance(created_at, str):
                # Zaten string ise olduğu gibi bırak
                pass
    
    # Okunmamış bildirim sayısı
    unread_count = await db.notifications.count_documents({
        "company_id": current_user["company_id"],
        "user_id": current_user["user_id"],
        "is_read": False
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Bildirimi okundu olarak işaretle"""
    result = await db.notifications.update_one(
        {
            "id": notification_id,
            "company_id": current_user["company_id"],
            "user_id": current_user["user_id"]
        },
        {
            "$set": {
                "is_read": True,
                "read_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Tüm bildirimleri okundu olarak işaretle"""
    await db.notifications.update_many(
        {
            "company_id": current_user["company_id"],
            "user_id": current_user["user_id"],
            "is_read": False
        },
        {
            "$set": {
                "is_read": True,
                "read_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "All notifications marked as read"}

# ==================== ADMIN ENDPOINTS ====================

@api_router.get("/admin/customers")
async def get_admin_customers(current_user: dict = Depends(get_current_user)):
    """Admin: Tüm firmaları listele"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    
    # Her firma için owner bilgisini ekle
    for company in companies:
        owner = await db.users.find_one({"company_id": company["id"], "is_owner": True}, {"_id": 0})
        if owner:
            company["owner"] = {
                "username": owner.get("username"),
                "full_name": owner.get("full_name")
            }
    
    return companies

@api_router.get("/admin/customers/{company_id}")
async def get_admin_customer(company_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Firma detaylarını getir"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Owner bilgisini ekle
    owner = await db.users.find_one({"company_id": company_id, "is_owner": True}, {"_id": 0})
    if owner:
        company["owner"] = {
            "username": owner.get("username"),
            "full_name": owner.get("full_name")
        }
    
    return company

@api_router.put("/admin/customers/{company_id}")
async def update_admin_customer(company_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Admin: Firma bilgilerini güncelle (modules_enabled dahil)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = {}
    
    # Temel bilgiler
    if "company_name" in data:
        update_data["company_name"] = data["company_name"]
    if "package_start_date" in data:
        update_data["package_start_date"] = data["package_start_date"]
    if "package_end_date" in data:
        update_data["package_end_date"] = data["package_end_date"]
    if "address" in data:
        update_data["address"] = data["address"]
    if "tax_office" in data:
        update_data["tax_office"] = data["tax_office"]
    if "tax_number" in data:
        update_data["tax_number"] = data["tax_number"]
    if "phone" in data:
        update_data["phone"] = data["phone"]
    if "email" in data:
        update_data["email"] = data["email"]
    if "logo_url" in data:
        update_data["logo_url"] = data["logo_url"]
    if "contact_email" in data:
        update_data["contact_email"] = data["contact_email"]
    if "contact_phone" in data:
        update_data["contact_phone"] = data["contact_phone"]
    if "website" in data:
        update_data["website"] = data["website"]
    
    # Modül yönetimi
    if "modules_enabled" in data:
        update_data["modules_enabled"] = data["modules_enabled"]
    
    # Owner bilgilerini güncelle
    if "owner_username" in data or "owner_full_name" in data:
        owner = await db.users.find_one({"company_id": company_id, "is_owner": True})
        if owner:
            owner_update = {}
            if "owner_username" in data:
                owner_update["username"] = data["owner_username"]
            if "owner_full_name" in data:
                owner_update["full_name"] = data["owner_full_name"]
            if "reset_password" in data and data["reset_password"]:
                # Şifreyi kullanıcı adı ile sıfırla
                new_password = data.get("owner_username", owner.get("username"))
                owner_update["password_hash"] = get_password_hash(new_password)
            
            if owner_update:
                await db.users.update_one({"id": owner["id"]}, {"$set": owner_update})
    
    # Company'yi güncelle
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.companies.update_one({"id": company_id}, {"$set": update_data})
    
    # Activity log
    await create_activity_log(
        company_id=company_id,
        user_id=current_user["user_id"],
        username="admin",
        full_name="Admin",
        action="update",
        entity_type="company",
        entity_id=company_id,
        description=f"Admin tarafından firma güncellendi: {data.get('company_name', company.get('company_name'))}",
        ip_address=current_user.get("ip_address", "unknown")
    )
    
    return {"message": "Company updated successfully"}

