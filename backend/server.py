from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import secrets
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_urlsafe(32))
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_code: str  # Benzersiz firma kodu
    company_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    username: str
    email: Optional[EmailStr] = None
    full_name: str
    permissions: Dict[str, Dict[str, bool]] = Field(default_factory=dict)  # module: {list, create, edit, delete}
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TourType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    duration_hours: float
    description: Optional[str] = None

class PaymentType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    description: Optional[str] = None

class CariAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    person_count: int
    atv_count: int
    pickup_location: Optional[str] = None
    pickup_maps_link: Optional[str] = None
    price: float
    currency: str = "EUR"  # EUR, USD, TRY
    exchange_rate: float = 1.0
    notes: Optional[str] = None
    status: str = "confirmed"  # confirmed, cancelled, completed
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    reference_type: Optional[str] = None  # reservation, sale, service, manual
    date: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExtraSale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    product_name: str
    cari_id: str
    cari_name: str
    customer_name: str
    customer_contact: Optional[str] = None
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
    price: float
    currency: str = "EUR"
    tour_type_id: Optional[str] = None
    cari_ids: List[str] = Field(default_factory=list)  # Hangi carilere uygulanacak
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    plate_number: str
    vehicle_type: str  # ATV, Motor, etc.
    brand: Optional[str] = None
    model: Optional[str] = None
    insurance_expiry: Optional[str] = None
    inspection_expiry: Optional[str] = None
    notes: Optional[str] = None
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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        company_id: str = payload.get("company_id")
        if user_id is None or company_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return {"user_id": user_id, "company_id": company_id, "is_admin": payload.get("is_admin", False)}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_company_code() -> str:
    return secrets.token_hex(4).upper()

async def get_exchange_rates():
    """Ücretsiz exchangerate-api.com kullanarak döviz kurlarını al"""
    try:
        response = requests.get("https://api.exchangerate-api.com/v4/latest/EUR", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                "EUR": 1.0,
                "USD": data["rates"].get("USD", 1.1),
                "TRY": data["rates"].get("TRY", 35.0)
            }
    except:
        pass
    # Fallback değerler
    return {"EUR": 1.0, "USD": 1.1, "TRY": 35.0}

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

# ==================== CURRENCY ENDPOINT ====================

@api_router.get("/currency/rates")
async def get_currency_rates():
    rates = await get_exchange_rates()
    return {"rates": rates, "base": "EUR"}

# ==================== TOUR TYPES ====================

@api_router.get("/tour-types", response_model=List[TourType])
async def get_tour_types(current_user: dict = Depends(get_current_user)):
    tour_types = await db.tour_types.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    return tour_types

