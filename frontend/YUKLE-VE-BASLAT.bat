@echo off
chcp 65001 >nul
cls
echo ========================================
echo FRONTEND YUKLEME VE BASLATMA
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Bağımlılıklar yükleniyor...
echo Bu işlem 5-10 dakika sürebilir, lütfen bekleyin...
echo.

REM install-dependencies.bat'i calistir
if exist "install-dependencies.bat" (
    call install-dependencies.bat
) else (
    echo HATA: install-dependencies.bat bulunamadi!
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo.
    echo HATA: node_modules yuklenemedi!
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Frontend baslatiliyor...
echo.

REM Frontend'i baslat
if exist "start-simple.bat" (
    call start-simple.bat
) else (
    echo HATA: start-simple.bat bulunamadi!
    echo.
    echo Manuel olarak baslatin:
    echo   npm.cmd start
    echo.
    pause
    exit /b 1
)


