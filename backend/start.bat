@echo off
echo ========================================
echo Backend Server Baslatiliyor...
echo ========================================
echo.

cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo Virtual environment bulunamadi! Olusturuluyor...
    python -m venv venv
    echo Virtual environment olusturuldu.
    echo.
    echo Bagimliliklari yukleniyor...
    venv\Scripts\python.exe -m pip install --upgrade pip
    venv\Scripts\python.exe -m pip install -r requirements.txt
    echo.
)

if not exist ".env" (
    echo .env dosyasi bulunamadi! Olusturuluyor...
    (
        echo MONGO_URL=mongodb://localhost:27017
        echo DB_NAME=travel_agency_db
        echo JWT_SECRET_KEY=
        echo CORS_ORIGINS=http://localhost:3000
    ) > .env
    echo .env dosyasi olusturuldu.
    echo.
)

echo MongoDB baglantisi kontrol ediliyor...
venv\Scripts\python.exe -c "from motor.motor_asyncio import AsyncIOMotorClient; import asyncio; async def test(): client = AsyncIOMotorClient('mongodb://localhost:27017'); await client.admin.command('ping'); print('MongoDB baglantisi basarili!'); asyncio.run(test())" 2>nul
if errorlevel 1 (
    echo UYARI: MongoDB baglantisi basarisiz! MongoDB'nin calistigindan emin olun.
    echo.
) else (
    echo MongoDB baglantisi basarili!
    echo.
)

echo.
echo Backend server baslatiliyor...
echo Backend: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Durdurmak icin Ctrl+C basiniz.
echo.

venv\Scripts\python.exe -m uvicorn server:app --reload --host 0.0.0.0 --port 8000

pause
