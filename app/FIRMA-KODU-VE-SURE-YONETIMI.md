# Firma Kodu ve Süre Yönetimi

## Özellikler

### 1. Sıralı Firma Kodu Sistemi ✅

**Önceki Sistem:** Random hex kodlar (örn: `A3F2B1C4`)

**Yeni Sistem:** Sıralı sayısal kodlar (1001, 1002, 1003...)

**Nasıl Çalışır:**
- Yeni firma oluşturulduğunda, en yüksek mevcut kod bulunur
- Yeni kod = En yüksek kod + 1
- İlk firma: 1001
- İkinci firma: 1002
- Üçüncü firma: 1003
- ...

**Kod:** `app/backend/server.py` - `generate_company_code()` fonksiyonu

---

### 2. Paket Süresi Yönetimi ✅

**Company Model Güncellemeleri:**
- `package_start_date`: Paket başlangıç tarihi (YYYY-MM-DD)
- `package_end_date`: Paket bitiş tarihi (YYYY-MM-DD)

**Varsayılan Değerler:**
- Yeni firma oluşturulduğunda:
  - `package_start_date`: Bugünün tarihi
  - `package_end_date`: Bugünden 30 gün sonra (30 günlük trial)

**Kod:** `app/backend/server.py` - `Company` modeli ve `register_company()` endpoint'i

---

### 3. Süre Filtreleme Endpoint'i ✅

**Endpoint:** `GET /api/admin/companies`

**Query Parametreleri:**
- `filter_type` (opsiyonel):
  - `"3_months"`: 3 ay içinde süresi dolacaklar
  - `"1_month"`: 1 ay içinde süresi dolacaklar
  - `"expired"`: Süresi geçenler
  - `"all"` veya boş: Tüm firmalar

**Örnek Kullanım:**
```bash
# 3 ay içinde süresi dolacaklar
GET /api/admin/companies?filter_type=3_months

# 1 ay içinde süresi dolacaklar
GET /api/admin/companies?filter_type=1_month

# Süresi geçenler
GET /api/admin/companies?filter_type=expired

# Tüm firmalar
GET /api/admin/companies
```

**Response Format:**
```json
{
  "companies": [
    {
      "id": "...",
      "company_code": "1001",
      "company_name": "Firma Adı",
      "package_start_date": "2025-01-01",
      "package_end_date": "2025-01-31",
      "days_remaining": 4,
      "is_expired": false
    }
  ],
  "filter_type": "1_month",
  "total": 5
}
```

**Kod:** `app/backend/server.py` - `get_companies_admin()` endpoint'i

---

### 4. Otomatik Silme Sistemi ✅

**Nasıl Çalışır:**
- Her gün saat 02:00'de otomatik çalışır
- Süresi geçen firmaları kontrol eder
- **90 gün** önce süresi geçen firmaları bulur
- Bu firmaların **tüm verilerini** siler

**Silinen Veriler:**
- Firma bilgisi (companies collection)
- Kullanıcılar (users)
- Rezervasyonlar (reservations)
- İşlemler (transactions)
- Cari hesaplar (cari_accounts)
- Ekstra satışlar (extra_sales)
- Hizmet satın alımları (service_purchases)
- Sezon fiyatları (seasonal_prices)
- Tur tipleri (tour_types)
- Ödeme tipleri (payment_types)
- Aktivite logları (activity_logs)
- Bildirimler (notifications)
- Gelirler (incomes)
- Giderler (expenses)
- Banka hesapları (bank_accounts)
- Kasa hesapları (cash_accounts)
- Çek/senetler (check_promissories)
- Araçlar (vehicles)
- Personel rolleri (staff_roles)

**Örnek Senaryo:**
1. Firma süresi: 2025-01-01'de bitti
2. Bugün: 2025-04-01 (90 gün geçti)
3. Scheduler çalışır ve firmayı siler

**Kod:** `app/backend/modules/scheduler.py` - `cleanup_expired_companies()` fonksiyonu

**Scheduler Ayarları:**
- Çalışma zamanı: Her gün 02:00
- Tetikleyici: Cron job
- Durum: Otomatik başlar (MODULES_ENABLED kontrolü yok)

---

## Teknik Detaylar

### Firma Kodu Oluşturma

```python
async def generate_company_code() -> str:
    """
    Sıralı firma kodu oluştur - format: 1001, 1002, 1003...
    En yüksek kodu bulup +1 ekler
    """
    max_code = 1000  # Başlangıç değeri
    
    # Tüm company_code'ları al ve sayısal olanları filtrele
    async for company in db.companies.find({}, {"company_code": 1}):
        code = company.get("company_code", "")
        if code.isdigit():
            try:
                code_num = int(code)
                if code_num > max_code:
                    max_code = code_num
            except ValueError:
                continue
    
    # Yeni kod = en yüksek kod + 1
    new_code = max_code + 1
    return str(new_code)
```

