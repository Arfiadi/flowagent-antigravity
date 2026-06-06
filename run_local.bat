@echo off
echo ===================================================
echo   Memulai FlowAgent secara lokal (Frontend ^& Backend)
echo ===================================================
echo.

echo [1/2] Memulai Backend FastAPI...
start "Backend - FlowAgent" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo [2/2] Memulai Frontend React...
start "Frontend - FlowAgent" cmd /k "cd frontend && npm run dev"

echo.
echo FlowAgent sedang berjalan di latar belakang!
echo Backend berjalan di: http://localhost:8000
echo Frontend berjalan di: http://localhost:5173
echo.
echo Tekan sembarang tombol pada jendela ini untuk MENGHENTIKAN kedua server dan KELUAR...
pause >nul

echo.
echo Menghentikan server...
taskkill /FI "WINDOWTITLE eq Backend - FlowAgent*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend - FlowAgent*" /T /F >nul 2>&1
echo Server telah dihentikan.
echo Selamat tinggal!
timeout /t 2 >nul
