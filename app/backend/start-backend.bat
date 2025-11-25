@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cls

echo ========================================
echo BACKEND SERVER BASLATILIYOR
echo ========================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo Calisma dizini: %CD%
echo.

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo HATA: Python bulunamadi!
    echo Python kurulu mu kontrol edin: python --version
    echo.
    pause
    exit /b 1
)

REM .env file check
if not exist ".env" (
    echo .env dosyasi bulunamadi! Olusturuluyor...
    (
        echo MONGO_URL=mongodb+srv://besirsoylemez3_db_user:wlBkROn8B97uwb4V@travelsystem.r6ez2nk.mongodb.net/
        echo DB_NAME=tourcast
        echo CORS_ORIGINS=http://localhost:3000,https://app-one-lake-13.vercel.app,https://app-c1qr.onrender.com
        echo JWT_SECRET_KEY=tourcast_secret_key_2025
    ) > .env
    echo OK: .env olusturuldu
) else (
    echo OK: .env mevcut
)

REM Virtual environment check
set "VENV_PYTHON=%SCRIPT_DIR%venv\Scripts\python.exe"
if not exist "%VENV_PYTHON%" (
    echo.
    echo Virtual environment bulunamadi! Olusturuluyor...
    python -m venv venv
    if errorlevel 1 (
        echo.
        echo HATA: Virtual environment olusturulamadi!
        echo Python kurulu mu kontrol edin: python --version
        echo.
        pause
        exit /b 1
    )
    echo OK: Virtual environment olusturuldu
    echo.
    echo Bagimliliklari yukleniyor...
    "%VENV_PYTHON%" -m pip install --upgrade pip
    if errorlevel 1 (
        echo HATA: pip yuklenemedi!
        pause
        exit /b 1
    )
    "%VENV_PYTHON%" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo HATA: Bagimliliklari yuklenemedi!
        pause
        exit /b 1
    )
    echo OK: Bagimliliklari yuklendi
) else (
    echo OK: Virtual environment mevcut
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

REM Start backend
"%VENV_PYTHON%" -m uvicorn server:app --reload --host 0.0.0.0 --port 8000

if errorlevel 1 (
    echo.
    echo HATA: Backend baslatilamadi!
    echo.
    pause
    exit /b 1
)

pause
