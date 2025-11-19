@echo off
title Başlat: Backend ve Frontend

:: --- Backend ---
echo Backend başlatılıyor...
cd /d "%~dp0\app\backend"
call ..\venv\Scripts\activate.bat
start cmd /k "uvicorn server:app --reload --port 8000"

:: --- Frontend ---
echo Frontend başlatılıyor...
cd /d "%~dp0\app\frontend"
start cmd /k "npm start"

echo Tüm servisler başlatıldı.
pause







