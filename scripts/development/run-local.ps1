# PowerShell Script to run local development servers
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting Lambrín POS Development Servers " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Start Backend API
Write-Host "Starting ASP.NET Core Web API on http://localhost:5000..." -ForegroundColor Green
Start-Process -FilePath "dotnet" -ArgumentList "run --project src/backend/Pos.Api/Pos.Api.csproj --urls=http://localhost:5000"

# Start Frontend Vite Dev Server
Write-Host "Starting Vite React Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "--prefix src/frontend/pos-web run dev"

Write-Host "Environment successfully launched!" -ForegroundColor Yellow
Write-Host "Swagger API UI: http://localhost:5000/swagger" -ForegroundColor Gray
Write-Host "React Web App:  http://localhost:5173" -ForegroundColor Gray
