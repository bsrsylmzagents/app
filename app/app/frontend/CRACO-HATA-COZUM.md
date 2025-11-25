# CRACO Hatası - Çözüm

**Hata:** `'craco' is not recognized as an internal or external command`

---

## 🔴 SORUN

`npm start` komutu çalıştırıldığında şu hata alınıyor:
```
'craco' is not recognized as an internal or external command,
operable program or batch file.
```

Bu hata, `node_modules/.bin` klasöründe `craco.cmd` dosyasının olmadığını gösterir. Bu, npm paketlerinin düzgün yüklenmediği anlamına gelir.

---

## ✅ ÇÖZÜM

### Yöntem 1: Otomatik Script (Önerilen)

Frontend klasöründe `CRACO-FIX.bat` dosyasını çalıştırın:

```batch
cd C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend
CRACO-FIX.bat
```

Bu script:
1. ✅ `craco.cmd` dosyasını kontrol eder
2. ✅ Yoksa `npm install` çalıştırır
3. ✅ Paketleri `--legacy-peer-deps` flag'i ile yükler

---

### Yöntem 2: Manuel Çözüm

Eğer script çalışmazsa, şu komutları manuel olarak çalıştırın:

```batch
cd C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend

REM NPM paketlerini yükle
npm install --legacy-peer-deps

REM Kontrol et
dir node_modules\.bin\craco.cmd

REM Başlat
npm start
```

---

### Yöntem 3: Tam Temizleme (Sorun Devam Ederse)

Eğer yukarıdaki yöntemler işe yaramazsa:

```batch
cd C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend

REM Temizleme
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force

REM Yeniden yükle
npm install --legacy-peer-deps

REM Başlat
npm start
```

---

## 🔧 NEDEN BU SORUN OLDU?

1. **Eksik Paketler:** `npm install` çalıştırılmamış olabilir
2. **Bozuk node_modules:** `node_modules` klasörü eksik veya bozuk olabilir
3. **Yarn/NPM Çakışması:** Önceden yarn kullanılmış, sonra npm kullanılmaya başlanmış olabilir

---

## 📋 KONTROL LİSTESİ

- [ ] `node_modules` klasörü var mı?
- [ ] `node_modules/.bin/craco.cmd` dosyası var mı?
- [ ] `.npmrc` dosyası var mı?
- [ ] `package.json` dosyası doğru mu?
- [ ] `npm install --legacy-peer-deps` çalıştırıldı mı?
- [ ] `npm start` komutu çalışıyor mu?

---

## ✅ BAŞARILI OLDUKTAN SONRA

Eğer `npm start` komutu başarıyla çalışırsa, frontend şu adreste çalışacak:
- **Frontend:** http://localhost:3000

---

## 🆘 HALA SORUN VARSA

1. **Node.js Versiyonunu Kontrol Et:**
   ```batch
   node --version
   ```
   En az Node.js 16+ önerilir.

2. **NPM Versiyonunu Kontrol Et:**
   ```batch
   npm --version
   ```
   En az npm 7+ önerilir.

3. **PowerShell Execution Policy:**
   Eğer PowerShell script'leri çalışmıyorsa:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

---

## 📝 NOTLAR

- `.npmrc` dosyası otomatik olarak `legacy-peer-deps` kullanır
- `CRACO-FIX.bat` script'i otomatik olarak `craco` paketini kontrol eder
- Render ve Vercel deployment'larında da aynı ayarlar kullanılacak


