@echo off
chcp 65001 >nul
cls
echo ========================================
echo Admin Hesabi Olusturuluyor...
echo ========================================
echo.

cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo Virtual environment bulunamadi!
    echo Lutfen once backend'i baslatin (start.bat)
    pause
    exit /b 1
)

echo MongoDB baglantisi kontrol ediliyor...
venv\Scripts\python.exe -c "from motor.motor_asyncio import AsyncIOMotorClient; import asyncio; async def test(): client = AsyncIOMotorClient('mongodb://localhost:27017'); await client.admin.command('ping'); print('MongoDB baglantisi basarili!'); asyncio.run(test())" 2>nul
if errorlevel 1 (
    echo UYARI: MongoDB baglantisi basarisiz!
    echo MongoDB'nin calistigindan emin olun.
    echo.
    pause
    exit /b 1
)

echo.
echo Admin hesabi olusturuluyor...
echo.

venv\Scripts\python.exe -c "import requests; response = requests.post('http://localhost:8000/api/auth/init-admin'); print('Response:', response.status_code); print(response.text if response.status_code == 200 else response.text)" 2>nul

if errorlevel 1 (
    echo.
    echo Backend calismiyor gibi gorunuyor.
    echo Backend'i baslatmak icin start.bat'i calistirin.
    echo.
) else (
    echo.
    echo Admin hesabi olusturuldu!
    echo.
    echo GIRIS BILGILERI:
    echo   Firma Kodu: 1000
    echo   Kullanici Adi: admin
    echo   Sifre: admin
    echo.
)

pause








