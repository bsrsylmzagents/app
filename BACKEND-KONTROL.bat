@echo off
chcp 65001 >nul
cls
echo ========================================
echo Backend Kontrol
echo ========================================
echo.

echo Backend baglantisi test ediliyor...
echo.

curl -s http://localhost:8000
if errorlevel 1 (
    echo.
    echo ✗ Backend calismiyor!
    echo.
    echo Backend'i baslatmak icin: app\backend\start.bat
    echo.
) else (
    echo.
    echo ✓ Backend calisiyor!
    echo.
)

echo.
echo API endpoint test ediliyor...
curl -s http://localhost:8000/api/auth/init-admin -X POST -H "Content-Type: application/json"
echo.

echo.
pause








