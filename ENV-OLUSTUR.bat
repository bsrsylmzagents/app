@echo off
chcp 65001 >nul
cls
echo ========================================
echo .env Dosyalari Olusturuluyor
echo ========================================
echo.

cd /d "%~dp0"

REM Frontend .env
echo [1/2] Frontend .env olusturuluyor...
cd app\frontend
(
    echo REACT_APP_BACKEND_URL=http://localhost:8000
    echo WDS_SOCKET_PORT=3000
    echo REACT_APP_ENABLE_VISUAL_EDITS=false
    echo ENABLE_HEALTH_CHECK=false
) > .env
echo ✓ Frontend .env olusturuldu
type .env
echo.

cd ..\..

REM Backend .env
echo [2/2] Backend .env kontrol ediliyor...
cd app\backend
if not exist ".env" (
    (
        echo MONGO_URL=mongodb://localhost:27017
        echo DB_NAME=travel_agency_db
        echo JWT_SECRET_KEY=
        echo CORS_ORIGINS=http://localhost:3000
    ) > .env
    echo ✓ Backend .env olusturuldu
) else (
    echo ✓ Backend .env zaten mevcut
    REM CORS kontrolü
    findstr /C:"CORS_ORIGINS=http://localhost:3000" .env >nul 2>&1
    if errorlevel 1 (
        echo CORS ayari guncelleniyor...
        powershell -Command "(Get-Content .env) -replace 'CORS_ORIGINS=.*', 'CORS_ORIGINS=http://localhost:3000' | Set-Content .env"
        echo ✓ CORS ayari guncellendi
    )
)
type .env
echo.

cd ..\..

echo ========================================
echo .env DOSYALARI HAZIR!
echo ========================================
echo.
echo Simdi frontend'i durdurup yeniden baslatin!
echo .env degisikligi icin restart gerekir.
echo.
pause








