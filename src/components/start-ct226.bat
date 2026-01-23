@echo off
title CT226 SECURE SYSTEM
echo ========================================
echo    INITIALIZING CT226 SECURE ACCESS
echo ========================================
echo.

:: Set PATH to include Node.js permanently
setx PATH "C:\Program Files\nodejs;%PATH%"

:: Set PATH for current session
set PATH=C:\Program Files\nodejs;%PATH%

:: Check Node.js
echo [*] Checking Node.js installation...
node --version
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)

:: Check npm
echo [*] Checking npm...
npm --version
if errorlevel 1 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

:: Install packages if needed
echo [*] Checking dependencies...
if not exist "node_modules" (
    echo [*] Installing packages...
    npm install
) else (
    echo [*] Dependencies already installed
)

:: Start the CT226 system
echo [*] Starting CT226 System on port 2260...
echo [*] Open browser to: http://localhost:2260
echo [*] Login password: CT226
echo.
npm run dev

pause