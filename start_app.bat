@echo off
echo Starting Smart Bus Tracking (Node.js + separate Backend)...

start "Socket Server" cmd /k "cd socket-server && npm run dev"
set "PYTHON_EXEC=venv\Scripts\python"
if exist "venv_fix\Scripts\python.exe" set "PYTHON_EXEC=venv_fix\Scripts\python"

start "Python ML Backend" cmd /k "%PYTHON_EXEC% -m uvicorn backend.api:app --reload --port 8000"
timeout /t 5
start "Next.js App" cmd /k "cd web && npm run dev"

echo.
echo Application starting...
echo Dashboard: http://localhost:3000
echo Driver App: http://localhost:3000/driver
echo.
pause
