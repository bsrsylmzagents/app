# Travel Agency Management System (SaaS)

ATV Tur Yönetim Sistemi - Multi-tenant SaaS uygulaması

## Proje Yapısı

```
app/
├── backend/          # FastAPI backend
│   ├── server.py    # Ana server dosyası
│   └── requirements.txt
└── frontend/        # React frontend
    ├── src/
    └── package.json
```

## Gereksinimler

### Backend
- Python 3.8+
- MongoDB (local veya cloud)
- pip

### Frontend
- Node.js 16+
- Yarn veya npm

## Kurulum ve Çalıştırma

### 1. MongoDB Kurulumu

#### Seçenek 1: Local MongoDB
```bash
# Windows (Chocolatey)
choco install mongodb

# veya MongoDB Community Server'ı manuel indirin:
# https://www.mongodb.com/try/download/community

# MongoDB'yi başlatın
mongod
```

#### Seçenek 2: MongoDB Atlas (Cloud)
1. https://www.mongodb.com/cloud/atlas adresinden ücretsiz hesap oluşturun
2. Cluster oluşturun
3. Connection string'i alın (örnek: `mongodb+srv://user:pass@cluster.mongodb.net/`)

### 2. Backend Kurulumu

```bash
# Backend dizinine gidin
cd app/backend

# Python virtual environment oluşturun (önerilir)
python -m venv venv

# Virtual environment'ı aktifleştirin
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# .env dosyası oluşturun
# Windows (PowerShell):
@"
MONGO_URL=mongodb://localhost:27017
DB_NAME=travel_agency_db
JWT_SECRET_KEY=
CORS_ORIGINS=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8

# Windows (CMD):
echo MONGO_URL=mongodb://localhost:27017 > .env
echo DB_NAME=travel_agency_db >> .env
echo JWT_SECRET_KEY= >> .env
echo CORS_ORIGINS=http://localhost:3000 >> .env

# Linux/Mac:
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=travel_agency_db
JWT_SECRET_KEY=
CORS_ORIGINS=http://localhost:3000
EOF

# MongoDB Atlas kullanıyorsanız, MONGO_URL'i güncelleyin:
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/

# Backend'i başlatın
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Backend şu adreste çalışacak: http://localhost:8000
API dokümantasyonu: http://localhost:8000/docs

### 3. Frontend Kurulumu

```bash
# Frontend dizinine gidin
cd app/frontend

# Bağımlılıkları yükleyin (yarn kullanılıyor)
yarn install

# veya npm kullanıyorsanız:
npm install

# .env dosyası oluşturun
# Windows (PowerShell):
@"
REACT_APP_BACKEND_URL=http://localhost:8000
"@ | Out-File -FilePath .env -Encoding utf8

# Windows (CMD):
echo REACT_APP_BACKEND_URL=http://localhost:8000 > .env

# Linux/Mac:
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env

# Frontend'i başlatın
yarn start
# veya
npm start
```

Frontend şu adreste çalışacak: http://localhost:3000

## İlk Kullanım

1. Frontend'de "Kayıt Ol" butonuna tıklayın
2. Firma bilgilerinizi ve admin kullanıcı bilgilerinizi girin
3. Sistem size otomatik bir **Firma Kodu** verecek (kaydedin!)
4. Giriş yaparken bu firma kodunu kullanın

## Environment Variables

### Backend (.env)
- `MONGO_URL`: MongoDB bağlantı string'i (zorunlu)
- `DB_NAME`: Veritabanı adı (varsayılan: travel_agency_db)
- `JWT_SECRET_KEY`: JWT şifreleme anahtarı (boş bırakılırsa otomatik oluşturulur)
- `CORS_ORIGINS`: İzin verilen CORS origin'leri (virgülle ayrılmış)

### Frontend (.env)
- `REACT_APP_BACKEND_URL`: Backend API URL'i (varsayılan: http://localhost:8000)

## Özellikler

- ✅ Multi-tenant SaaS yapısı (her firma kendi verilerini görür)
- ✅ Kullanıcı yönetimi ve yetkilendirme
- ✅ Rezervasyon yönetimi
- ✅ Cari hesap yönetimi
- ✅ İşlem kayıtları (borç/alacak/tahsilat)
- ✅ Ekstra satışlar
- ✅ Hizmet alımları
- ✅ Sezonluk fiyatlandırma
- ✅ Araç yönetimi
- ✅ Raporlama (gelir, tahsilat, borçlu/alacaklı)
- ✅ Çoklu para birimi desteği (EUR, USD, TRY)
- ✅ Otomatik döviz kuru güncelleme

## API Endpoints

Backend çalıştıktan sonra detaylı API dokümantasyonu için:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Sorun Giderme

### MongoDB bağlantı hatası
- MongoDB'nin çalıştığından emin olun
- `MONGO_URL` değerini kontrol edin
- Firewall ayarlarını kontrol edin

### CORS hatası
- Backend `.env` dosyasında `CORS_ORIGINS` değerini kontrol edin
- Frontend URL'inin listede olduğundan emin olun

### Frontend backend'e bağlanamıyor
- Backend'in çalıştığından emin olun (http://localhost:8000)
- Frontend `.env` dosyasında `REACT_APP_BACKEND_URL` değerini kontrol edin
- Tarayıcı konsolunda hata mesajlarını kontrol edin

## Geliştirme

### Backend
```bash
cd app/backend
uvicorn server:app --reload
```

### Frontend
```bash
cd app/frontend
yarn start
```

## Production Deployment

### Backend
- Environment variables'ları production değerleriyle güncelleyin
- MongoDB production instance'ı kullanın
- HTTPS kullanın
- JWT_SECRET_KEY'i güvenli bir değerle ayarlayın

### Frontend
```bash
cd app/frontend
yarn build
# build/ klasöründeki dosyaları bir web sunucusuna deploy edin
```

## Lisans

Bu proje özel bir SaaS uygulamasıdır.
