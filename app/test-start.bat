@echo off
chcp 65001 >nul
cls
echo ========================================
echo START.BAT TEST
echo ========================================
echo.

cd /d "%~dp0"

echo Mevcut dizin: %CD%
echo.

echo Dizin kontrolu:
if exist "backend" (
    echo ✓ backend klasoru mevcut
) else (
    echo ✗ backend klasoru bulunamadi!
)

if exist "frontend" (
    echo ✓ frontend klasoru mevcut
) else (
    echo ✗ frontend klasoru bulunamadi!
)

echo.
echo Python kontrolu:
python --version 2>nul
if errorlevel 1 (
    echo ✗ Python bulunamadi!
) else (
    echo ✓ Python mevcut
)

echo.
echo Node.js kontrolu:
node --version 2>nul
if errorlevel 1 (
    echo ✗ Node.js bulunamadi!
) else (
    echo ✓ Node.js mevcut
)

echo.
echo npm kontrolu:
where npm.cmd >nul 2>&1
if errorlevel 1 (
    where npm >nul 2>&1
    if errorlevel 1 (
        echo ✗ npm bulunamadi!
    ) else (
        echo ✓ npm mevcut (npm.exe)
    )
) else (
    echo ✓ npm mevcut (npm.cmd)
)

echo.
echo ========================================
echo TEST TAMAMLANDI
echo ========================================
echo.
pause

