# Build Docker images for router deployment

Write-Host "Building Docker images..." -ForegroundColor Cyan

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker not found!" -ForegroundColor Red
    exit 1
}

# Create output directory
$outputDir = "router-deploy"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Build backend
Write-Host "`n1. Building Backend..." -ForegroundColor Yellow
docker build -t errorparty-backend:latest -f backend/Dockerfile backend
if ($LASTEXITCODE -ne 0) { exit 1 }

# Build frontend
Write-Host "`n2. Building Frontend..." -ForegroundColor Yellow
docker build -t errorparty-frontend:latest -f frontend/Dockerfile frontend
if ($LASTEXITCODE -ne 0) { exit 1 }

# Pull base images
Write-Host "`n3. Pulling base images..." -ForegroundColor Yellow
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull nginx:alpine

# Export to tar
Write-Host "`n4. Exporting images..." -ForegroundColor Yellow
docker save -o "$outputDir/backend.tar" errorparty-backend:latest
docker save -o "$outputDir/frontend.tar" errorparty-frontend:latest
docker save -o "$outputDir/postgres.tar" postgres:15-alpine
docker save -o "$outputDir/redis.tar" redis:7-alpine
docker save -o "$outputDir/nginx.tar" nginx:alpine

Write-Host "`nDone! Files in $outputDir/" -ForegroundColor Green
Get-ChildItem $outputDir -File | Select-Object Name, @{L="Size (MB)";E={[math]::Round($_.Length/1MB,2)}}
