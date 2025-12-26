# KissVK Auto-Import System - Installation Guide

## Установка зависимостей

```bash
# В директории backend
cd backend
npm install puppeteer@21.9.0
```

## Docker Setup

Добавь в `docker-compose.yml`:

```yaml
services:
  backend:
    # ...существующие настройки...
    environment:
      - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
    shm_size: '2gb'  # Для Puppeteer
```

## API Endpoints

### 1. Превью треков (без скачивания)
```bash
GET /api/kissvk/import/preview?url=https://kissvk.top/music/chart&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "tracks": [
    {
      "trackId": "12345",
      "title": "Жиганская",
      "artist": "Jakone, Kiliana",
      "duration": 180,
      "streamUrl": "http://...",
      "source": "kissvk.top"
    }
  ]
}
```

### 2. Массовый импорт
```bash
POST /api/kissvk/import/bulk
Content-Type: application/json

{
  "urls": [
    "https://kissvk.top/music/chart",
    "https://kissvk.top/music/new"
  ],
  "albumTitle": "KissVK Collection",
  "albumArtist": "Various Artists",
  "createAlbum": true,
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 48 tracks",
  "album": { "id": 123, "title": "KissVK Collection" },
  "tracks": [...],
  "stats": {
    "requested": 2,
    "downloaded": 50,
    "imported": 48
  }
}
```

### 3. Импорт топ-чарта
```bash
POST /api/kissvk/import/chart
Content-Type: application/json

{
  "limit": 50
}
```

### 4. Статус сервиса
```bash
GET /api/kissvk/status
```

**Response:**
```json
{
  "success": true,
  "status": "operational",
  "browserPool": {
    "size": 3,
    "active": 3,
    "busy": 1,
    "free": 2
  }
}
```

## Использование через Frontend

### JavaScript пример:

```javascript
// Импорт топ-чарта
async function importChartTracks() {
  const response = await fetch('/api/kissvk/import/chart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      limit: 50
    })
  });

  const result = await response.json();
  console.log(`Imported ${result.tracks.length} tracks`);
}

// Массовый импорт с созданием альбома
async function bulkImportWithAlbum() {
  const response = await fetch('/api/kissvk/import/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      urls: [
        'https://kissvk.top/music/chart',
        'https://kissvk.top/music/new'
      ],
      albumTitle: 'Best of 2025',
      albumArtist: 'Various Artists',
      createAlbum: true,
      isPublic: true
    })
  });

  const result = await response.json();
  console.log(`Album "${result.album.title}" created with ${result.tracks.length} tracks`);
}
```

## Автоматизация через Cron

Добавь в `backend/src/core/server.js`:

```javascript
const cron = require('node-cron');

// Автоматический импорт топ-чарта каждый день в 3:00 AM
cron.schedule('0 3 * * *', async () => {
  console.log('[Cron] Auto-importing KissVK chart...');
  try {
    const { getInstance } = require('./services/kissvk-puppeteer.service');
    const kissvkService = await getInstance();
    
    const tracks = await kissvkService.getChartTracks(50);
    const downloaded = await Promise.all(
      tracks.map(t => kissvkService.downloadTrack(t))
    );
    
    console.log(`[Cron] Auto-imported ${downloaded.length} chart tracks`);
  } catch (error) {
    console.error('[Cron] Auto-import failed:', error);
  }
});
```

## Производительность

- **3 параллельных браузера** в пуле
- **~5 треков/сек** извлечение + скачивание
- **~20-30 треков/мин** с импортом в БД
- **Максимум 10 URLs** за один запрос (защита от перегрузки)

## Скачанные файлы

Треки сохраняются в:
```
backend/uploads/kissvk-downloads/
```

Формат имени файла:
```
{trackId}_{artist}_{title}.mp3
```

## Troubleshooting

### Puppeteer не запускается в Docker

Добавь в Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2
```

### Браузеры зависают

Увеличь размер пула:
```javascript
// В kissvk-puppeteer.service.js
this.poolSize = 5; // вместо 3
```

### Медленное скачивание

Увеличь параллельные загрузки:
```javascript
// В bulkLoadTracks()
const batchSize = 10; // вместо 5
```

## Мониторинг

Проверяй статус через:
```bash
curl http://localhost:3001/api/kissvk/status
```

## Безопасность

- ✅ Требуется аутентификация (`authenticate` middleware)
- ✅ Rate limiting через существующий `apiLimiter`
- ✅ Максимум 10 URLs за запрос
- ✅ Валидация входных данных

## Next Steps

1. ✅ Установи Puppeteer: `npm install puppeteer`
2. ✅ Перезапусти Docker: `docker-compose restart backend`
3. ✅ Тестируй API через Postman/curl
4. 🔄 Добавь UI кнопку "Import from KissVK" на фронтенде
5. 🔄 Настрой автоматический cron (опционально)
