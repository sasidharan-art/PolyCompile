@echo off
title PolyCompile - Production Deployment Hub
color 0A
:MENU
cls
echo ======================================================================
echo   PolyCompile - Production Deployment Hub
echo   Unified Multi-Language Compiler & Intelligent Execution System
echo ======================================================================
echo.
echo   [1] Run Production Server (Local Port 3000)
echo   [2] Deploy via Docker (Containerized Service)
echo   [3] Stop Docker Deployment
echo   [4] Run Full Verification Test Suite (25+ Languages)
echo   [5] Package Fresh Production Deployment ZIP
echo   [6] Open PolyCompile in Browser (http://localhost:3000)
echo   [7] Push to GitHub / Git Remote
echo   [8] Deploy to Vercel (npx vercel)
echo   [9] Exit
echo.
echo ======================================================================
set /p choice="Select an option (1-9): "

if "%choice%"=="1" goto RUN_LOCAL
if "%choice%"=="2" goto RUN_DOCKER
if "%choice%"=="3" goto STOP_DOCKER
if "%choice%"=="4" goto RUN_TESTS
if "%choice%"=="5" goto PACKAGE_ZIP
if "%choice%"=="6" goto OPEN_BROWSER
if "%choice%"=="7" goto GIT_PUSH
if "%choice%"=="8" goto VERCEL_DEPLOY
if "%choice%"=="9" exit /b 0

goto MENU

:RUN_LOCAL
cls
echo [DEPLOY] Starting PolyCompile production server...
start "" http://localhost:3000
npm start
pause
goto MENU

:RUN_DOCKER
cls
echo [DEPLOY] Checking Docker engine...
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed or not in PATH!
    pause
    goto MENU
)
echo [DEPLOY] Building and starting Docker container...
docker compose up -d --build
echo.
echo [OK] PolyCompile container deployed on port 3000!
echo Check container status with: docker ps
pause
goto MENU

:STOP_DOCKER
cls
echo [DEPLOY] Stopping PolyCompile Docker container...
docker compose down
pause
goto MENU

:RUN_TESTS
cls
echo [TEST] Executing unit tests and multi-paradigm verification...
node test.js
echo.
node verify_all.js
echo.
pause
goto MENU

:PACKAGE_ZIP
cls
echo [PACKAGE] Compressing production files into PolyCompile.zip...
powershell -Command "Get-ChildItem -Exclude 'node_modules', 'PolyCompile*.zip' | Compress-Archive -DestinationPath 'PolyCompile.zip' -Force"
echo [OK] Fresh PolyCompile.zip generated successfully!
pause
goto MENU

:OPEN_BROWSER
start "" http://localhost:3000
goto MENU

:GIT_PUSH
cls
echo ======================================================================
echo   Git Remote Push Helper
echo ======================================================================
echo.
git status
echo.
set /p remote_url="Enter your GitHub repository URL (e.g., https://github.com/username/polycompile.git): "
if "%remote_url%"=="" (
    echo [INFO] No URL entered. Returning to menu...
    pause
    goto MENU
)
git branch -M main
git remote remove origin 2>nul
git remote add origin %remote_url%
echo [GIT] Pushing main branch to %remote_url%...
git push -u origin main
echo.
pause
goto MENU

:VERCEL_DEPLOY
cls
echo ======================================================================
echo   Vercel Deployment Helper
echo ======================================================================
echo.
echo Launching Vercel deployment CLI (npx vercel)...
call npx vercel
echo.
pause
goto MENU

