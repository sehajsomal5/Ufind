@echo off
title UFind Campus Lost and Found
echo ==============================================
echo           Starting UFind Campus System
echo ==============================================

set "PATH=C:\Program Files\nodejs;C:\Users\Balkirat Singh\mongodb\MongoDB\Server\9.0\bin;%PATH%"
cd /d "%~dp0"

echo [1/3] Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo MongoDB is already running.
) else (
    echo Starting MongoDB...
    if not exist "C:\Users\Balkirat Singh\mongodb\data\db" mkdir "C:\Users\Balkirat Singh\mongodb\data\db"
    start "UFind MongoDB" /min "C:\Users\Balkirat Singh\mongodb\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "C:\Users\Balkirat Singh\mongodb\data\db" --bind_ip 127.0.0.1 --port 27017
    timeout /t 3 >nul
)

echo [2/3] Starting Backend API Server (Port 5001)...
start "UFind Backend" cmd /k "node server/server.js"
timeout /t 2 >nul

echo [3/3] Starting Frontend Vite Server (Port 5173)...
start "UFind Frontend" cmd /k "npm run dev"
timeout /t 2 >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo ==============================================
echo UFind is now running!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:5001
echo Default Admin: admin@ufind.edu / Admin#UFind2026!
echo ==============================================
pause
