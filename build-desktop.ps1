# ErrorParty Desktop - Build & Deploy Script

Write-Host ""
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📦 СБОРКА DESKTOP ПРИЛОЖЕНИЯ" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка зависимостей
Write-Host "🔍 Проверка зависимостей..." -ForegroundColor Yellow

$rustInstalled = $null -ne (Get-Command rustc -ErrorAction SilentlyContinue)
if (-not $rustInstalled) {
    Write-Host "❌ Rust не установлен! Установите: https://rustup.rs/" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Rust: $(rustc --version)" -ForegroundColor Green
Write-Host "  ✅ Cargo: $(cargo --version)" -ForegroundColor Green
Write-Host ""

# 2. Очистка старых сборок
Write-Host "🧹 Очистка старых сборок..." -ForegroundColor Yellow
if (Test-Path "src-tauri\target\release\bundle") {
    Remove-Item "src-tauri\target\release\bundle" -Recurse -Force
    Write-Host "  ✅ Удалены старые файлы" -ForegroundColor Green
}
Write-Host ""

# 3. Сборка frontend
Write-Host "🔨 Сборка frontend (Vite)..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки frontend!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "  ✅ Frontend собран" -ForegroundColor Green
Write-Host ""

# 4. Сборка Tauri
Write-Host "🦀 Сборка Tauri desktop app..." -ForegroundColor Yellow
Write-Host "   (это займёт 5-10 минут при первой сборке)" -ForegroundColor Gray
Write-Host ""

npm run tauri:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки Tauri!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Сборка завершена!" -ForegroundColor Green
Write-Host ""

# 5. Копирование в downloads
Write-Host "📁 Копирование установщиков..." -ForegroundColor Yellow

$bundleDir = "src-tauri\target\release\bundle"
$downloadsDir = "frontend\public\downloads"

# Создать структуру папок
New-Item -ItemType Directory -Path "$downloadsDir\windows" -Force | Out-Null
New-Item -ItemType Directory -Path "$downloadsDir\macos" -Force | Out-Null
New-Item -ItemType Directory -Path "$downloadsDir\linux" -Force | Out-Null

# Копировать Windows
if (Test-Path "$bundleDir\nsis") {
    Copy-Item "$bundleDir\nsis\*.exe" "$downloadsDir\windows\" -Force
    Write-Host "  ✅ Windows NSIS installer скопирован" -ForegroundColor Green
}
if (Test-Path "$bundleDir\msi") {
    Copy-Item "$bundleDir\msi\*.msi" "$downloadsDir\windows\" -Force
    Write-Host "  ✅ Windows MSI package скопирован" -ForegroundColor Green
}

# Копировать macOS (если собрано)
if (Test-Path "$bundleDir\dmg") {
    Copy-Item "$bundleDir\dmg\*.dmg" "$downloadsDir\macos\" -Force
    Write-Host "  ✅ macOS DMG скопирован" -ForegroundColor Green
}

# Копировать Linux (если собрано)
if (Test-Path "$bundleDir\appimage") {
    Copy-Item "$bundleDir\appimage\*.AppImage" "$downloadsDir\linux\" -Force
    Write-Host "  ✅ Linux AppImage скопирован" -ForegroundColor Green
}
if (Test-Path "$bundleDir\deb") {
    Copy-Item "$bundleDir\deb\*.deb" "$downloadsDir\linux\" -Force
    Write-Host "  ✅ Linux DEB package скопирован" -ForegroundColor Green
}

Write-Host ""

# 6. Вывод информации
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ ВСЁ ГОТОВО!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Установочные файлы:" -ForegroundColor Yellow
Get-ChildItem "$downloadsDir\windows", "$downloadsDir\macos", "$downloadsDir\linux" -File -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  📄 $($_.Name) ($size MB)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🌐 Страница скачивания: http://localhost/download" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Yellow
Write-Host "  1. Проверьте страницу /download в браузере" -ForegroundColor Gray
Write-Host "  2. Протестируйте установщик" -ForegroundColor Gray
Write-Host "  3. Commit и deploy на production сервер" -ForegroundColor Gray
Write-Host ""
