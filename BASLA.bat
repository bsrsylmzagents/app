@echo off
chcp 65001 >nul
title Travel Agency Management System
color 0A
cls

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Travel Agency Management System                          ║
echo ║   Backend + Frontend Baslatma                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM MongoDB kontrolü
echo [1/4] MongoDB kontrol ediliyor...
tasklist | find /i "mongod.exe" >nul 2>&1
if errorlevel 1 (
    sc query MongoDB 2>nul | find "RUNNING" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ⚠ UYARI: MongoDB calismiyor!
        echo MongoDB'yi baslatmak icin MONGODB-BASLAT.bat dosyasini calistirin.
        echo.
        pause
        exit /b 1
    )
)
echo ✓ MongoDB hazir
echo.

REM Backend başlat
echo [2/4] Backend baslatiliyor...
start "🔧 Backend Server (Port 8000)" /min cmd /k "cd /d %~dp0app\backend && start.bat"
timeout /t 12 /nobreak >nul
echo ✓ Backend baslatildi
echo.

REM Admin hesabı oluştur
echo [3/4] Admin hesabi kontrol ediliyor...
curl -X POST http://localhost:8000/api/auth/init-admin -H "Content-Type: application/json" >nul 2>&1
echo ✓ Admin hesabi hazir
echo.

REM Frontend başlat
echo [4/4] Frontend baslatiliyor...
start "🌐 Frontend Server (Port 3000)" /min cmd /k "cd /d %~dp0app\frontend && start-simple.bat"
timeout /t 3 /nobreak >nul
echo ✓ Frontend baslatildi
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║   ✅ BASLATMA TAMAMLANDI!                                   ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║   🌐 Frontend: http://localhost:3000                       ║
echo ║   🔧 Backend:  http://localhost:8000                       ║
echo ║   📚 API Docs: http://localhost:8000/docs                  ║
echo ║                                                              ║
echo ║   👤 ADMIN GIRIS:                                          ║
echo ║      Firma Kodu: 1000                                      ║
echo ║      Kullanici: admin                                       ║
echo ║      Sifre: admin                                           ║
echo ║                                                              ║
echo ║   💡 Serverleri kapatmak icin acilan pencereleri kapatin.  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Ana pencereyi açık tut
pause
