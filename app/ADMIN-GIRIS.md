# Admin Giriş Sorunu Çözümü

## Admin Giriş Bilgileri
- **Firma Kodu:** `1000`
- **Kullanıcı Adı:** `admin`
- **Şifre:** `admin`

## Sorun Giderme Adımları

### 1. Backend'i Yeniden Başlatın
Backend'i durdurup yeniden başlatın. Admin hesabı backend başladığında otomatik oluşturulur.

### 2. Admin Hesabını Manuel Oluşturun (Gerekirse)
Eğer hala giriş yapamıyorsanız, şu endpoint'i çağırarak admin hesabını manuel oluşturabilirsiniz:

**Postman veya tarayıcıdan:**
```
POST http://localhost:8000/api/auth/init-admin
```

Veya terminal'den:
```bash
curl -X POST http://localhost:8000/api/auth/init-admin
```

### 3. MongoDB'yi Kontrol Edin
MongoDB'nin çalıştığından emin olun:
```bash
# Windows
net start MongoDB

# veya MongoDB servisini kontrol edin
```

### 4. Backend Loglarını Kontrol Edin
Backend terminal'inde şu logları görmelisiniz:
- "Admin company oluşturuluyor..." veya "Admin company zaten mevcut"
- "Admin user oluşturuluyor..." veya "Admin user zaten mevcut"

### 5. Giriş Yaparken Dikkat Edin
- Firma Kodu: `1000` (tam olarak, büyük/küçük harf duyarsız)
- Kullanıcı Adı: `admin` (küçük harf)
- Şifre: `admin` (küçük harf)

## Test Endpoint'i
Admin hesabını test etmek için:
```
GET http://localhost:8000/api/auth/me
Authorization: Bearer <token>
```

## Hala Sorun Varsa
1. Backend loglarını kontrol edin
2. MongoDB bağlantısını kontrol edin
3. Browser console'da hata mesajlarını kontrol edin
4. Network tab'inde API isteğini kontrol edin








