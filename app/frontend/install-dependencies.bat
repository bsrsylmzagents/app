@echo off
chcp 65001 >nul
cls
echo ========================================
echo FRONTEND BAGIMLILIKLARI YUKLENIYOR
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Eski node_modules temizleniyor...
if exist "node_modules" (
    echo node_modules siliniyor...
    rmdir /s /q "node_modules" 2>nul
    echo ✓ Temizlendi
) else (
    echo ✓ Zaten temiz
)

echo.
echo [2/3] package-lock.json temizleniyor...
if exist "package-lock.json" (
    del /f /q "package-lock.json" 2>nul
    echo ✓ Temizlendi
) else (
    echo ✓ Zaten temiz
)

echo.
echo [3/3] Bağımlılıklar yükleniyor...
echo Bu işlem 5-10 dakika sürebilir, lütfen bekleyin...
echo.

REM npm.cmd kullan (PowerShell execution policy sorununu asar)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    call npm install --legacy-peer-deps --no-audit --progress=false
    set NPM_CMD=npm
) else (
    call npm.cmd install --legacy-peer-deps --no-audit --progress=false
    set NPM_CMD=npm.cmd
)

if errorlevel 1 (
    echo.
    echo HATA: npm install basarisiz!
    echo.
    echo Alternatif yontem deneniyor...
    call %NPM_CMD% cache clean --force
    echo.
    echo Tekrar yukleniyor...
    call %NPM_CMD% install --legacy-peer-deps --no-audit
)

if exist "node_modules" (
    echo.
    echo node_modules yuklendi.
    echo.
    echo [KONTROL] craco kontrolu...
    if exist "node_modules\@craco\craco" (
        echo ✓ craco yuklendi
        echo.
        echo ========================================
        echo BASARILI!
        echo ========================================
        echo.
        echo Simdi frontend'i baslatabilirsiniz:
        echo   start-simple.bat
        echo   VEYA
        echo   npm.cmd start
        echo.
    ) else (
        echo ✗ craco bulunamadi!
        echo.
        echo craco manuel olarak yukleniyor...
        npm.cmd install @craco/craco --legacy-peer-deps
        if exist "node_modules\@craco\craco" (
            echo ✓ craco yuklendi
        ) else (
            echo ✗ craco yuklenemedi!
        )
    )
) else (
    echo.
    echo ========================================
    echo HATA!
    echo ========================================
    echo.
    echo node_modules yuklenemedi!
    echo.
    echo Lutfen su komutlari manuel olarak calistirin:
    echo   npm cache clean --force
    echo   npm install --legacy-peer-deps
    echo.
)

pause

