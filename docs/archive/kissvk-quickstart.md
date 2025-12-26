# 🎵 KissVK Автоимпорт - Быстрый старт

## ✅ Что уже реализовано

✔️ Импорт новых альбомов с `kissvk.top/new_albums`  
✔️ Импорт чарта треков с `kissvk.top/tracks_chart`  
✔️ Импорт чарта альбомов с `kissvk.top/albums_chart`  
✔️ Поиск и импорт треков по запросу  
✔️ Автоматический планировщик (каждые 6 часов)  
✔️ Проверка дубликатов перед импортом  
✔️ Расшифровка зашифрованных URL через Puppeteer  
✔️ Логирование всех операций  
✔️ API для ручного запуска импорта  

## 🚀 Быстрый запуск

### 1. Применить миграцию БД

```bash
docker cp backend/migrations/add-kissvk-fields-to-albums.sql errorparty_backend:/app/migrations/
docker exec errorparty_postgres psql -U errorparty -d errorparty -f /app/migrations/add-kissvk-fields-to-albums.sql
```

### 2. Обновить файлы в контейнере

```bash
cd "d:\МОЙ САЙТ\backend"

# Копируем обновленные файлы
docker cp src/services/kissvk-puppeteer.service.js errorparty_backend:/app/src/services/
docker cp src/schedulers/kissvk-auto.scheduler.js errorparty_backend:/app/src/schedulers/
docker cp src/controllers/kissvk-import.controller.js errorparty_backend:/app/src/controllers/
docker cp src/routes/kissvk-import.routes.js errorparty_backend:/app/src/routes/
docker cp src/models/Album.js errorparty_backend:/app/src/models/
```

### 3. Перезапустить backend

```bash
docker-compose restart backend
```

### 4. Проверить работу

```bash
# Смотрим логи запуска
docker logs errorparty_backend --tail 50

# Ждем 20 секунд и проверяем первый импорт
Start-Sleep -Seconds 20
docker logs errorparty_backend --tail 100 | Select-String "KissVK|импорт|Import"
```

## 📡 API Эндпоинты (для Postman/curl)

### Статус системы
```
GET http://localhost:3000/api/kissvk/scheduler/status
```

### Ручной импорт новых альбомов
```
POST http://localhost:3000/api/kissvk/import/new-albums
```

### Ручной импорт чарта треков
```
POST http://localhost:3000/api/kissvk/import/tracks-chart
```

### Ручной импорт чарта альбомов
```
POST http://localhost:3000/api/kissvk/import/albums-chart
```

### Поиск и импорт
```
POST http://localhost:3000/api/kissvk/import/search
Content-Type: application/json

{
  "query": "Скриптонит",
  "limit": 20
}
```

## 📊 Проверка результатов в БД

```sql
-- Количество треков по провайдерам
SELECT provider, COUNT(*) as count
FROM "Tracks"
GROUP BY provider
ORDER BY count DESC;

-- Последние импортированные треки KissVK
SELECT id, artist, title, "createdAt"
FROM "Tracks"
WHERE provider = 'kissvk'
ORDER BY id DESC
LIMIT 10;

-- Количество альбомов KissVK
SELECT COUNT(*) as albums_count
FROM "Albums"
WHERE provider = 'kissvk';

-- Плейлисты с чартами
SELECT id, name, "createdAt"
FROM "Playlists"
WHERE name LIKE '%KissVK%'
ORDER BY "createdAt" DESC;
```

## 📅 Расписание автоматических задач

| Время | Задача |
|-------|--------|
| 00:00, 06:00, 12:00, 18:00 | Импорт новых альбомов |
| 01:00, 07:00, 13:00, 19:00 | Импорт чарта треков |
| 02:00, 08:00, 14:00, 20:00 | Импорт чарта альбомов |
| Каждые 30 минут | Проверка новых треков |
| 04:00 (раз в день) | Полная синхронизация |

## 🔧 Устранение неполадок

### Планировщик не запустился
```bash
# Перезапуск backend
docker-compose restart backend

# Проверка логов
docker logs errorparty_backend --tail 100 | grep -i "kissvk\|планировщик"
```

### Ошибка Puppeteer
```bash
# Проверка наличия Chromium
docker exec errorparty_backend which chromium-browser

# Если нет, установка (в Dockerfile должен быть chromium)
docker exec errorparty_backend apt-get update && apt-get install -y chromium
```

### Нет новых треков
```bash
# Ручной запуск через curl
curl -X POST http://localhost:3000/api/kissvk/import/new-albums \
  -H "Authorization: Bearer YOUR_TOKEN"

# Или через docker exec
docker exec errorparty_backend node -e "
  const scheduler = require('./src/schedulers/kissvk-auto.scheduler').getInstance();
  scheduler.start().then(() => scheduler.importNewAlbums());
"
```

## 📖 Полная документация

Смотрите [kissvk-autoimport-docs.md](./kissvk-autoimport-docs.md)

---

**Статус:** ✅ Готово к использованию  
**Дата:** 04.12.2025
