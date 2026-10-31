# Starts the backend (port 8010) and frontend (port 5173) in two new windows.
$root = $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8010"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"
Write-Host "Backend: http://127.0.0.1:8010  |  Site: http://localhost:5173  |  Dashboard: http://localhost:5173/admin"
