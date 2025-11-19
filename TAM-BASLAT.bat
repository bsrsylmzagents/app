@echo off
chcp 65001 >nul
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Travel Agency Management System - TAM BASLATMA          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Bu script:
echo   1. MongoDB baglantisini kontrol eder
echo   2. Backend'i baslatir
echo   3. Admin hesabini olusturur
echo   4. Frontend'i baslatir
echo.
echo ONEMLI: MongoDB'nin calistigindan emin olun!
echo.
pause

cd /d "%~dp0"

REM MongoDB kontrolü (process ve servis kontrolü)
echo [1/5] MongoDB kontrol ediliyor...

REM Önce process kontrolü
tasklist | find /i "mongod.exe" >nul 2>&1
if not errorlevel 1 (
    echo ✓ MongoDB process calisiyor
    goto :mongo_ok
)

REM Process yok, servis kontrolü yap
sc query MongoDB 2>nul | find "RUNNING" >nul 2>&1
if not errorlevel 1 (
    echo ✓ MongoDB servisi calisiyor
    goto :mongo_ok
)

REM Her ikisi de yok, MongoDB çalışmıyor
echo MongoDB calismiyor!
echo.
echo MongoDB'yi baslatmak icin MONGODB-BASLAT.bat dosyasini calistirin.
echo VEYA manuel olarak: net start MongoDB
echo.
echo Devam etmek istiyor musunuz? (MongoDB olmadan backend calismaz)
echo E/H secin:
choice /C EH /N /M "Seciminiz"
if errorlevel 2 (
    echo Iptal edildi.
    pause
    exit /b 1
)

REM MongoDB başlatmayı dene
call MONGODB-BASLAT.bat
timeout /t 3 /nobreak >nul

REM Tekrar kontrol et
tasklist | find /i "mongod.exe" >nul 2>&1
if errorlevel 1 (
    sc query MongoDB 2>nul | find "RUNNING" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo UYARI: MongoDB hala calismiyor!
        echo Backend MongoDB olmadan calismaz.
        echo.
        pause
        exit /b 1
    )
)

:mongo_ok
echo ✓ MongoDB hazir
echo.

REM Backend başlat
echo [2/5] Backend baslatiliyor...
start "Backend Server - Port 8000" cmd /k "cd app\backend && start.bat"
echo Backend baslatildi, baslamasini bekliyorum (15 saniye)...
timeout /t 15 /nobreak >nul
echo.

REM Backend kontrolü
echo [3/5] Backend kontrol ediliyor...
curl -s http://localhost:8000 >nul 2>&1
if errorlevel 1 (
    echo UYARI: Backend yanit vermiyor!
    echo Backend penceresini kontrol edin.
    echo.
) else (
    echo ✓ Backend calisiyor
    echo.
)

REM Admin hesabı oluştur
echo [4/5] Admin hesabi olusturuluyor...
timeout /t 2 /nobreak >nul
curl -X POST http://localhost:8000/api/auth/init-admin -H "Content-Type: application/json" 2>nul
if errorlevel 1 (
    echo UYARI: Admin hesabi olusturulamadi!
    echo Backend loglarini kontrol edin.
    echo.
) else (
    echo ✓ Admin hesabi hazir
    echo.
    echo   GIRIS BILGILERI:
    echo   Firma Kodu: 1000
    echo   Kullanici Adi: admin
    echo   Sifre: admin
    echo.
)

REM Frontend başlat
echo [5/5] Frontend baslatiliyor...
start "Frontend Server - Port 3000" cmd /k "cd app\frontend && start-simple.bat"
timeout /t 5 /nobreak >nul
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║   BASLATMA TAMAMLANDI!                                      ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║   Backend:  http://localhost:8000                           ║
echo ║   API Docs: http://localhost:8000/docs                     ║
echo ║   Frontend: http://localhost:3000                           ║
echo ║                                                              ║
echo ║   ADMIN GIRIS:                                              ║
echo ║   Firma Kodu: 1000                                          ║
echo ║   Kullanici: admin                                          ║
echo ║   Sifre: admin                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Serverleri kapatmak icin acilan pencereleri kapatin.
echo.
pause

