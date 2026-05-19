# Run both servers for RecruitAI
$ErrorActionPreference = "SilentlyContinue"

# Kill any existing processes on our ports
netstat -ano | Select-String "LISTENING" | Select-String ":8000" | ForEach-Object {
  $p = ($_ -split '\s+')[-1]
  if ($p -match '^\d+$') { taskkill /F /PID $p 2>$null }
}
netstat -ano | Select-String "LISTENING" | Select-String ":5173" | ForEach-Object {
  $p = ($_ -split '\s+')[-1]
  if ($p -match '^\d+$') { taskkill /F /PID $p 2>$null }
}
Start-Sleep -Seconds 2

# Start backend
$logDir = Split-Path $MyInvocation.MyCommand.Path
$be = Start-Process -NoNewWindow -FilePath "$logDir\backend\venv\Scripts\python.exe" `
  -ArgumentList "-m","uvicorn","main:app","--host","0.0.0.0","--port","8000","--log-level","error" `
  -WorkingDirectory "$logDir\backend" -PassThru

Start-Sleep -Seconds 4

# Start frontend
$fe = Start-Process -NoNewWindow -FilePath "npx" `
  -ArgumentList "vite","--host","0.0.0.0" `
  -WorkingDirectory "$logDir\frontend" -PassThru

Write-Host "Backend PID: $($be.Id)"
Write-Host "Frontend PID: $($fe.Id)"
Write-Host ""
Write-Host "Open http://localhost:5173 in your browser"
Write-Host ""
Write-Host "Demo login: demo@recruitai.dev / demo123"
Write-Host "Press any key to stop servers..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Stop-Process -Id $be.Id -Force
Stop-Process -Id $fe.Id -Force
