# Deploy to Production Script
# Используйте этот скрипт для деплоя изменений на errorparty.ru

param(
    [string]$ServerIP = "errorparty.ru",
    [string]$ServerUser = "root",
    [string]$ProjectPath = "/root/errorparty"
)

Write-Host ""
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 DEPLOY TO PRODUCTION" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Список файлов для деплоя
$filesToDeploy = @(
    "frontend/src/pages/DownloadPage.jsx",
    "frontend/src/App.jsx",
    "frontend/src/components/Navbar.jsx",
    "frontend/public/downloads/"
)

Write-Host "📁 Файлы для загрузки на сервер:" -ForegroundColor Yellow
$filesToDeploy | ForEach-Object {
    Write-Host "  • $_" -ForegroundColor Gray
}
Write-Host ""

# Проверка наличия SSH
$sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
$scpAvailable = Get-Command scp -ErrorAction SilentlyContinue

if ($sshAvailable -and $scpAvailable) {
    Write-Host "✅ SSH/SCP доступны" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📤 Загрузка файлов на сервер..." -ForegroundColor Yellow
    
    # Копирование файлов
    foreach ($file in $filesToDeploy) {
        if (Test-Path $file) {
            $remotePath = "$ServerUser@${ServerIP}:${ProjectPath}/$file"
            Write-Host "  → $file" -ForegroundColor Cyan
            scp -r $file $remotePath
        }
    }
    
    Write-Host ""
    Write-Host "🔨 Пересборка контейнера на сервере..." -ForegroundColor Yellow
    
    # SSH команды на сервере
    $commands = @(
        "cd $ProjectPath",
        "docker-compose build frontend",
        "docker-compose restart frontend",
        "docker ps | grep frontend"
    )
    
    $sshCommand = $commands -join " && "
    ssh "$ServerUser@$ServerIP" $sshCommand
    
    Write-Host ""
    Write-Host "✅ Deploy завершен!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Проверьте: https://errorparty.ru/download" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ SSH не найден в системе" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 РУЧНОЙ DEPLOY:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Скопируйте измененные файлы на сервер через:" -ForegroundColor White
    Write-Host "   • WinSCP (https://winscp.net/)" -ForegroundColor Gray
    Write-Host "   • FileZilla" -ForegroundColor Gray
    Write-Host "   • Или другой FTP/SFTP клиент" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Подключитесь к серверу по SSH:" -ForegroundColor White
    Write-Host "   ssh $ServerUser@$ServerIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Выполните команды:" -ForegroundColor White
    Write-Host "   cd $ProjectPath" -ForegroundColor Cyan
    Write-Host "   docker-compose build frontend" -ForegroundColor Cyan
    Write-Host "   docker-compose restart frontend" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
