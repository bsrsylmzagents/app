# 🚀 Başlatma Rehberi

## Hızlı Başlatma

### Yöntem 1: Her İkisini Birden Başlat

Proje kök dizininde `start-all.bat` dosyasına çift tıklayın.

Bu script:
- ✅ Backend'i ayrı bir pencerede başlatır
- ✅ Frontend'i ayrı bir pencerede başlatır
- ✅ Her iki sunucu da otomatik başlar

### Yöntem 2: Ayrı Ayrı Başlat (Önerilen)

#### Backend'i Başlat

1. `backend` klasörüne gidin
2. `start-backend.bat` dosyasına çift tıklayın

VEYA CMD'den:
```cmd
cd backend
start-backend.bat
```

#### Frontend'i Başlat

1. `frontend` klasörüne gidin
2. `start-frontend.bat` dosyasına çift tıklayın

VEYA CMD'den:
```cmd
cd frontend
start-frontend.bat
```

## Dosya Yapısı

```
app/
├── start-all.bat          # Her ikisini birden başlatır
├── backend/
│   └── start-backend.bat  # Sadece backend'i başlatır
└── frontend/
    └── start-frontend.bat # Sadece frontend'i başlatır
```

## Erişim Adresleri

Başarıyla başlatıldıktan sonra:

- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

## Sorun Giderme

### Backend Başlamıyor

1. `backend` klasöründe `start-backend.bat` çalıştırın
2. Hata mesajlarını okuyun
3. Virtual environment oluşturuluyor mu kontrol edin
4. Python kurulu mu kontrol edin: `python --version`

### Frontend Başlamıyor

1. `frontend` klasöründe `start-frontend.bat` çalıştırın
2. Hata mesajlarını okuyun
3. `node_modules` klasörü var mı kontrol edin
4. Yoksa: `frontend/install-dependencies.bat` çalıştırın

### node_modules Bulunamıyor

Frontend dizininde:

```batch
install-dependencies.bat
```

VEYA:

```cmd
npm install --legacy-peer-deps
```

### Port Zaten Kullanılıyor

Backend (8000) veya Frontend (3000) portu kullanılıyorsa:

```cmd
netstat -ano | findstr :8000
netstat -ano | findstr :3000
```

İşlemi sonlandırın:
```cmd
taskkill /PID <PID_NUMARASI> /F
```

## Notlar

- Backend ve Frontend ayrı pencerelerde çalışır
- Her pencereyi açık tutun
- Durdurmak için her iki pencereyi de kapatın
- İlk çalıştırmada bağımlılıklar otomatik yüklenir
