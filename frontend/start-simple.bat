@echo off
chcp 65001 >nul
cls
echo ========================================
echo FRONTEND BASLATILIYOR
echo ========================================
echo.

REM Dizine git
cd /d "%~dp0"
echo Dizin: %CD%
echo.

REM Kontroller
if not exist "node_modules" (
    echo HATA: node_modules bulunamadi!
    echo Lutfen once install-dependencies.bat calistirin.
    pause
    exit /b 1
)

if not exist "package.json" (
    echo HATA: package.json bulunamadi!
    pause
    exit /b 1
)

echo Kontroller tamamlandi.
echo.
echo Frontend baslatiliyor...
echo Port: http://localhost:3000
echo.
echo Durdurmak icin Ctrl+C basiniz.
echo.
echo ========================================
echo.

REM npm start komutunu calistir
npm.cmd start

REM Buraya gelirse, npm start basarisiz olmus demektir
echo.
echo ========================================
echo FRONTEND BASLATILAMADI!
echo ========================================
echo.
pause