@api_router.post("/tour-types", response_model=TourType)
async def create_tour_type(name: str, duration_hours: float, description: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    tour_type = TourType(company_id=current_user["company_id"], name=name, duration_hours=duration_hours, description=description)
    await db.tour_types.insert_one(tour_type.model_dump())
    return tour_type

@api_router.delete("/tour-types/{tour_type_id}")
async def delete_tour_type(tour_type_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tour_types.delete_one({"id": tour_type_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tour type not found")
    return {"message": "Tour type deleted"}

# ==================== PAYMENT TYPES ====================

@api_router.get("/payment-types", response_model=List[PaymentType])
async def get_payment_types(current_user: dict = Depends(get_current_user)):
    payment_types = await db.payment_types.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    return payment_types

@api_router.post("/payment-types", response_model=PaymentType)
async def create_payment_type(name: str, description: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    payment_type = PaymentType(company_id=current_user["company_id"], name=name, description=description)
    await db.payment_types.insert_one(payment_type.model_dump())
    return payment_type

@api_router.delete("/payment-types/{payment_type_id}")
async def delete_payment_type(payment_type_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.payment_types.delete_one({"id": payment_type_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment type not found")
    return {"message": "Payment type deleted"}

# ==================== CARI ACCOUNTS ====================

@api_router.get("/cari-accounts", response_model=List[CariAccount])
async def get_cari_accounts(search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"company_id": current_user["company_id"]}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    cari_accounts = await db.cari_accounts.find(query, {"_id": 0}).to_list(1000)
    return cari_accounts

@api_router.post("/cari-accounts", response_model=CariAccount)
async def create_cari_account(data: dict, current_user: dict = Depends(get_current_user)):
    cari = CariAccount(company_id=current_user["company_id"], **data)
    cari_doc = cari.model_dump()
    cari_doc['created_at'] = cari_doc['created_at'].isoformat()
    await db.cari_accounts.insert_one(cari_doc)
    return cari

@api_router.get("/cari-accounts/{cari_id}")
async def get_cari_account(cari_id: str, current_user: dict = Depends(get_current_user)):
    cari = await db.cari_accounts.find_one({"id": cari_id, "company_id": current_user["company_id"]}, {"_id": 0})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    # Get transactions
    transactions = await db.transactions.find({"cari_id": cari_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get reservations
    reservations = await db.reservations.find({"cari_id": cari_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Get extra sales
    extra_sales = await db.extra_sales.find({"cari_id": cari_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Get service purchases (as supplier)
    service_purchases = await db.service_purchases.find({"supplier_id": cari_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    return {
        "cari": cari,
        "transactions": transactions,
        "reservations": reservations,
        "extra_sales": extra_sales,
        "service_purchases": service_purchases
    }

@api_router.put("/cari-accounts/{cari_id}")
async def update_cari_account(cari_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    data["company_id"] = current_user["company_id"]
    result = await db.cari_accounts.update_one({"id": cari_id, "company_id": current_user["company_id"]}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cari account not found")
    return {"message": "Cari account updated"}

@api_router.delete("/cari-accounts/{cari_id}")
async def delete_cari_account(cari_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cari_accounts.delete_one({"id": cari_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cari account not found")
    return {"message": "Cari account deleted"}

# ==================== RESERVATIONS ====================

@api_router.get("/reservations")
async def get_reservations(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    if status:
        query["status"] = status
    if date_from and date_to:
        query["date"] = {"$gte": date_from, "$lte": date_to}
    elif date_from:
        query["date"] = {"$gte": date_from}
    elif date_to:
        query["date"] = {"$lte": date_to}
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return reservations

@api_router.post("/reservations")
async def create_reservation(data: ReservationCreate, current_user: dict = Depends(get_current_user)):
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
        created_by=current_user["user_id"]
    )
    
    reservation_doc = reservation.model_dump()
    reservation_doc['created_at'] = reservation_doc['created_at'].isoformat()
    reservation_doc['updated_at'] = reservation_doc['updated_at'].isoformat()
    await db.reservations.insert_one(reservation_doc)
    
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
    # Get existing reservation
    existing = await db.reservations.find_one({"id": reservation_id, "company_id": current_user["company_id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
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
    return {"message": "Reservation updated"}

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": reservation_id, "company_id": current_user["company_id"]})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
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

# ==================== TRANSACTIONS (PAYMENTS) ====================

@api_router.post("/transactions")
async def create_transaction(data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    # Get payment type name if provided
    payment_type_name = None
    if data.payment_type_id:
        payment_type = await db.payment_types.find_one({"id": data.payment_type_id})
        if payment_type:
            payment_type_name = payment_type["name"]
    
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=data.cari_id,
        transaction_type=data.transaction_type,
        amount=data.amount,
        currency=data.currency,
        exchange_rate=data.exchange_rate,
        payment_type_id=data.payment_type_id,
        payment_type_name=payment_type_name,
        description=data.description,
        reference_id=data.reference_id,
        reference_type=data.reference_type,
        date=data.date,
        created_by=current_user["user_id"]
    )
    
    transaction_doc = transaction.model_dump()
    transaction_doc['created_at'] = transaction_doc['created_at'].isoformat()
    await db.transactions.insert_one(transaction_doc)
    
    # Update balance
    balance_field = f"balance_{data.currency.lower()}"
    if data.transaction_type == "payment":  # Tahsilat - balance azalır
        await db.cari_accounts.update_one(
            {"id": data.cari_id},
            {"$inc": {balance_field: -data.amount}}
        )
    elif data.transaction_type == "credit":  # Alacak - balance azalır
        await db.cari_accounts.update_one(
            {"id": data.cari_id},
            {"$inc": {balance_field: -data.amount}}
        )
    else:  # debit, refund - balance artar
        await db.cari_accounts.update_one(
            {"id": data.cari_id},
            {"$inc": {balance_field: data.amount}}
        )
    
    return transaction

# ==================== EXTRA SALES ====================

@api_router.get("/extra-sales")
async def get_extra_sales(current_user: dict = Depends(get_current_user)):
    extra_sales = await db.extra_sales.find({"company_id": current_user["company_id"]}, {"_id": 0}).sort("date", -1).to_list(1000)
    return extra_sales

@api_router.post("/extra-sales")
async def create_extra_sale(data: dict, current_user: dict = Depends(get_current_user)):
    # Get cari name
    cari = await db.cari_accounts.find_one({"id": data["cari_id"]})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari account not found")
    
    data["cari_name"] = cari["name"]
    
    # Get supplier name if provided
    if data.get("supplier_id"):
        supplier = await db.cari_accounts.find_one({"id": data["supplier_id"]})
        if supplier:
            data["supplier_name"] = supplier["name"]
    
    extra_sale = ExtraSale(company_id=current_user["company_id"], created_by=current_user["user_id"], **data)
    extra_sale_doc = extra_sale.model_dump()
    extra_sale_doc['created_at'] = extra_sale_doc['created_at'].isoformat()
    await db.extra_sales.insert_one(extra_sale_doc)
    
    # Create transaction for sale (debit - borç)
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

@api_router.delete("/extra-sales/{sale_id}")
async def delete_extra_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
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
    
    # Delete sale
    await db.extra_sales.delete_one({"id": sale_id})
    
    return {"message": "Extra sale deleted"}

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
    
    # Create transaction (credit - alacak - supplier'a borcumuz)
    transaction = Transaction(
        company_id=current_user["company_id"],
        cari_id=data["supplier_id"],
        transaction_type="credit",
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
    balance_field = f"balance_{data.get('currency', 'EUR').lower()}"
    await db.cari_accounts.update_one(
        {"id": data["supplier_id"]},
        {"$inc": {balance_field: -data["amount"]}}
    )
    
    return purchase

# ==================== SEASONAL PRICES ====================

@api_router.get("/seasonal-prices")
async def get_seasonal_prices(current_user: dict = Depends(get_current_user)):
    prices = await db.seasonal_prices.find({"company_id": current_user["company_id"]}, {"_id": 0}).sort("start_date", -1).to_list(1000)
    return prices

@api_router.post("/seasonal-prices")
async def create_seasonal_price(data: dict, current_user: dict = Depends(get_current_user)):
    price = SeasonalPrice(company_id=current_user["company_id"], created_by=current_user["user_id"], **data)
    price_doc = price.model_dump()
    price_doc['created_at'] = price_doc['created_at'].isoformat()
    await db.seasonal_prices.insert_one(price_doc)
    return price

@api_router.delete("/seasonal-prices/{price_id}")
async def delete_seasonal_price(price_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.seasonal_prices.delete_one({"id": price_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Seasonal price not found")
    return {"message": "Seasonal price deleted"}

# ==================== VEHICLES ====================

@api_router.get("/vehicles")
async def get_vehicles(filter_days: Optional[int] = None, current_user: dict = Depends(get_current_user)):
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
    vehicle = Vehicle(company_id=current_user["company_id"], **data)
    vehicle_doc = vehicle.model_dump()
    vehicle_doc['created_at'] = vehicle_doc['created_at'].isoformat()
    await db.vehicles.insert_one(vehicle_doc)
    return vehicle

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    result = await db.vehicles.update_one(
        {"id": vehicle_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle updated"}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.vehicles.delete_one({"id": vehicle_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

# ==================== USERS (PERSONNEL) ====================

@api_router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({"company_id": current_user["company_id"]}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user(data: UserCreate, current_user: dict = Depends(get_current_user)):
    if not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Check if username exists
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = hash_password(data.password)
    user = User(
        company_id=current_user["company_id"],
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        permissions=data.permissions,
        is_admin=data.is_admin
    )
    user_doc = user.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['password'] = hashed_password
    await db.users.insert_one(user_doc)
    
    return {"message": "User created", "id": user.id}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    if "password" in data:
        data["password"] = hash_password(data["password"])
    
    result = await db.users.update_one(
        {"id": user_id, "company_id": current_user["company_id"]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

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
    # Get reservations for the date
    reservations = await db.reservations.find(
        {"company_id": current_user["company_id"], "date": date, "status": "confirmed"},
        {"_id": 0}
    ).sort("time", 1).to_list(1000)
    
    total_atvs = sum(r["atv_count"] for r in reservations)
    
    return {
        "date": date,
        "total_departures": len(reservations),
        "total_atvs": total_atvs,
        "reservations": reservations
    }

# ==================== REPORTS ====================

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
    date_from: str,
    date_to: str,
    current_user: dict = Depends(get_current_user)
):
    transactions = await db.transactions.find(
        {
            "company_id": current_user["company_id"],
            "transaction_type": "payment",
            "date": {"$gte": date_from, "$lte": date_to}
        },
        {"_id": 0}
    ).to_list(10000)
    
    collections = {"EUR": 0, "USD": 0, "TRY": 0}
    for t in transactions:
        collections[t["currency"]] += t["amount"]
    
    return {"collections": collections, "transactions": transactions}

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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()