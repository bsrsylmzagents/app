# 🚀 Hızlı Kullanım Kılavuzu

## Tek Tıkla Başlatma

### ✅ BASLA.bat
**En kolay yöntem!** Proje kök dizininde `BASLA.bat` dosyasına çift tıklayın.

Bu dosya otomatik olarak:
- ✅ MongoDB kontrolü yapar
- ✅ Backend'i başlatır (ayrı pencere)
- ✅ Admin hesabını oluşturur
- ✅ Frontend'i başlatır (ayrı pencere)

**Sonuç:** Her iki server de ayrı pencerelerde çalışır!

---

## Diğer Kullanışlı Dosyalar

### 🛑 DURDUR.bat
Tüm serverleri durdurur (Backend + Frontend)

### 🔄 YENIDEN-BASLAT.bat
Serverleri durdurup yeniden başlatır

### 📋 LOCAL-SETUP.bat
İlk kurulum için (MongoDB kontrolü + .env düzenleme + başlatma)

---

## Erişim Adresleri

Başlatma sonrası:

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## Admin Giriş Bilgileri

- **Firma Kodu:** `1000`
- **Kullanıcı:** `admin`
- **Şifre:** `admin`

---

## Sorun Giderme

### Serverler Başlamıyor
1. MongoDB çalışıyor mu? (`MONGODB-BASLAT.bat`)
2. Port 8000 ve 3000 kullanımda mı?
3. Backend/Frontend pencerelerindeki hata mesajlarını kontrol edin

### MongoDB Hatası
- `MONGODB-BASLAT.bat` dosyasını çalıştırın
- Veya: `net start MongoDB`

### Frontend Açılmıyor
- Frontend penceresindeki hata mesajlarını kontrol edin
- `node_modules` klasörü var mı? (`npm install` gerekebilir)

---

## Notlar

- Serverleri kapatmak için açılan pencereleri kapatın
- Backend ve Frontend ayrı pencerelerde çalışır
- Her pencereyi minimize edebilirsiniz
- `DURDUR.bat` ile tüm serverleri toplu durdurabilirsiniz








