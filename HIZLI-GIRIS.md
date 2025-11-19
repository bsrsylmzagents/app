# 🚀 Hızlı Başlatma ve Giriş

## Tek Tıkla Başlatma

**En Kolay Yol:** Proje kök dizininde `TAM-BASLAT.bat` dosyasına çift tıklayın!

Bu script otomatik olarak:
- ✅ MongoDB bağlantısını kontrol eder
- ✅ Backend'i başlatır
- ✅ Admin hesabını oluşturur
- ✅ Frontend'i başlatır

## Admin Giriş Bilgileri

Giriş yapmak için:

- **Firma Kodu:** `1000`
- **Kullanıcı Adı:** `admin`
- **Şifre:** `admin`

## Alternatif Başlatma Yöntemleri

### 1. BASLAT.bat (Hızlı)
Proje kök dizininde `BASLAT.bat` - Backend ve Frontend'i başlatır

### 2. ADMIN-OLUSTUR.bat (Sadece Admin)
Backend çalışıyorsa admin hesabını oluşturur

### 3. Manuel Başlatma

**Backend:**
```batch
cd app\backend
start.bat
```

**Frontend:**
```batch
cd app\frontend
start.bat
```

**Admin Oluştur:**
```batch
cd app
ADMIN-OLUSTUR.bat
```

## Sorun Giderme

### Giriş Yapamıyorum
1. `ADMIN-OLUSTUR.bat` dosyasını çalıştırın
2. Backend'in çalıştığından emin olun (http://localhost:8000)
3. Tarayıcı console'unda hata var mı kontrol edin

### Backend Başlamıyor
- MongoDB çalışıyor mu kontrol edin
- Port 8000 kullanımda mı kontrol edin
- Backend terminal'inde hata mesajlarını okuyun

### Frontend Başlamıyor
- Port 3000 kullanımda mı kontrol edin
- `node_modules` klasörü var mı kontrol edin
- Frontend terminal'inde hata mesajlarını okuyun

## Erişim Adresleri

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Dokümantasyonu:** http://localhost:8000/docs

## İlk Kullanım

1. `TAM-BASLAT.bat` dosyasını çalıştırın
2. Tarayıcıda http://localhost:3000/login adresine gidin
3. Admin bilgileriyle giriş yapın:
   - Firma Kodu: 1000
   - Kullanıcı: admin
   - Şifre: admin
4. Admin panelinde "Panel" menüsünü göreceksiniz
5. "Yeni Müşteri" ile ilk müşterinizi oluşturun








