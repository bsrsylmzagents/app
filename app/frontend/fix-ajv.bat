@echo off
chcp 65001 >nul
cls
echo ========================================
echo AJV HATASI COZUMU
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] node_modules temizleniyor...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo ✓ node_modules silindi
) else (
    echo ✓ node_modules zaten yok
)

echo.
echo [2/4] package-lock.json temizleniyor...
if exist "package-lock.json" (
    del /f /q "package-lock.json"
    echo ✓ package-lock.json silindi
) else (
    echo ✓ package-lock.json zaten yok
)

echo.
echo [3/4] npm cache temizleniyor...
call npm cache clean --force
echo ✓ npm cache temizlendi

echo.
echo [4/4] Bağımlılıklar yeniden yükleniyor...
echo Bu işlem birkaç dakika sürebilir...
call npm install --legacy-peer-deps

if errorlevel 1 (
    echo.
    echo HATA: npm install basarisiz!
    echo.
    echo Alternatif cozum deneniyor...
    call npm install ajv@^8.12.0 --legacy-peer-deps
    call npm install --legacy-peer-deps
)

echo.
echo ========================================
echo TAMAMLANDI!
echo ========================================
echo.
echo Simdi frontend'i baslatabilirsiniz:
echo   npm start
echo.
pause


