@echo off
echo =====================================================================
echo  PolyCompile — Local Development Launcher (No Docker Required)
echo  WARNING: Code executes directly on this machine - Development only!
echo =====================================================================

set LOCAL_DEV_MODE=true
set LOCAL_GATEWAY_MODE=true
set PORT=3000
set LOCAL_DEV_PORT=8081
set INTERACTIVE_GATEWAY_URL=ws://localhost:8081

echo [1/2] Starting PolyCompile Local Development Gateway on port 8081...
start "PolyCompile Local Gateway (Port 8081)" node local-dev-gateway.js

timeout /t 2 /nobreak >nul

echo [2/2] Starting PolyCompile Web Application on port 3000...
start "PolyCompile Web App (Port 3000)" node server.js

echo.
echo =====================================================================
echo  PolyCompile is now running!
echo  Web Interface:      http://localhost:3000
echo  Interactive Gateway: ws://localhost:8081
echo =====================================================================
echo Close the launcher windows to stop the servers.
