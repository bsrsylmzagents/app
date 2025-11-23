@echo off
chcp 65001 >nul
cls
echo ========================================
echo BACKEND SERVER BASLATILIYOR
echo ========================================
echo.

REM Script'in bulundugu dizine git
cd /d "%~dp0"

echo Calisma dizini: %CD%
echo.

REM .env kontrolu
if not exist ".env" (
    echo .env dosyasi bulunamadi! Olusturuluyor...
    (
        echo MONGO_URL=mongodb+srv://besirsoylemez3_db_user:wlBkROn8B97uwb4V@travelsystem.r6ez2nk.mongodb.net/
        echo DB_NAME=tourcast
        echo CORS_ORIGINS=http://localhost:3000,https://app-one-lake-13.vercel.app,https://app-c1qr.onrender.com
        echo JWT_SECRET_KEY=tourcast_secret_key_2025
    ) > .env
    echo ✓ .env olusturuldu
) else (
    echo ✓ .env mevcut
)

REM Virtual environment kontrolu
if not exist "venv\Scripts\python.exe" (
    echo.
    echo Virtual environment bulunamadi! Olusturuluyor...
    python -m venv venv
    if errorlevel 1 (
        echo.
        echo HATA: Virtual environment olusturulamadi!
        echo Python kurulu mu kontrol edin: python --version
        pause
        exit /b 1
    )
    echo ✓ Virtual environment olusturuldu
    echo.
    echo Bagimliliklari yukleniyor...
    venv\Scripts\python.exe -m pip install --upgrade pip
    if errorlevel 1 (
        echo HATA: pip yuklenemedi!
        pause
        exit /b 1
    )
    venv\Scripts\python.exe -m pip install -r requirements.txt
    if errorlevel 1 (
        echo HATA: Bagimliliklari yuklenemedi!
        pause
        exit /b 1
    )
    echo ✓ Bagimliliklari yuklendi
) else (
    echo ✓ Virtual environment mevcut
)

echo.
echo ========================================
echo BACKEND BASLATILIYOR
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Durdurmak icin Ctrl+C basiniz.
echo.

REM Backend'i baslat
venv\Scripts\python.exe -m uvicorn server:app --reload --host 0.0.0.0 --port 8000

if errorlevel 1 (
    echo.
    echo HATA: Backend baslatilamadi!
    echo.
    pause
    exit /b 1
)

pause


