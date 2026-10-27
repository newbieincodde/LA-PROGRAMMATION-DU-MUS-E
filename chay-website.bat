@echo off
title ETHÉRÉ Atelier - Khoi Dong Website (Zero Node.js)
cd /d "%~dp0"

echo ===================================================================
echo   ÉTHÉRÉ ATELIER — KHOI DONG WEBSITE (KHONG CAN NODE.JS)
echo ===================================================================
echo Dang kiem tra moi truong may tinh...
echo.

:: 1. Kiem tra Python (Da co san tren may)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Phat hien Python tren may tinh!
    echo Dang khoi dong may chu nhe tai: http://localhost:8000/
    echo Website se tu dong mo tren trinh duyet mac dinh...
    echo.
    echo (Nhan to hop phim Ctrl + C trong cua so nay de dung may chu)
    echo ===================================================================
    start http://localhost:8000/index.html
    python -m http.server 8000
    goto end
)

:: 2. Kiem tra Python Launcher (py)
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Phat hien Python Launcher!
    echo Dang khoi dong may chu tai: http://localhost:8000/
    start http://localhost:8000/index.html
    py -m http.server 8000
    goto end
)

:: 3. Kiem tra Node.js / Vite (Neu ai do co san va thich dung Vite)
where npx.cmd >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Phat hien Node.js / Vite tren may!
    start http://localhost:5173/
    call npx.cmd vite --port 5173
    goto end
)

:: 4. Fallback Windows Native: Dung PowerShell co san 100% trong Windows (Khong can cai bat cu gi)
echo [OK] Su dung may chu Windows san co (Khong can cai bat ky phan mem nao)!
echo Dang khoi dong tai: http://localhost:8000/
start http://localhost:8000/index.html
powershell -ExecutionPolicy Bypass -File server.ps1 -Port 8000

:end
pause
