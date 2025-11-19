@echo off
chcp 65001 >nul
cls
echo ========================================
echo HIZLI BASLATMA (LOCAL)
echo ========================================
echo.
echo Bu script:
echo   1. .env dosyalarini kontrol eder/duzeltir
echo   2. Backend'i baslatir
echo   3. Admin hesabini olusturur
echo   4. Frontend'i baslatir
echo.
pause

cd /d "%~dp0"

REM Frontend .env düzelt
echo [1/4] Frontend .env duzeltiliyor...
cd app\frontend
(
    echo REACT_APP_BACKEND_URL=http://localhost:8000
    echo WDS_SOCKET_PORT=3000
    echo REACT_APP_ENABLE_VISUAL_EDITS=false
    echo ENABLE_HEALTH_CHECK=false
) > .env
echo ✓ Frontend .env hazir
cd ..\..

REM Backend .env kontrol
echo [2/4] Backend .env kontrol ediliyor...
cd app\backend
if not exist ".env" (
    (
        echo MONGO_URL=mongodb://localhost:27017
        echo DB_NAME=travel_agency_db
        echo JWT_SECRET_KEY=
        echo CORS_ORIGINS=http://localhost:3000
    ) > .env
)
echo ✓ Backend .env hazir
cd ..\..

REM MongoDB kontrol
echo [3/4] MongoDB kontrol ediliyor...
tasklist | find /i "mongod.exe" >nul 2>&1
if errorlevel 1 (
    sc query MongoDB 2>nul | find "RUNNING" >nul 2>&1
    if errorlevel 1 (
        echo UYARI: MongoDB calismiyor!
        pause
        exit /b 1
    )
)
echo ✓ MongoDB hazir

REM Backend başlat
echo [4/4] Backend baslatiliyor...
start "Backend" cmd /k "cd app\backend && start.bat"
timeout /t 12 /nobreak >nul

REM Admin oluştur
curl -X POST http://localhost:8000/api/auth/init-admin -H "Content-Type: application/json" >nul 2>&1

REM Frontend başlat
echo Frontend baslatiliyor...
start "Frontend" cmd /k "cd app\frontend && start-simple.bat"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo BASLATMA TAMAMLANDI!
echo ========================================
echo.
echo ONEMLI: Frontend'i durdurup yeniden baslatin!
echo .env degisikligi icin restart gerekir.
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo ADMIN GIRIS:
echo   Firma: 1000
echo   Kullanici: admin
echo   Sifre: admin
echo.
pause