### Filtreleme Mantığı

```python
# 3 ay içinde süresi dolacaklar
three_months_later = today + timedelta(days=90)
query["package_end_date"] = {
    "$gte": today.isoformat(),
    "$lte": three_months_later.isoformat()
}

# 1 ay içinde süresi dolacaklar
one_month_later = today + timedelta(days=30)
query["package_end_date"] = {
    "$gte": today.isoformat(),
    "$lte": one_month_later.isoformat()
}

# Süresi geçenler
query["package_end_date"] = {
    "$lt": today.isoformat()
}
```

### Otomatik Silme Mantığı

```python
# 90 günden fazla süresi geçen firmaları bul
cutoff_date = today - timedelta(days=90)
expired_companies = await db.companies.find({
    "package_end_date": {"$lt": cutoff_date.isoformat()}
}).to_list(1000)

# Her firma için tüm ilgili verileri sil
for company in expired_companies:
    # Tüm collection'lardan company_id ile eşleşen kayıtları sil
    # Son olarak firmayı sil
```

---

## API Endpoint'leri

### 1. Yeni Firma Oluşturma
```
POST /api/auth/register
```

**Request:**
```json
{
  "company_name": "Yeni Firma",
  "admin_username": "admin",
  "admin_password": "password",
  "admin_email": "admin@firma.com",
  "admin_full_name": "Admin Kullanıcı"
}
```

**Response:**
```json
{
  "message": "Company registered successfully",
  "company_code": "1001",
  "company_name": "Yeni Firma"
}
```

### 2. Firma Listesi (Filtreleme ile)
```
GET /api/admin/companies?filter_type=1_month
```

**Response:**
```json
{
  "companies": [...],
  "filter_type": "1_month",
  "total": 5
}
```

---

## Scheduler Yönetimi

### Başlatma
Scheduler otomatik olarak backend başlatıldığında çalışır:
```python
@app.on_event("startup")
async def startup_event():
    from modules.scheduler import set_database, start_scheduler
    set_database(db)
    start_scheduler()
```

### Durdurma
Backend kapatıldığında scheduler otomatik durur:
```python
@app.on_event("shutdown")
async def shutdown_event():
    from modules.scheduler import stop_scheduler
    stop_scheduler()
```

---

## Güvenlik Notları

1. **Firma Kodu Çakışması:** Eğer kod çakışması olursa (çok nadir), otomatik olarak bir sonraki kod denenir.

2. **Veri Silme:** Otomatik silme işlemi **geri alınamaz**. 90 günlük süre kullanıcılara uyarı için yeterli süre sağlar.

3. **Scheduler Güvenliği:** Scheduler sadece 90 günden fazla süresi geçen firmaları siler. Yeni süresi geçen firmalar silinmez.

---

## Test Senaryoları

### 1. Yeni Firma Oluşturma
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Firma",
    "admin_username": "testadmin",
    "admin_password": "test123",
    "admin_email": "test@test.com",
    "admin_full_name": "Test Admin"
  }'
```

### 2. Filtreleme Testi
```bash
# 1 ay içinde süresi dolacaklar
curl http://localhost:8000/api/admin/companies?filter_type=1_month

# Süresi geçenler
curl http://localhost:8000/api/admin/companies?filter_type=expired
```

---

## Gelecek İyileştirmeler

1. **Email Bildirimleri:** Süresi dolmak üzere olan firmalara email gönderimi
2. **Admin Dashboard:** Süre yönetimi için görsel dashboard
3. **Manuel Süre Uzatma:** Admin panelinden manuel süre uzatma özelliği
4. **Raporlama:** Süre analizi için detaylı raporlar

---

## Sorun Giderme

### Scheduler Çalışmıyor
- Backend loglarını kontrol edin
- `MODULES_ENABLED` environment variable'ını kontrol edin (artık gerekli değil)
- MongoDB bağlantısını kontrol edin

### Firma Kodu Sıralı Değil
- Eski random kodlar hala geçerli
- Yeni firmalar sıralı kod alır
- Mevcut firmaları güncellemek için migration script'i gerekebilir

### Filtreleme Çalışmıyor
- `package_end_date` alanının doğru formatta olduğundan emin olun (YYYY-MM-DD)
- MongoDB query'lerini kontrol edin


