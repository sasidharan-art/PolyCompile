@echo off
title PolyCompile - Unified Multi-Language Compiler Platform
color 0B
echo ======================================================================
echo   PolyCompile: Unified Multi-Language Compiler Platform
echo   Automatic Language Detection & Multi-Paradigm Execution System
echo ======================================================================
echo.

:: Verify Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org and re-run.
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [SETUP] Installing required dependencies (express)...
    call npm install express
    echo.
)

echo [OK] Starting PolyCompile server on http://localhost:3000...
echo [OK] Opening default browser...
start "" http://localhost:3000

echo.
echo Press Ctrl+C in this window anytime to stop the server.
echo.
node server.js
pause
