@echo off
chcp 65001 >nul
cls
echo ========================================
echo FRONTEND SERVER BASLATILIYOR
echo ========================================
echo.

REM Hata durumunda script'in kapanmasini engelle
setlocal enabledelayedexpansion

REM Script'in bulundugu dizine git
pushd "%~dp0"

echo Calisma dizini: %CD%
echo.

REM Hata kontrolu
if errorlevel 1 (
    echo HATA: Dizine gecilemedi!
    pause
    popd
    exit /b 1
)

REM .env kontrolu
if not exist ".env" (
    echo .env dosyasi bulunamadi! Olusturuluyor...
    (
        echo REACT_APP_BACKEND_URL=http://localhost:8000
        echo WDS_SOCKET_PORT=3000
        echo REACT_APP_ENABLE_VISUAL_EDITS=false
        echo ENABLE_HEALTH_CHECK=false
    ) > .env
    echo ✓ .env olusturuldu
) else (
    echo ✓ .env mevcut
)

REM node_modules kontrolu
if not exist "node_modules" (
    echo.
    echo ========================================
    echo NODE_MODULES BULUNAMADI!
    echo ========================================
    echo.
    echo node_modules yukleniyor...
    echo Bu islem 5-10 dakika surebilir, lutfen bekleyin...
    echo.
    
    REM npm.cmd kontrolu
    where npm.cmd >nul 2>&1
    if errorlevel 1 (
        call npm install --legacy-peer-deps --no-audit --progress=false
    ) else (
        call npm.cmd install --legacy-peer-deps --no-audit --progress=false
    )
    
    if errorlevel 1 (
        echo.
        echo HATA: npm install basarisiz!
        echo Tekrar deneniyor (cache temizleniyor)...
        where npm.cmd >nul 2>&1
        if errorlevel 1 (
            call npm cache clean --force
            call npm install --legacy-peer-deps --no-audit
        ) else (
            call npm.cmd cache clean --force
            call npm.cmd install --legacy-peer-deps --no-audit
        )
    )
    
    if not exist "node_modules" (
        echo.
        echo ========================================
        echo HATA: NODE_MODULES YUKLENEMEDI!
        echo ========================================
        echo.
        echo Lutfen manuel olarak calistirin:
        echo   install-dependencies.bat
        echo.
        echo VEYA:
        echo   npm install --legacy-peer-deps
        echo.
        pause
        exit /b 1
    )
    
    echo.
    echo ✓ node_modules yuklendi
) else (
    echo ✓ node_modules mevcut
)

echo.
echo ========================================
echo FRONTEND BASLATILIYOR
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo.
echo Durdurmak icin Ctrl+C basiniz.
echo.

REM Frontend'i baslat
echo npm komutu calistiriliyor...
echo.

REM Port kontrolu
netstat -ano | findstr :3000 >nul 2>&1
if not errorlevel 1 (
    echo UYARI: Port 3000 zaten kullaniliyor!
    echo.
    echo Mevcut islemler:
    netstat -ano | findstr :3000
    echo.
    echo Bu islemi durdurmak ister misiniz? (E/H)
    set /p KILL_PORT=
    if /i "!KILL_PORT!"=="E" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
            taskkill /PID %%a /F >nul 2>&1
        )
        echo Port 3000 temizlendi.
        timeout /t 2 >nul
    )
)

echo.
echo Frontend baslatiliyor...
echo.

REM npm start komutunu calistir (call kullanmadan, direkt)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [DEBUG] npm.exe kullaniliyor
    echo.
    REM npm start komutunu direkt calistir (call olmadan)
    npm start
) else (
    echo [DEBUG] npm.cmd kullaniliyor
    echo.
    REM npm.cmd start komutunu direkt calistir (call olmadan)
    npm.cmd start
)

REM Buraya gelirse, npm start başarısız olmuş demektir
REM (npm start başarılı olursa script orada kalır, buraya gelmez)
echo.
echo ========================================
echo FRONTEND BASLATILAMADI!
echo ========================================
echo.
echo Olası nedenler:
echo   1. node_modules eksik veya bozuk
echo   2. npm komutu bulunamadı
echo   3. Port 3000 zaten kullanılıyor
echo   4. package.json'da start script'i yok
echo.
echo Cozum:
echo   1. install-dependencies.bat calistirin
echo   2. node_modules klasorunu kontrol edin
echo   3. Port 3000'i kullanan islemi durdurun
echo   4. package.json dosyasini kontrol edin
echo.
pause

REM Dizini geri al
popd
exit /b 1

