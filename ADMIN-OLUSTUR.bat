@echo off
chcp 65001 >nul
cls
echo ========================================
echo Admin Hesabi Olusturma
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Backend'in calistigini kontrol ediyorum...
timeout /t 2 /nobreak >nul

curl -s http://localhost:8000 >nul 2>&1
if errorlevel 1 (
    echo Backend calismiyor! Baslatiliyor...
    start "Backend Server" cmd /k "cd app\backend && start.bat"
    echo Backend baslatildi, 5 saniye bekleniyor...
    timeout /t 5 /nobreak >nul
) else (
    echo Backend calisiyor.
)

echo.
echo [2/2] Admin hesabi olusturuluyor...
echo.

curl -X POST http://localhost:8000/api/auth/init-admin 2>nul
if errorlevel 1 (
    echo.
    echo HATA: Admin hesabi olusturulamadi!
    echo Backend'in calistigindan emin olun.
    echo.
) else (
    echo.
    echo ========================================
    echo Admin Hesabi Basariyla Olusturuldu!
    echo ========================================
    echo.
    echo GIRIS BILGILERI:
    echo   Firma Kodu: 1000
    echo   Kullanici Adi: admin
    echo   Sifre: admin
    echo.
    echo Simdi http://localhost:3000/login adresinden giris yapabilirsiniz!
    echo.
)

pause








