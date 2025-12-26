# Массовый скрейпинг треков всех популярных исполнителей
# Использование: .\scrape-all-artists.ps1

Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Массовый скрейпинг исполнителей Sefon.pro" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

# Параметры
$tracksPerArtist = 20  # Треков от каждого исполнителя
$apiUrl = "http://localhost:3001/api"  # URL вашего API
$delaySeconds = 3  # Задержка между артистами

# Создаём временную папку
$tempDir = "tools/temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# 1. Извлекаем список исполнителей
Write-Host "[1/3] Извлечение списка исполнителей..." -ForegroundColor Yellow
node tools/sefon-collections-scraper.js --url=/artists/ --output="$tempDir/artists.json"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Ошибка извлечения исполнителей" -ForegroundColor Red
    exit 1
}

# 2. Читаем JSON
$artistsFile = "$tempDir/artists.json"
if (-not (Test-Path $artistsFile)) {
    Write-Host "`n❌ Файл $artistsFile не найден" -ForegroundColor Red
    exit 1
}

$artists = Get-Content $artistsFile -Raw | ConvertFrom-Json
$totalArtists = $artists.Count

Write-Host "`n✅ Найдено исполнителей: $totalArtists`n" -ForegroundColor Green

# 3. Скрейпим треки каждого исполнителя
$successCount = 0
$errorCount = 0
$totalTracks = 0

for ($i = 0; $i -lt $artists.Count; $i++) {
    $artist = $artists[$i]
    $num = $i + 1
    
    # Извлекаем относительный URL
    $url = $artist.url -replace 'https://sefon.pro', ''
    
    # Создаём безопасное имя файла
    $filename = $artist.name -replace '[^\w\s\-а-яА-ЯёЁ]', '' -replace '\s+', '_'
    $tracksFile = "$tempDir/artist_$filename.json"
    
    Write-Host "[$num/$totalArtists] Исполнитель: $($artist.name)" -ForegroundColor Cyan
    Write-Host "              URL: $url" -ForegroundColor Gray
    
    # Скрейпим треки
    node tools/sefon-scraper.js --url=$url --limit=$tracksPerArtist --output=$tracksFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "              ❌ Ошибка скрейпинга" -ForegroundColor Red
        $errorCount++
        continue
    }
    
    # Проверяем что файл создан и не пустой
    if (-not (Test-Path $tracksFile)) {
        Write-Host "              ❌ Файл треков не создан" -ForegroundColor Red
        $errorCount++
        continue
    }
    
    $tracks = Get-Content $tracksFile -Raw | ConvertFrom-Json
    $tracksCount = $tracks.Count
    
    if ($tracksCount -eq 0) {
        Write-Host "              ⚠️  Треков не найдено, пропускаем" -ForegroundColor Yellow
        $errorCount++
        continue
    }
    
    Write-Host "              ✅ Извлечено треков: $tracksCount" -ForegroundColor Green
    $totalTracks += $tracksCount
    
    # Импортируем в БД (dry-run по умолчанию)
    Write-Host "              📤 Импорт в БД..." -ForegroundColor Gray
    node tools/sefon-import.js --input=$tracksFile --api=$apiUrl --dry-run
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "              ✅ Импорт завершён`n" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "              ❌ Ошибка импорта`n" -ForegroundColor Red
        $errorCount++
    }
    
    # Задержка между исполнителями
    if ($num -lt $totalArtists) {
        Write-Host "              ⏳ Задержка $delaySeconds сек...`n" -ForegroundColor Gray
        Start-Sleep -Seconds $delaySeconds
    }
}

# Итоги
Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Итоги обработки" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Всего исполнителей:  $totalArtists"
Write-Host "✅ Успешно:           $successCount" -ForegroundColor Green
Write-Host "❌ Ошибок:            $errorCount" -ForegroundColor Red
Write-Host "🎵 Всего треков:      $totalTracks" -ForegroundColor Cyan

if ($successCount -eq $totalArtists) {
    Write-Host "`n🎉 Все исполнители обработаны успешно!" -ForegroundColor Green
} elseif ($successCount -gt 0) {
    Write-Host "`n⚠️  Обработка завершена с ошибками" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Ни один исполнитель не обработан" -ForegroundColor Red
}

Write-Host "`n💡 Совет: Удалите --dry-run из sefon-import.js для реального импорта" -ForegroundColor Cyan
Write-Host "📊 Примерная статистика: $totalArtists исполнителей × $tracksPerArtist треков = $($totalArtists * $tracksPerArtist) треков`n" -ForegroundColor Gray
