# IBPipeline Docker Management Script for Windows
# PowerShell script for managing Docker containers

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "`n==================================" -ForegroundColor Cyan
    Write-Host "IBPipeline Docker Commands" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "`nUsage: .\docker-manager.ps1 <command>`n"
    
    Write-Host "Available Commands:" -ForegroundColor Yellow
    Write-Host "  help           - Show this help message"
    Write-Host "  start          - Start all services"
    Write-Host "  stop           - Stop all services"
    Write-Host "  restart        - Restart all services"
    Write-Host "  status         - Show status of all services"
    Write-Host "  logs           - View logs from all services"
    Write-Host "  logs-backend   - View backend logs"
    Write-Host "  logs-frontend  - View frontend logs"
    Write-Host "  health         - Check health of all services"
    Write-Host "  test           - Run all tests"
    Write-Host "  clean          - Clean up containers and volumes"
    Write-Host "  rebuild        - Rebuild and restart everything"
    Write-Host "  db-shell       - Open MongoDB shell"
    Write-Host "  setup          - First time setup"
    Write-Host "`n"
}

function Start-Services {
    Write-Host "`nStarting IBPipeline services..." -ForegroundColor Green
    docker-compose up -d
    Write-Host "`nWaiting for services to be healthy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    docker-compose ps
    Write-Host "`n✅ Services are running:" -ForegroundColor Green
    Write-Host "Frontend:  http://localhost:80" -ForegroundColor Cyan
    Write-Host "Backend:   http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Kafka UI:  http://localhost:8081" -ForegroundColor Cyan
}

function Stop-Services {
    Write-Host "`nStopping IBPipeline services..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "✅ Services stopped" -ForegroundColor Green
}

function Restart-Services {
    Write-Host "`nRestarting IBPipeline services..." -ForegroundColor Yellow
    docker-compose restart
    Write-Host "✅ Services restarted" -ForegroundColor Green
}

function Show-Status {
    Write-Host "`nService Status:" -ForegroundColor Cyan
    docker-compose ps
}

function Show-Logs {
    Write-Host "`nShowing logs (press Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose logs -f
}

function Show-BackendLogs {
    Write-Host "`nShowing backend logs (press Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose logs -f backend
}

function Show-FrontendLogs {
    Write-Host "`nShowing frontend logs (press Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose logs -f frontend
}

function Test-Health {
    Write-Host "`nChecking service health..." -ForegroundColor Cyan
    
    # Frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:80" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Frontend: Failed" -ForegroundColor Red
    }
    
    # Backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Backend: Failed" -ForegroundColor Red
    }
    
    # MongoDB
    try {
        $result = docker-compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MongoDB: OK" -ForegroundColor Green
        } else {
            Write-Host "❌ MongoDB: Failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ MongoDB: Failed" -ForegroundColor Red
    }
    
    # Kafka
    try {
        $result = docker-compose exec -T kafka kafka-broker-api-versions --bootstrap-server localhost:9092 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Kafka: OK" -ForegroundColor Green
        } else {
            Write-Host "❌ Kafka: Failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Kafka: Failed" -ForegroundColor Red
    }
}

function Run-Tests {
    Write-Host "`nRunning tests..." -ForegroundColor Cyan
    
    Write-Host "`n📦 Backend Tests:" -ForegroundColor Yellow
    Push-Location IBPipeline
    mvn test
    Pop-Location
    
    Write-Host "`n📦 Frontend Tests:" -ForegroundColor Yellow
    Push-Location frontend
    npm run test -- --watch=false --code-coverage
    Pop-Location
}

function Clean-All {
    Write-Host "`nCleaning up containers, volumes, and images..." -ForegroundColor Yellow
    docker-compose down -v --remove-orphans
    docker system prune -f
    Write-Host "✅ Cleanup complete" -ForegroundColor Green
}

function Rebuild-All {
    Write-Host "`nRebuilding everything..." -ForegroundColor Yellow
    Stop-Services
    Clean-All
    docker-compose build --no-cache
    Start-Services
    Write-Host "✅ Rebuild complete" -ForegroundColor Green
}

function Open-DBShell {
    Write-Host "`nOpening MongoDB shell..." -ForegroundColor Cyan
    docker-compose exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
}

function Setup-Environment {
    Write-Host "`n🚀 Setting up IBPipeline..." -ForegroundColor Cyan
    
    # Copy .env file
    if (!(Test-Path ".env")) {
        Write-Host "Creating .env file..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created" -ForegroundColor Green
    } else {
        Write-Host ".env file already exists" -ForegroundColor Yellow
    }
    
    # Build images
    Write-Host "`nBuilding Docker images..." -ForegroundColor Yellow
    docker-compose build
    
    # Start services
    Start-Services
    
    Write-Host "`n✅ Setup complete!" -ForegroundColor Green
    Write-Host "`nAccess your applications:" -ForegroundColor Cyan
    Write-Host "Frontend:  http://localhost:80" -ForegroundColor White
    Write-Host "Backend:   http://localhost:8080" -ForegroundColor White
    Write-Host "Kafka UI:  http://localhost:8081" -ForegroundColor White
}

# Main script logic
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "status" { Show-Status }
    "logs" { Show-Logs }
    "logs-backend" { Show-BackendLogs }
    "logs-frontend" { Show-FrontendLogs }
    "health" { Test-Health }
    "test" { Run-Tests }
    "clean" { Clean-All }
    "rebuild" { Rebuild-All }
    "db-shell" { Open-DBShell }
    "setup" { Setup-Environment }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
    }
}
