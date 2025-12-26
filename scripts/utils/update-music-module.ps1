# Скрипт для обновления музыкального модуля

Write-Host "🎵 Обновление музыкального модуля..." -ForegroundColor Cyan

# Копируем новые страницы
Write-Host "`n📄 Копирование новых страниц..." -ForegroundColor Yellow
docker cp "d:\МОЙ САЙТ\frontend\src\pages\MusicHomePage.jsx" errorparty_frontend:/app/src/pages/
docker cp "d:\МОЙ САЙТ\frontend\src\pages\MusicLibraryPage.jsx" errorparty_frontend:/app/src/pages/
docker cp "d:\МОЙ САЙТ\frontend\src\pages\MusicSearchPage.jsx" errorparty_frontend:/app/src/pages/

# Копируем компоненты музыки
Write-Host "`n🎼 Копирование компонентов..." -ForegroundColor Yellow
docker exec errorparty_frontend mkdir -p /app/src/components/music
docker cp "d:\МОЙ САЙТ\frontend\src\components\music\MusicSidebar.jsx" errorparty_frontend:/app/src/components/music/
docker cp "d:\МОЙ САЙТ\frontend\src\components\music\PlaylistCard.jsx" errorparty_frontend:/app/src/components/music/
docker cp "d:\МОЙ САЙТ\frontend\src\components\music\AlbumCard.jsx" errorparty_frontend:/app/src/components/music/
docker cp "d:\МОЙ САЙТ\frontend\src\components\music\TrackRow.jsx" errorparty_frontend:/app/src/components/music/

# Копируем обновлённый плеер
Write-Host "`n🎧 Копирование обновлённого плеера..." -ForegroundColor Yellow
docker cp "d:\МОЙ САЙТ\frontend\src\components\GlobalMusicPlayer.jsx" errorparty_frontend:/app/src/components/

# Копируем App.jsx с новыми роутами
Write-Host "`n🛣️ Обновление роутинга..." -ForegroundColor Yellow
docker cp "d:\МОЙ САЙТ\frontend\src\App.jsx" errorparty_frontend:/app/src/

Write-Host "`n✅ Все файлы скопированы!" -ForegroundColor Green
Write-Host "`n🔄 Теперь откройте http://localhost:3000/music для просмотра" -ForegroundColor Cyan
