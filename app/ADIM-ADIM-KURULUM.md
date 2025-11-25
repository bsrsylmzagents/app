# 🚀 Local Ortam Kurulumu - Adım Adım

## Ön Gereksinimler

- ✅ MongoDB çalışıyor olmalı
- ✅ Python kurulu olmalı
- ✅ Node.js kurulu olmalı

## Hızlı Kurulum (Tek Tıkla)

**En Kolay Yol:** Proje kök dizininde `LOCAL-SETUP.bat` dosyasını çalıştırın!

Bu script otomatik olarak:
1. Backend .env dosyasını kontrol eder/oluşturur
2. Frontend .env dosyasını local URL'e çevirir
3. Backend'i başlatır
4. Admin hesabını oluşturur
5. Frontend'i başlatır

---

## Manuel Kurulum (Adım Adım)

### 1. MongoDB Kontrolü

```batch
REM MongoDB çalışıyor mu kontrol et
tasklist | find "mongod.exe"

REM Çalışmıyorsa başlat
net start MongoDB
```

### 2. Backend .env Dosyası

```batch
cd app\backend

REM .env dosyası oluştur/düzenle
(
    echo MONGO_URL=mongodb://localhost:27017
    echo DB_NAME=tourcast
    echo JWT_SECRET_KEY=
    echo CORS_ORIGINS=http://localhost:3000
) > .env
```

### 3. Frontend .env Dosyası

```batch
cd ..\frontend

REM .env dosyası oluştur/düzenle
(
    echo REACT_APP_BACKEND_URL=http://localhost:8000
    echo WDS_SOCKET_PORT=3000
    echo REACT_APP_ENABLE_VISUAL_EDITS=false
    echo ENABLE_HEALTH_CHECK=false
) > .env
```

**VEYA PowerShell ile mevcut .env'i düzelt:**
```powershell
cd app\frontend
(Get-Content .env) -replace 'REACT_APP_BACKEND_URL=.*', 'REACT_APP_BACKEND_URL=http://localhost:8000' | Set-Content .env
```

### 4. Backend Başlatma

```batch
cd app\backend

REM Virtual environment aktif et
venv\Scripts\activate

REM Bağımlılıkları yükle (ilk kez)
pip install -r requirements.txt

REM Backend'i başlat
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

**VEYA start.bat kullan:**
```batch
cd app\backend
start.bat
```

### 5. Admin Hesabı Oluşturma

Backend çalıştıktan sonra (10-15 saniye bekleyin):

```batch
curl -X POST http://localhost:8000/api/auth/init-admin -H "Content-Type: application/json"
```

**VEYA tarayıcıdan:**
```
http://localhost:8000/api/auth/init-admin
```
(POST isteği için Postman veya browser extension kullanın)

### 6. Frontend Başlatma

```batch
cd app\frontend

REM Bağımlılıkları yükle (ilk kez)
npm install

REM Frontend'i başlat
npm start
```

**VEYA start-simple.bat kullan:**
```batch
cd app\frontend
start-simple.bat
```

---

## Kontrol Listesi

### Backend Kontrolü
- [ ] http://localhost:8000 açılıyor mu?
- [ ] http://localhost:8000/docs (API docs) açılıyor mu?
- [ ] http://localhost:8000/health çalışıyor mu?

### Frontend Kontrolü
- [ ] http://localhost:3000 açılıyor mu?
- [ ] Browser console'da `🔗 Backend URL: http://localhost:8000` görünüyor mu?
- [ ] Network hatası yok mu?

### Admin Giriş
- [ ] Firma Kodu: `1000`
- [ ] Kullanıcı: `admin`
- [ ] Şifre: `admin`

---

## Sorun Giderme

### Backend Başlamıyor
1. MongoDB çalışıyor mu kontrol edin
2. Port 8000 kullanımda mı kontrol edin
3. Backend terminal'inde hata mesajlarını okuyun
4. Virtual environment aktif mi kontrol edin

### Frontend Başlamıyor
1. Port 3000 kullanımda mı kontrol edin
2. `node_modules` klasörü var mı? (`npm install` çalıştırın)
3. Frontend terminal'inde hata mesajlarını okuyun

### Network Error
1. Backend çalışıyor mu? (http://localhost:8000)
2. Frontend .env dosyasında `REACT_APP_BACKEND_URL=http://localhost:8000` var mı?
3. Frontend'i yeniden başlattınız mı? (.env değişiklikleri için restart gerekir)

### CORS Hatası
1. Backend .env dosyasında `CORS_ORIGINS=http://localhost:3000` var mı?
2. Backend'i yeniden başlattınız mı?

---

## Hızlı Komutlar

### Tümünü Başlat
```batch
LOCAL-SETUP.bat
```

### Sadece Frontend .env Düzelt
```batch
FRONTEND-ENV-DUZELT.bat
```

### Backend Kontrol
```batch
BACKEND-KONTROL.bat
```

### MongoDB Başlat
```batch
MONGODB-BASLAT.bat
```

---

## Önemli Notlar

1. **Frontend .env değişiklikleri için restart gerekir!**
   - .env dosyasını değiştirdikten sonra frontend'i durdurup yeniden başlatın

2. **Backend .env değişiklikleri için restart gerekir!**
   - .env dosyasını değiştirdikten sonra backend'i durdurup yeniden başlatın

3. **Admin hesabı otomatik oluşturulur**
   - Backend başladığında startup event'te admin hesabı oluşturulur
   - Manuel oluşturmak için: `POST http://localhost:8000/api/auth/init-admin`

4. **Port Çakışması**
   - Backend: 8000
   - Frontend: 3000
   - MongoDB: 27017
   - Bu portlar kullanımda ise uygulamalar başlamaz








