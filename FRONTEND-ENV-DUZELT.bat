@echo off
chcp 65001 >nul
cls
echo ========================================
echo Frontend .env Dosyasi Duzenleme
echo ========================================
echo.

cd /d "%~dp0\app\frontend"

if not exist ".env" (
    echo .env dosyasi olusturuluyor...
    (
        echo REACT_APP_BACKEND_URL=http://localhost:8000
        echo WDS_SOCKET_PORT=3000
        echo REACT_APP_ENABLE_VISUAL_EDITS=false
        echo ENABLE_HEALTH_CHECK=false
    ) > .env
    echo ✓ .env dosyasi olusturuldu
) else (
    echo Mevcut .env dosyasi:
    echo.
    type .env
    echo.
    echo Production URL'i local URL ile degistiriliyor...
    
    REM PowerShell ile değiştir
    powershell -Command "(Get-Content .env) -replace 'REACT_APP_BACKEND_URL=.*', 'REACT_APP_BACKEND_URL=http://localhost:8000' | Set-Content .env"
    
    echo.
    echo ✓ .env dosyasi guncellendi
    echo.
    echo Yeni .env icerigi:
    type .env
)

echo.
echo ONEMLI: Frontend'i yeniden baslatmaniz gerekiyor!
echo .env degisiklikleri icin restart gerekir.
echo.
pause








