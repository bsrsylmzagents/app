# 🚀 Frontend Başlatma Rehberi

## Hızlı Başlatma

### Yöntem 1: Basit Başlatma (Önerilen)

```batch
start-simple.bat
```

### Yöntem 2: Manuel Başlatma (Yeni Pencere)

```batch
start-manual.bat
```

Bu yöntem frontend'i ayrı bir CMD penceresinde başlatır, böylece hata mesajlarını görebilirsiniz.

### Yöntem 3: CMD'den Direkt

CMD'yi açın ve şu komutları **ayrı ayrı** çalıştırın:

```cmd
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend"
npm.cmd start
```

**ÖNEMLİ:** Komutları birleştirmeyin! Her satırı ayrı çalıştırın.

## Sorun Giderme

### Script Direkt Kapanıyor

1. **start-manual.bat** kullanın (yeni pencerede açılır)
2. VEYA CMD'de manuel çalıştırın (hata mesajlarını görmek için)

### "Sistem belirtilen yolu bulamıyor" Hatası

Komutları doğru yazın:

**YANLIŞ:**
```cmd
cd "path"command
```

**DOĞRU:**
```cmd
cd "path"
command
```

Her komutu ayrı satırda çalıştırın!

### node_modules Bulunamıyor

```batch
install-dependencies.bat
```

### Port 3000 Zaten Kullanılıyor

```cmd
netstat -ano | findstr :3000
taskkill /PID <PID_NUMARASI> /F
```

## Test

Önce test edin:

```batch
test-frontend.bat
```

## Başarılı Başlatma

Frontend başarıyla başladığında şunu görmelisiniz:

```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
```

Tarayıcıda http://localhost:3000 adresine gidin.


