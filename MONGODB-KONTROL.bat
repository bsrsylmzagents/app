@echo off
chcp 65001 >nul
cls
echo ========================================
echo MongoDB Durum Kontrolu
echo ========================================
echo.

REM MongoDB servis durumu
echo [1/3] MongoDB servis durumu kontrol ediliyor...
sc query MongoDB >nul 2>&1
if errorlevel 1 (
    echo MongoDB servisi bulunamadi.
) else (
    sc query MongoDB | find "RUNNING" >nul
    if errorlevel 1 (
        echo MongoDB servisi durdurulmus.
        echo Baslatiliyor...
        net start MongoDB
        timeout /t 3 /nobreak >nul
    ) else (
        echo ✓ MongoDB servisi calisiyor.
    )
)

echo.
echo [2/3] MongoDB baglantisi test ediliyor...
mongosh --eval "db.adminCommand('ping')" --quiet >nul 2>&1
if errorlevel 1 (
    echo ✗ MongoDB baglantisi yapilamadi.
    echo.
    echo MongoDB'yi baslatmak icin MONGODB-BASLAT.bat dosyasini calistirin.
) else (
    echo ✓ MongoDB baglantisi basarili!
)

echo.
echo [3/3] MongoDB process kontrolu...
tasklist | find /i "mongod.exe" >nul
if errorlevel 1 (
    echo ✗ MongoDB process calismiyor.
) else (
    echo ✓ MongoDB process calisiyor.
)

echo.
pause








