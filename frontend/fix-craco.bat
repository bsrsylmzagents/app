@echo off
chcp 65001 >nul
cls
echo ========================================
echo CRACO HATASI COZUMU
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] node_modules temizleniyor...
if exist "node_modules" (
    echo node_modules siliniyor...
    rmdir /s /q "node_modules" 2>nul
    echo ✓ Temizlendi
) else (
    echo ✓ Zaten temiz
)

echo.
echo [2/4] package-lock.json temizleniyor...
if exist "package-lock.json" (
    del /f /q "package-lock.json" 2>nul
    echo ✓ Temizlendi
) else (
    echo ✓ Zaten temiz
)

echo.
echo [3/4] npm cache temizleniyor...
npm.cmd cache clean --force
echo ✓ Cache temizlendi

echo.
echo [4/4] Bağımlılıklar yeniden yükleniyor...
echo Bu işlem 5-10 dakika sürebilir, lütfen bekleyin...
echo.
echo LUTFEN BEKLEYIN, ISLEM DEVAM EDIYOR...
echo.

npm.cmd install --legacy-peer-deps --no-audit --progress=false

if errorlevel 1 (
    echo.
    echo HATA: npm install basarisiz!
    echo.
    echo Alternatif yontem deneniyor...
    npm.cmd cache clean --force
    echo.
    echo Tekrar yukleniyor...
    npm.cmd install --legacy-peer-deps
)

echo.
echo Kontrol ediliyor...

if not exist "node_modules" (
    echo.
    echo ========================================
    echo HATA: NODE_MODULES OLUSTURULAMADI!
    echo ========================================
    echo.
    echo npm install islemi basarisiz oldu.
    echo.
    echo Lutfen manuel olarak deneyin:
    echo   npm.cmd install --legacy-peer-deps
    echo.
    echo VEYA install-dependencies.bat calistirin.
    echo.
    pause
    exit /b 1
)

if exist "node_modules\@craco\craco" (
    echo.
    echo ========================================
    echo BASARILI!
    echo ========================================
    echo.
    echo ✓ node_modules olusturuldu
    echo ✓ craco yuklendi
    echo.
    echo Simdi frontend'i baslatabilirsiniz:
    echo   start-simple.bat
    echo   VEYA
    echo   npm.cmd start
    echo.
) else (
    echo.
    echo ========================================
    echo UYARI: CRACO BULUNAMADI!
    echo ========================================
    echo.
    echo node_modules olusturuldu ama craco bulunamadi.
    echo.
    echo craco manuel olarak yukleniyor...
    npm.cmd install @craco/craco --legacy-peer-deps
    if exist "node_modules\@craco\craco" (
        echo.
        echo ✓ craco yuklendi
        echo.
        echo Simdi frontend'i baslatabilirsiniz:
        echo   start-simple.bat
    ) else (
        echo.
        echo ✗ craco yuklenemedi!
        echo.
        echo Manuel olarak yukleyin:
        echo   npm.cmd install @craco/craco --legacy-peer-deps
        echo.
    )
)

pause

