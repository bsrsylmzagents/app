@echo off
chcp 65001 >nul
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Travel Agency Management System - Local Başlatma         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Bu script backend ve frontend'i birlikte başlatacak.
echo.
echo ÖNEMLİ: MongoDB'nin çalıştığından emin olun!
echo.
pause

cd /d "%~dp0"

echo.
echo [1/3] Backend başlatılıyor...
start "Backend Server - Port 8000" cmd /k "cd app\backend && start.bat"

echo Backend'in başlamasını bekliyorum (10 saniye)...
timeout /t 10 /nobreak >nul

echo [2/3] Admin hesabı oluşturuluyor...
curl -X POST http://localhost:8000/api/auth/init-admin -H "Content-Type: application/json" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [3/3] Frontend başlatılıyor...
start "Frontend Server - Port 3000" cmd /k "cd app\frontend && start-simple.bat"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Serverler başlatıldı!                                      ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║   Backend:  http://localhost:8000                            ║
echo ║   API Docs: http://localhost:8000/docs                      ║
echo ║   Frontend: http://localhost:3000                           ║
echo ║                                                              ║
echo ║   ADMIN GİRİŞ BİLGİLERİ:                                    ║
echo ║   Firma Kodu: 1000                                          ║
echo ║   Kullanıcı: admin                                          ║
echo ║   Şifre: admin                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Serverleri kapatmak için açılan pencereleri kapatın.
echo.
pause

