@echo off
title Sahayog HR Launcher
cd /d "C:\xampp\htdocs\hrms"

:: Check if backend is already running on port 8000
powershell -NoProfile -Command "if (!(Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet)) { Start-Process powershell -ArgumentList '-WindowStyle Hidden -NoProfile -Command cd C:\xampp\htdocs\hrms; backend\venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000' }"

:: Wait briefly to ensure backend service is listening
powershell -NoProfile -Command "for ($i=0; $i -lt 10; $i++) { if (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet) { break }; Start-Sleep -Milliseconds 500 }"

:: Launch Desktop App
start "" "C:\xampp\htdocs\hrms\desktop\release\win-unpacked\Sahayog HR.exe"

exit

