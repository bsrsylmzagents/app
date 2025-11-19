@echo off
cd /d "%~dp0"

echo Frontend baslatiliyor...

REM node_modules kontrolü
if not exist "node_modules" (
    echo node_modules yukleniyor...
    call npm install
)

REM .env kontrolü
if not exist ".env" (
    echo REACT_APP_BACKEND_URL=http://localhost:8000 > .env
    echo WDS_SOCKET_PORT=3000 >> .env
    echo REACT_APP_ENABLE_VISUAL_EDITS=false >> .env
    echo ENABLE_HEALTH_CHECK=false >> .env
)

REM Frontend başlat
echo Frontend baslatiliyor: http://localhost:3000
start "Frontend" cmd /k "npm start"

timeout /t 2 >nul
echo Frontend baslatildi! Yeni pencere acildi.
pause