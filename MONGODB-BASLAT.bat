@echo off
chcp 65001 >nul
cls
echo ========================================
echo MongoDB Baslatma
echo ========================================
echo.

REM MongoDB servisini başlatmayı dene
echo [1/3] MongoDB servisi baslatiliyor...
net start MongoDB >nul 2>&1
if errorlevel 1 (
    echo Servis baslatilamadi, manuel baslatma deneniyor...
) else (
    echo ✓ MongoDB servisi baslatildi
    timeout /t 3 /nobreak >nul
    goto :check
)

REM Manuel başlatma
echo [2/3] MongoDB manuel olarak baslatiliyor...

REM MongoDB'nin kurulu olduğu yerleri kontrol et
set MONGODB_FOUND=0

if exist "C:\Program Files\MongoDB\Server" (
    for /d %%i in ("C:\Program Files\MongoDB\Server\*") do (
        if exist "%%i\bin\mongod.exe" (
            echo MongoDB bulundu: %%i
            if not exist "C:\data\db" mkdir "C:\data\db"
            start "MongoDB" "%%i\bin\mongod.exe" --dbpath "C:\data\db"
            set MONGODB_FOUND=1
            timeout /t 3 /nobreak >nul
            goto :check
        )
    )
)

if exist "%LOCALAPPDATA%\Programs\MongoDB" (
    for /d %%i in ("%LOCALAPPDATA%\Programs\MongoDB\*") do (
        if exist "%%i\bin\mongod.exe" (
            echo MongoDB bulundu: %%i
            if not exist "C:\data\db" mkdir "C:\data\db"
            start "MongoDB" "%%i\bin\mongod.exe" --dbpath "C:\data\db"
            set MONGODB_FOUND=1
            timeout /t 3 /nobreak >nul
            goto :check
        )
    )
)

if %MONGODB_FOUND%==0 (
    echo.
    echo HATA: MongoDB bulunamadi!
    echo.
    echo MongoDB'yi kurmaniz gerekiyor:
    echo   1. https://www.mongodb.com/try/download/community adresinden indirin
    echo   2. VEYA Chocolatey ile: choco install mongodb
    echo   3. VEYA MongoDB Atlas (cloud) kullanin
    echo.
    pause
    exit /b 1
)

:check
echo [3/3] MongoDB baglantisi kontrol ediliyor...
timeout /t 3 /nobreak >nul

mongosh --eval "db.adminCommand('ping')" --quiet >nul 2>&1
if errorlevel 1 (
    echo.
    echo UYARI: MongoDB baglantisi yapilamadi!
    echo MongoDB'nin basladigindan emin olun.
    echo.
    echo Acilan MongoDB penceresini kontrol edin.
    echo.
) else (
    echo.
    echo ✓ MongoDB basariyla baslatildi ve calisiyor!
    echo.
)

pause








