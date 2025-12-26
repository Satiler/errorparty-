# Массовый скрейпинг всех подборок с sefon.pro
# Использование: .\scrape-all-collections.ps1

Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Массовый скрейпинг подборок Sefon.pro" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

# Параметры
$limitPerCollection = 30  # Треков из каждой подборки
$apiUrl = "http://localhost:3001/api"  # URL вашего API
$delaySeconds = 5  # Задержка между подборками

# Создаём временную папку
$tempDir = "tools/temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# 1. Извлекаем список подборок
Write-Host "[1/3] Извлечение списка подборок..." -ForegroundColor Yellow
node tools/sefon-collections-scraper.js --url=/collections/ --output="$tempDir/collections.json"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Ошибка извлечения подборок" -ForegroundColor Red
    exit 1
}

# 2. Читаем JSON
$collectionsFile = "$tempDir/collections.json"
if (-not (Test-Path $collectionsFile)) {
    Write-Host "`n❌ Файл $collectionsFile не найден" -ForegroundColor Red
    exit 1
}

$collections = Get-Content $collectionsFile -Raw | ConvertFrom-Json
$totalCollections = $collections.Count

Write-Host "`n✅ Найдено подборок: $totalCollections`n" -ForegroundColor Green

# 3. Скрейпим каждую подборку
$successCount = 0
$errorCount = 0

for ($i = 0; $i -lt $collections.Count; $i++) {
    $collection = $collections[$i]
    $num = $i + 1
    
    # Извлекаем относительный URL
    $url = $collection.url -replace 'https://sefon.pro', ''
    
    # Создаём безопасное имя файла
    $filename = $collection.title -replace '[^\w\s\-а-яА-ЯёЁ]', '' -replace '\s+', '_'
    $tracksFile = "$tempDir/$filename.json"
    
    Write-Host "[$num/$totalCollections] Подборка: $($collection.title)" -ForegroundColor Cyan
    Write-Host "           URL: $url" -ForegroundColor Gray
    
    # Скрейпим треки
    node tools/sefon-scraper.js --url=$url --limit=$limitPerCollection --output=$tracksFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "           ❌ Ошибка скрейпинга" -ForegroundColor Red
        $errorCount++
        continue
    }
    
    # Проверяем что файл создан и не пустой
    if (-not (Test-Path $tracksFile)) {
        Write-Host "           ❌ Файл треков не создан" -ForegroundColor Red
        $errorCount++
        continue
    }
    
    $tracks = Get-Content $tracksFile -Raw | ConvertFrom-Json
    $tracksCount = $tracks.Count
    
    if ($tracksCount -eq 0) {
        Write-Host "           ⚠️  Треков не найдено, пропускаем" -ForegroundColor Yellow
        $errorCount++
        continue
    }
    
    Write-Host "           ✅ Извлечено треков: $tracksCount" -ForegroundColor Green
    
    # Импортируем в БД (dry-run по умолчанию)
    Write-Host "           📤 Импорт в БД..." -ForegroundColor Gray
    node tools/sefon-import.js --input=$tracksFile --api=$apiUrl --dry-run
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "           ✅ Импорт завершён`n" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "           ❌ Ошибка импорта`n" -ForegroundColor Red
        $errorCount++
    }
    
    # Задержка между подборками
    if ($num -lt $totalCollections) {
        Write-Host "           ⏳ Задержка $delaySeconds сек...`n" -ForegroundColor Gray
        Start-Sleep -Seconds $delaySeconds
    }
}

# Итоги
Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Итоги обработки" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Всего подборок:  $totalCollections"
Write-Host "✅ Успешно:       $successCount" -ForegroundColor Green
Write-Host "❌ Ошибок:        $errorCount" -ForegroundColor Red

if ($successCount -eq $totalCollections) {
    Write-Host "`n🎉 Все подборки обработаны успешно!" -ForegroundColor Green
} elseif ($successCount -gt 0) {
    Write-Host "`n⚠️  Обработка завершена с ошибками" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Ни одна подборка не обработана" -ForegroundColor Red
}

Write-Host "`n💡 Совет: Удалите --dry-run из sefon-import.js для реального импорта`n" -ForegroundColor Cyan
