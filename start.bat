@echo off
cd /d "%~dp0"
start "RecruitAI Backend" /B "backend\venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000
echo Backend starting on port 8000...
timeout /t 5 /nobreak >nul
start "RecruitAI Frontend" /B cmd /c "cd frontend && npx vite --host 0.0.0.0"
echo Frontend starting on port 5173...
echo.
echo Open http://localhost:5173 in your browser
echo.
pause
