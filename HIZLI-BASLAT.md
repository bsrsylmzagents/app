# 🚀 Hızlı Başlatma Kılavuzu

## Tek Tıkla Başlatma

**En kolay yol:** Proje kök dizininde `BASLAT.bat` dosyasına çift tıklayın!

Bu script:
- ✅ Backend'i otomatik başlatır (port 8000)
- ✅ Frontend'i otomatik başlatır (port 3000)
- ✅ Gerekli kontrolleri yapar
- ✅ Eksik dosyaları oluşturur

## Manuel Başlatma

### Backend (Terminal 1)
```batch
cd app\backend
start.bat
```

### Frontend (Terminal 2)
```batch
cd app\frontend
start.bat
```

## Önemli Notlar

1. **MongoDB çalışıyor olmalı!**
   - Local MongoDB: `mongodb://localhost:27017`
   - MongoDB Atlas kullanıyorsanız `.env` dosyasını güncelleyin

2. **İlk çalıştırmada:**
   - Virtual environment otomatik oluşturulur
   - Bağımlılıklar otomatik yüklenir
   - `.env` dosyaları otomatik oluşturulur

3. **PowerShell Execution Policy Hatası:**
   - Scriptler `npm.cmd` kullanarak bu sorunu aşar
   - Sorun devam ederse: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Erişim Adresleri

- **Backend API:** http://localhost:8000
- **API Dokümantasyonu:** http://localhost:8000/docs
- **Frontend:** http://localhost:3000

## Sorun Giderme

### Backend başlamıyor
- MongoDB çalışıyor mu kontrol edin
- Port 8000 kullanımda mı kontrol edin
- `app\backend\.env` dosyasını kontrol edin

### Frontend başlamıyor
- Port 3000 kullanımda mı kontrol edin
- `app\frontend\.env` dosyasını kontrol edin
- `node_modules` klasörü var mı kontrol edin

### MongoDB bağlantı hatası
- MongoDB servisinin çalıştığından emin olun
- `.env` dosyasındaki `MONGO_URL` değerini kontrol edin








