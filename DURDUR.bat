@echo off
chcp 65001 >nul
title Serverleri Durdur
color 0C
cls

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Serverleri Durdurma                                       ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Backend ve Frontend serverleri durduruluyor...
echo.

REM Node.js process'lerini durdur (Frontend)
taskkill /F /IM node.exe >nul 2>&1
if not errorlevel 1 (
    echo ✓ Frontend durduruldu
) else (
    echo - Frontend zaten durdurulmus
)

REM Python uvicorn process'lerini durdur (Backend)
taskkill /F /FI "WINDOWTITLE eq *Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq *uvicorn*" >nul 2>&1
for /f "tokens=2" %%a in ('tasklist ^| findstr /i "python.exe"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo ✓ Backend durduruldu
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║   ✅ Tum serverler durduruldu!                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

pause








