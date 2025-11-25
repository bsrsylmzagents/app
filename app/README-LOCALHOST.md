# 🚀 Localhost Kurulum ve Kullanım

## Hızlı Başlangıç

### Tek Komutla Başlatma

Proje kök dizininde `start.bat` dosyasını çalıştırın:

```batch
start.bat
```

Bu script otomatik olarak:
- ✅ Backend ve Frontend için .env dosyalarını oluşturur/kontrol eder
- ✅ MongoDB Atlas bağlantısını ayarlar (zaten aktif)
- ✅ CORS ayarlarını hem localhost hem production URL'lerini kapsayacak şekilde yapar
- ✅ Gerekli bağımlılıkları yükler (venv, node_modules)
- ✅ Backend'i http://localhost:8000 adresinde başlatır
- ✅ Frontend'i http://localhost:3000 adresinde başlatır

Her iki sunucu da ayrı pencerelerde çalışacaktır.

**Backend:** http://localhost:8000  
**Frontend:** http://localhost:3000  
**API Docs:** http://localhost:8000/docs

## Ortam Ayarları

### Backend (.env)

- `MONGO_URL`: MongoDB Atlas bağlantı string'i (production ile aynı)
- `DB_NAME`: Veritabanı adı
- `CORS_ORIGINS`: Hem localhost hem production URL'leri (virgülle ayrılmış)
- `JWT_SECRET_KEY`: JWT şifreleme anahtarı

### Frontend (.env)

- `REACT_APP_BACKEND_URL`: Backend API URL'i (`http://localhost:8000`)

## Production vs Localhost

### Production (Render/Vercel)
- Backend: https://app-c1qr.onrender.com
- Frontend: https://app-one-lake-13.vercel.app
- MongoDB: MongoDB Atlas (cloud)

### Localhost
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- MongoDB: MongoDB Atlas (cloud) - aynı veritabanı kullanılır

**Not:** Localhost ve production aynı MongoDB Atlas veritabanını kullanır, bu yüzden veriler paylaşılır.

## Sorun Giderme

### Backend başlamıyor
- MongoDB Atlas bağlantısını kontrol edin
- `.env` dosyasının doğru olduğundan emin olun
- Virtual environment'ın aktif olduğundan emin olun

### Frontend backend'e bağlanamıyor
- Backend'in çalıştığından emin olun (http://localhost:8000)
- Frontend `.env` dosyasında `REACT_APP_BACKEND_URL=http://localhost:8000` olduğundan emin olun
- Tarayıcı konsolunda hata mesajlarını kontrol edin

### CORS hatası
- Backend `.env` dosyasında `CORS_ORIGINS` değerini kontrol edin
- `http://localhost:3000` değerinin listede olduğundan emin olun

