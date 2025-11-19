@echo off
cd /d "%~dp0"
echo Recharts paketi yukleniyor...
npm.cmd install recharts --legacy-peer-deps
echo.
echo Yukleme tamamlandi! React uygulamasini yeniden baslatin.
pause



