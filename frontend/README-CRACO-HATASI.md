# 🔧 Craco Hatası Çözümü

## Hata Mesajı

```
'craco' is not recognized as an internal or external command
```

## Çözüm

### Hızlı Çözüm (Önerilen)

`fix-craco.bat` dosyasını çalıştırın:

```batch
cd frontend
fix-craco.bat
```

Bu script:
1. ✅ Eski `node_modules` klasörünü temizler
2. ✅ `package-lock.json` dosyasını siler
3. ✅ npm cache'i temizler
4. ✅ Tüm bağımlılıkları yeniden yükler
5. ✅ `craco` paketini kontrol eder

### Manuel Çözüm

CMD'de şu komutları **ayrı ayrı** çalıştırın:

```cmd
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend"
```

```cmd
rmdir /s /q node_modules
```

```cmd
del package-lock.json
```

```cmd
npm.cmd cache clean --force
```

```cmd
npm.cmd install --legacy-peer-deps
```

### Sadece Craco Yükleme

Eğer diğer paketler yüklüyse, sadece `craco`'yu yükleyin:

```cmd
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend"
npm.cmd install @craco/craco --legacy-peer-deps
```

## Kontrol

Craco'nun yüklü olduğunu kontrol edin:

```cmd
dir node_modules\@craco\craco
```

Bu komut bir klasör listesi göstermelidir.

## Başlatma

Craco yüklendikten sonra:

```batch
start-simple.bat
```

VEYA:

```cmd
npm.cmd start
```

## Sorun Devam Ederse

1. Node.js versiyonunu kontrol edin: `node --version`
2. npm versiyonunu kontrol edin: `npm.cmd --version`
3. `package.json` dosyasında `@craco/craco` paketinin olduğundan emin olun
4. Tüm bağımlılıkları yeniden yükleyin: `install-dependencies.bat`


