@echo off
chcp 65001 >nul
cls
echo ========================================
echo FRONTEND TEST
echo ========================================
echo.

REM Script'in bulundugu dizine git
pushd "%~dp0"

echo Calisma dizini: %CD%
echo.

echo [1/5] Dizin kontrolu...
if exist "package.json" (
    echo ✓ package.json mevcut
) else (
    echo ✗ package.json bulunamadi!
    pause
    popd
    exit /b 1
)

echo.
echo [2/5] .env kontrolu...
if exist ".env" (
    echo ✓ .env mevcut
    echo Icerik:
    type .env
) else (
    echo ✗ .env bulunamadi!
)

echo.
echo [3/5] node_modules kontrolu...
if exist "node_modules" (
    echo ✓ node_modules mevcut
) else (
    echo ✗ node_modules bulunamadi!
    echo.
    echo Cozum: install-dependencies.bat calistirin
)

echo.
echo [4/5] npm kontrolu...
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
echo [5/5] Node.js kontrolu...
node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Node.js bulunamadi!
) else (
    echo ✓ Node.js mevcut
    node --version
)

echo.
echo ========================================
echo TEST TAMAMLANDI
echo ========================================
echo.
pause

popd


