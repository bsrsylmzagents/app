# Network Error Sorun Giderme

## Network Error Alıyorsanız

### 1. Backend Çalışıyor mu Kontrol Edin

**Yöntem A: Tarayıcıdan**
- http://localhost:8000 adresini açın
- `{"message":"FastAPI server çalışıyor!"}` mesajını görmelisiniz

**Yöntem B: BACKEND-KONTROL.bat**
- Proje kök dizininde `BACKEND-KONTROL.bat` dosyasını çalıştırın

**Yöntem C: Terminal**
```bash
curl http://localhost:8000
```

### 2. Backend Çalışmıyorsa

1. Backend penceresini kontrol edin
2. Hata mesajlarını okuyun
3. MongoDB çalışıyor mu kontrol edin
4. Port 8000 kullanımda mı kontrol edin

### 3. Backend'i Yeniden Başlatın

```batch
cd app\backend
start.bat
```

### 4. Frontend Console'unu Kontrol Edin

1. Tarayıcıda F12 tuşuna basın
2. Console sekmesine gidin
3. Şu mesajları görmelisiniz:
   - `🔗 Backend URL: http://localhost:8000`
   - `🔗 API URL: http://localhost:8000/api`

### 5. CORS Sorunu Varsa

Backend'de `.env` dosyasını kontrol edin:
```
CORS_ORIGINS=http://localhost:3000
```

### 6. Hızlı Test

Backend çalışıyorsa şu adresi açın:
- http://localhost:8000/docs (API dokümantasyonu)
- http://localhost:8000/health (Sağlık kontrolü)

## Yaygın Hatalar

### "ECONNREFUSED" veya "Network Error"
- **Sebep:** Backend çalışmıyor
- **Çözüm:** Backend'i başlatın

### "CORS policy" hatası
- **Sebep:** CORS ayarları yanlış
- **Çözüm:** Backend `.env` dosyasında `CORS_ORIGINS=http://localhost:3000` olduğundan emin olun

### "404 Not Found"
- **Sebep:** API endpoint yanlış
- **Çözüm:** Frontend'de API URL'ini kontrol edin

### "401 Unauthorized"
- **Sebep:** Giriş bilgileri yanlış
- **Çözüm:** Admin giriş bilgilerini kontrol edin (1000/admin/admin)








