@echo off
chcp 65001 >nul
cls
echo ========================================
echo TOURCAST
echo Backend ve Frontend Baslatiliyor...
echo ========================================
echo.

REM Script'in bulundugu dizine git
cd /d "%~dp0"

echo Calisma dizini: %CD%
echo.

REM Backend'i yeni pencerede baslat
echo [1/2] Backend baslatiliyor...
if exist "backend\start-backend.bat" (
    start "Backend Server" cmd /k "cd /d %~dp0backend && start-backend.bat"
    echo ✓ Backend baslatildi (ayri pencere)
) else (
    echo HATA: backend\start-backend.bat bulunamadi!
    pause
    exit /b 1
)

REM 3 saniye bekle
timeout /t 3 >nul

REM Frontend'i yeni pencerede baslat
echo [2/2] Frontend baslatiliyor...
if exist "frontend\start-frontend.bat" (
    start "Frontend Server" cmd /k "cd /d %~dp0frontend && start-frontend.bat"
    echo ✓ Frontend baslatildi (ayri pencere)
) else (
    echo HATA: frontend\start-frontend.bat bulunamadi!
    pause
    exit /b 1
)

echo.
echo ========================================
echo BASLATILDI!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Her iki sunucu da ayri pencerelerde calisiyor.
echo Durdurmak icin her iki pencereyi de kapatin.
echo.
pause


