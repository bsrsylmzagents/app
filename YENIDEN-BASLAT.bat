@echo off
chcp 65001 >nul
title Yeniden Baslat
color 0E
cls

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Serverleri Yeniden Baslatma                               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/2] Mevcut serverler durduruluyor...
call DURDUR.bat

timeout /t 2 /nobreak >nul

echo.
echo [2/2] Serverler yeniden baslatiliyor...
call BASLA.bat








