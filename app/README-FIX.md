# 🔧 Sorun Giderme Rehberi

## Frontend Bağımlılık Sorunları

### Problem: `node_modules` bulunamıyor veya `craco` komutu çalışmıyor

### Çözüm 1: Otomatik Yükleme Scripti (Önerilen)

Frontend dizininde `install-dependencies.bat` dosyasını çalıştırın:

```batch
cd frontend
install-dependencies.bat
```

Bu script:
- ✅ Eski `node_modules` ve `package-lock.json` dosyalarını temizler
- ✅ npm cache'i temizler
- ✅ Bağımlılıkları `--legacy-peer-deps` ile yükler
- ✅ Hata durumunda otomatik olarak tekrar dener

### Çözüm 2: Manuel Yükleme

PowerShell veya CMD'de:

```cmd
cd frontend
npm cache clean --force
npm install --legacy-peer-deps
```

### Çözüm 3: AJV Hatası İçin

Eğer `ajv` modülü bulunamıyor hatası alıyorsanız:

```batch
cd frontend
fix-ajv.bat
```

## Backend Sorunları

### Problem: Virtual environment bulunamıyor

Backend dizininde:

```batch
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Genel Sorunlar

### Problem: `start.bat` çalışmıyor

1. Önce bağımlılıkları yükleyin:
   ```batch
   cd frontend
   install-dependencies.bat
   ```

2. Sonra `start.bat`'ı tekrar çalıştırın:
   ```batch
   cd ..
   start.bat
   ```

### Problem: Port zaten kullanılıyor

Backend veya Frontend portu (8000 veya 3000) zaten kullanılıyorsa:

1. Çalışan işlemi bulun:
   ```cmd
   netstat -ano | findstr :8000
   netstat -ano | findstr :3000
   ```

2. İşlemi sonlandırın:
   ```cmd
   taskkill /PID <PID_NUMARASI> /F
   ```

## Hızlı Kontrol Listesi

- [ ] Node.js kurulu mu? (`node --version`)
- [ ] Python kurulu mu? (`python --version`)
- [ ] MongoDB Atlas bağlantısı çalışıyor mu?
- [ ] `frontend/node_modules` klasörü var mı?
- [ ] `backend/venv` klasörü var mı?
- [ ] `.env` dosyaları doğru mu?

## İletişim

Sorun devam ederse, hata mesajlarını kaydedin ve paylaşın.


