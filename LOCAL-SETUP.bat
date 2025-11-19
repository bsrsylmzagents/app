@echo off
chcp 65001 >nul
cls
echo ========================================
echo LOCAL ORTAM KURULUMU
echo ========================================
echo.
echo Bu script:
echo   1. Backend .env dosyasini kontrol eder
echo   2. Frontend .env dosyasini local URL'e cevirir
echo   3. Backend'i baslatir
echo   4. Admin hesabini olusturur
echo   5. Frontend'i baslatir
echo.
pause

cd /d "%~dp0"

REM ========================================
REM 1. BACKEND .ENV KONTROLU
REM ========================================
echo.
echo [1/5] Backend .env kontrol ediliyor...
cd app\backend

if not exist ".env" (
    echo .env dosyasi olusturuluyor...
    (
        echo MONGO_URL=mongodb://localhost:27017
        echo DB_NAME=travel_agency_db
        echo JWT_SECRET_KEY=
        echo CORS_ORIGINS=http://localhost:3000
    ) > .env
    echo ✓ Backend .env olusturuldu
) else (
    echo ✓ Backend .env mevcut
    REM CORS kontrolü
    findstr /C:"CORS_ORIGINS=http://localhost:3000" .env >nul 2>&1
    if errorlevel 1 (
        echo CORS ayari guncelleniyor...
        powershell -Command "(Get-Content .env) -replace 'CORS_ORIGINS=.*', 'CORS_ORIGINS=http://localhost:3000' | Set-Content .env"
        echo ✓ CORS ayari guncellendi
    )
)

cd ..\..

REM ========================================
REM 2. FRONTEND .ENV DUZELTME
REM ========================================
echo.
echo [2/5] Frontend .env duzeltiliyor...
cd app\frontend

if not exist ".env" (
    echo .env dosyasi olusturuluyor...
    (
        echo REACT_APP_BACKEND_URL=http://localhost:8000
        echo WDS_SOCKET_PORT=3000
        echo REACT_APP_ENABLE_VISUAL_EDITS=false
        echo ENABLE_HEALTH_CHECK=false
    ) > .env
    echo ✓ Frontend .env olusturuldu
) else (
    echo Mevcut .env kontrol ediliyor...
    findstr /C:"REACT_APP_BACKEND_URL=http://localhost:8000" .env >nul 2>&1
    if errorlevel 1 (
        echo Production URL local URL ile degistiriliyor...
        powershell -Command "(Get-Content .env) -replace 'REACT_APP_BACKEND_URL=.*', 'REACT_APP_BACKEND_URL=http://localhost:8000' | Set-Content .env"
        echo ✓ Frontend .env guncellendi: http://localhost:8000
    ) else (
        echo ✓ Frontend .env zaten local URL kullaniyor
    )
)

echo.
echo Frontend .env icerigi:
type .env

cd ..\..

REM ========================================
REM 3. MONGODB KONTROLU
REM ========================================
echo.
echo [3/5] MongoDB kontrol ediliyor...
tasklist | find /i "mongod.exe" >nul 2>&1
if errorlevel 1 (
    sc query MongoDB 2>nul | find "RUNNING" >nul 2>&1
    if errorlevel 1 (
        echo UYARI: MongoDB calismiyor!
        echo MongoDB'yi baslatmak icin MONGODB-BASLAT.bat dosyasini calistirin.
        echo.
        pause
        exit /b 1
    )
)
echo ✓ MongoDB calisiyor

REM ========================================
REM 4. BACKEND BASLAT
REM ========================================
echo.
echo [4/5] Backend baslatiliyor...
start "Backend - Port 8000" cmd /k "cd app\backend && start.bat"
echo Backend baslatildi, bekleniyor (15 saniye)...
timeout /t 15 /nobreak >nul

REM Backend kontrolü
curl -s http://localhost:8000 >nul 2>&1
if errorlevel 1 (
    echo UYARI: Backend yanit vermiyor!
    echo Backend penceresini kontrol edin.
) else (
    echo ✓ Backend calisiyor
)

REM ========================================
REM 5. ADMIN HESABI OLUSTUR
REM ========================================
echo.
echo [5/5] Admin hesabi olusturuluyor...
timeout /t 2 /nobreak >nul
curl -X POST http://localhost:8000/api/auth/init-admin -H "Content-Type: application/json" 2>nul
if errorlevel 1 (
    echo UYARI: Admin hesabi olusturulamadi!
) else (
    echo ✓ Admin hesabi hazir
)

REM ========================================
REM 6. FRONTEND BASLAT
REM ========================================
echo.
echo Frontend baslatiliyor...
start "Frontend - Port 3000" cmd /k "cd app\frontend && start-simple.bat"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo KURULUM TAMAMLANDI!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo ADMIN GIRIS:
echo   Firma Kodu: 1000
echo   Kullanici: admin
echo   Sifre: admin
echo.
echo ONEMLI: Frontend'i yeniden baslatmaniz gerekebilir!
echo .env degisiklikleri icin restart gerekir.
echo.
pause








