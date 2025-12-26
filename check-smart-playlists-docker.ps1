# Smart Playlists Docker Setup Checker (PowerShell)
# Проверка настройки автозапуска умных подборок

Write-Host "`n🔍 ПРОВЕРКА НАСТРОЙКИ SMART PLAYLISTS В DOCKER" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$PASSED = 0
$FAILED = 0

function Check-Step {
    param($Message, $Success)
    if ($Success) {
        Write-Host "✅ $Message" -ForegroundColor Green
        $script:PASSED++
    } else {
        Write-Host "❌ $Message" -ForegroundColor Red
        $script:FAILED++
    }
}

# 1. Проверка Docker контейнера
Write-Host "1️⃣ Проверка Docker контейнера..."
$containerRunning = docker ps | Select-String "errorparty_backend"
Check-Step "Контейнер errorparty_backend запущен" ($null -ne $containerRunning)
Write-Host ""

# 2. Проверка переменной окружения
Write-Host "2️⃣ Проверка переменных окружения..."
$envVar = docker exec errorparty_backend printenv 2>$null | Select-String "ENABLE_SMART_PLAYLISTS"
Check-Step "Переменная ENABLE_SMART_PLAYLISTS установлена" ($null -ne $envVar)
Write-Host ""

# 3. Проверка файлов
Write-Host "3️⃣ Проверка файлов в контейнере..."
$schedulerExists = docker exec errorparty_backend test -f /app/src/schedulers/smart-playlists.scheduler.js 2>$null; $LASTEXITCODE -eq 0
Check-Step "Файл smart-playlists.scheduler.js существует" $schedulerExists

$serviceExists = docker exec errorparty_backend test -f /app/src/services/smart-playlist-generator.service.js 2>$null; $LASTEXITCODE -eq 0
Check-Step "Файл smart-playlist-generator.service.js существует" $serviceExists

$rebuildExists = docker exec errorparty_backend test -f /app/rebuild-playlists.js 2>$null; $LASTEXITCODE -eq 0
Check-Step "Файл rebuild-playlists.js существует" $rebuildExists
Write-Host ""

# 4. Проверка node-cron
Write-Host "4️⃣ Проверка зависимостей..."
$cronInstalled = docker exec errorparty_backend npm list node-cron 2>$null; $LASTEXITCODE -eq 0
Check-Step "Пакет node-cron установлен" $cronInstalled
Write-Host ""

# 5. Проверка логов запуска
Write-Host "5️⃣ Проверка логов планировщика..."
$schedulerStarted = docker logs errorparty_backend 2>&1 | Select-String "Smart Playlists scheduler started"
Check-Step "Планировщик запущен (в логах)" ($null -ne $schedulerStarted)
Write-Host ""

# 6. Проверка API endpoints
Write-Host "6️⃣ Проверка API endpoints..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/music/smart-playlists/available" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Check-Step "API endpoint /available отвечает" ($response.StatusCode -eq 200)
} catch {
    Check-Step "API endpoint /available отвечает" $false
}
Write-Host ""

# 7. Проверка подборок в БД
Write-Host "7️⃣ Проверка базы данных..."
try {
    $count = docker exec errorparty_postgres psql -U errorparty_user -d errorparty_db -t -c "SELECT COUNT(*) FROM \`"Playlists\`" WHERE type = 'editorial';" 2>$null
    $count = $count.Trim()
    
    if ($count -and [int]$count -gt 0) {
        Write-Host "✅ Найдено $count editorial плейлистов" -ForegroundColor Green
        $script:PASSED++
    } else {
        Write-Host "⚠️  Editorial плейлисты не найдены (возможно, нужно запустить первую генерацию)" -ForegroundColor Yellow
        Write-Host "   Запустите: docker exec errorparty_backend node rebuild-playlists.js" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Ошибка проверки БД" -ForegroundColor Red
    $script:FAILED++
}
Write-Host ""

# 8. Тест генерации
Write-Host "8️⃣ Тест генерации подборки..."
$testCode = @"
const smartGen = require('./src/services/smart-playlist-generator.service');
(async () => {
  try {
    const result = await smartGen.generateTopTracks(5);
    console.log(result.tracks.length);
    process.exit(0);
  } catch (e) {
    console.error('ERROR');
    process.exit(1);
  }
})();
"@

try {
    $result = docker exec errorparty_backend node -e $testCode 2>&1
    if ($result -ne "ERROR" -and $result) {
        Write-Host "✅ Генерация работает (получено $result треков)" -ForegroundColor Green
        $script:PASSED++
    } else {
        Write-Host "❌ Ошибка генерации" -ForegroundColor Red
        $script:FAILED++
    }
} catch {
    Write-Host "❌ Ошибка генерации" -ForegroundColor Red
    $script:FAILED++
}
Write-Host ""

# Итоги
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Успешно: $PASSED" -ForegroundColor White
Write-Host "   Ошибок: $FAILED" -ForegroundColor White
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Система умных подборок настроена и работает!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
    Write-Host "   1. Запустите первую генерацию:" -ForegroundColor White
    Write-Host "      docker exec errorparty_backend node rebuild-playlists.js" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Проверьте API:" -ForegroundColor White
    Write-Host "      Invoke-WebRequest http://localhost:3001/api/music/smart-playlists/available" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Запустите тесты:" -ForegroundColor White
    Write-Host "      docker exec errorparty_backend node test-smart-playlists.js" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ!" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Рекомендации:" -ForegroundColor Cyan
    Write-Host "   1. Проверьте логи контейнера:" -ForegroundColor White
    Write-Host "      docker logs errorparty_backend" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Перезапустите контейнер:" -ForegroundColor White
    Write-Host "      docker-compose restart backend" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Пересоберите образ:" -ForegroundColor White
    Write-Host "      docker-compose build --no-cache backend" -ForegroundColor Gray
    Write-Host "      docker-compose up -d" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
