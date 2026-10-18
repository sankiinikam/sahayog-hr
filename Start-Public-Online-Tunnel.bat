@echo off
title Sahayog HR — Public Online Tunnel
cd /d "C:\xampp\htdocs\hrms"

echo ===================================================================
echo   Sahayog HR - Free Global Public Access (No Credit Card Needed)
echo ===================================================================
echo.

:: 1. Ensure Django Backend is running on port 8000
powershell -NoProfile -Command "if (!(Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet)) { Write-Host 'Starting Django Backend...'; Start-Process powershell -WorkingDirectory 'C:\xampp\htdocs\hrms' -WindowStyle Hidden -ArgumentList '-NoProfile -Command backend\venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000' }"

:: 2. Wait up to 5 seconds for backend to be ready
powershell -NoProfile -Command "for ($i=0; $i -lt 10; $i++) { if (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet) { break }; Start-Sleep -Milliseconds 500 }"

echo [OK] Backend is active on port 8000!
echo.
echo Launching Cloudflare Tunnel...
echo Copy the https://xxxx.trycloudflare.com link below and add /api/v1
echo Example: https://xxxx.trycloudflare.com/api/v1
echo.
echo (Press Ctrl+C to stop the tunnel when finished)
echo ===================================================================
echo.

.\cloudflared.exe tunnel --url http://127.0.0.1:8000

pause
