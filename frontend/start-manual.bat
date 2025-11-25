@echo off
chcp 65001 >nul
cls
echo ========================================
echo FRONTEND MANUEL BASLATMA
echo ========================================
echo.
echo Bu script frontend'i yeni bir CMD penceresinde baslatir.
echo.
echo Dizine gidiliyor...
cd /d "%~dp0"
echo Dizin: %CD%
echo.

REM Yeni CMD penceresinde npm start calistir
start "Frontend Server" cmd /k "cd /d %CD% && npm.cmd start"

echo.
echo Frontend yeni bir pencerede baslatildi.
echo.
echo O pencerede hata mesajlarini gorebilirsiniz.
echo.
pause


