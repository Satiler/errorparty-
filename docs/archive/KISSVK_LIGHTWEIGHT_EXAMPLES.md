# 🧪 KissVK Lightweight - Примеры API запросов

## PowerShell (Windows)

### 1. Превью треков с главной страницы

```powershell
curl "http://localhost:3001/api/kissvk-light/preview?url=https://kissvk.top/&limit=10"
```

### 2. Превью топ-чарта

```powershell
curl "http://localhost:3001/api/kissvk-light/preview?url=https://kissvk.top/music/chart&limit=20"
```

### 3. Поиск треков

```powershell
# Поиск "Скриптонит"
curl "http://localhost:3001/api/kissvk-light/search?q=Скриптонит&limit=5"

# Поиск "Morgenshtern"
curl "http://localhost:3001/api/kissvk-light/search?q=Morgenshtern&limit=10"

# Поиск "Face"
curl "http://localhost:3001/api/kissvk-light/search?q=Face&limit=5"
```

### 4. Импорт метаданных (без скачивания!)

```powershell
# Импорт топ-10
curl -X POST http://localhost:3001/api/kissvk-light/import/metadata `
  -H "Content-Type: application/json" `
  -d '{
    "url": "https://kissvk.top/music/chart",
    "limit": 10,
    "createAlbum": true,
    "albumTitle": "KissVK Top 10"
  }'

# Импорт топ-50
curl -X POST http://localhost:3001/api/kissvk-light/import/metadata `
  -H "Content-Type: application/json" `
  -d '{
    "url": "https://kissvk.top/music/chart",
    "limit": 50,
    "createAlbum": true,
    "albumTitle": "KissVK Top 50"
  }'
```

### 5. Статистика

```powershell
curl http://localhost:3001/api/kissvk-light/stats
```

### 6. Очистить кеш

```powershell
curl -X POST http://localhost:3001/api/kissvk-light/cache/clear
```

---

## Bash (Linux/Mac)

### 1. Превью треков

```bash
curl "http://localhost:3001/api/kissvk-light/preview?url=https://kissvk.top/&limit=10"
```

### 2. Поиск

```bash
curl "http://localhost:3001/api/kissvk-light/search?q=Скриптонит&limit=5"
```

### 3. Импорт

```bash
curl -X POST http://localhost:3001/api/kissvk-light/import/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://kissvk.top/music/chart",
    "limit": 10,
    "createAlbum": true,
    "albumTitle": "KissVK Top 10"
  }'
```

---

## JavaScript (Frontend)

### Превью треков

```javascript
async function previewTracks() {
  const response = await fetch('/api/kissvk-light/preview?url=https://kissvk.top/music/chart&limit=10');
  const data = await response.json();
  
  console.log(`Найдено ${data.count} треков`);
  
  data.tracks.forEach((track, i) => {
    console.log(`${i + 1}. ${track.artist} - ${track.title}`);
  });
}
```

### Поиск и воспроизведение

```javascript
async function searchAndPlay(query) {
  // Поиск
  const response = await fetch(`/api/kissvk-light/search?q=${encodeURIComponent(query)}&limit=5`);
  const data = await response.json();
  
  if (data.tracks.length === 0) {
    console.log('Треки не найдены');
    return;
  }
  
  // Воспроизвести первый трек
  const track = data.tracks[0];
  console.log(`Воспроизведение: ${track.artist} - ${track.title}`);
  
  const audio = new Audio(track.proxyUrl);
  audio.play();
  
  return audio;
}

// Использование
searchAndPlay('Скриптонит');
```

### Импорт треков

```javascript
async function importChart(limit = 50) {
  const response = await fetch('/api/kissvk-light/import/metadata', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://kissvk.top/music/chart',
      limit: limit,
      createAlbum: true,
      albumTitle: `KissVK Top ${limit}`
    })
  });
  
  const result = await response.json();
  
  console.log(`Импортировано ${result.stats.imported} из ${result.stats.found} треков`);
  console.log(`Альбом: ${result.album.title}`);
  
  return result;
}

// Использование
importChart(50);
```

### Статистика

```javascript
async function getStats() {
  const response = await fetch('/api/kissvk-light/stats');
  const data = await response.json();
  
  console.log('📊 Статистика KissVK Lightweight:');
  console.log(`  Запросов: ${data.stats.requests}`);
  console.log(`  Кеш хитов: ${data.stats.cacheHits}`);
  console.log(`  Процент хита: ${data.stats.cacheHitRate}`);
  console.log(`  Размер кеша: ${data.stats.cacheSize}`);
  
  return data.stats;
}
```

---

## Node.js (Backend)

### Использование сервиса напрямую

```javascript
const { getInstance } = require('./backend/src/services/kissvk-lightweight.service');

async function example() {
  const service = getInstance();
  
  // Поиск
  const searchResult = await service.searchTracks('Скриптонит', 10);
  console.log(`Найдено ${searchResult.tracks.length} треков`);
  
  // Топ-чарт
  const chartResult = await service.getChartTracks(50);
  console.log(`Чарт: ${chartResult.tracks.length} треков`);
  
  // Статистика
  const stats = service.getStats();
  console.log('Статистика:', stats);
  
  // Закрыть сервис
  await service.close();
}

example();
```

---

## Postman Collection

### 1. GET Preview Tracks

```
GET http://localhost:3001/api/kissvk-light/preview
Params:
  - url: https://kissvk.top/music/chart
  - limit: 20
```

### 2. GET Search

```
GET http://localhost:3001/api/kissvk-light/search
Params:
  - q: Скриптонит
  - limit: 10
```

### 3. POST Import Metadata

```
POST http://localhost:3001/api/kissvk-light/import/metadata
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "url": "https://kissvk.top/music/chart",
  "limit": 50,
  "createAlbum": true,
  "albumTitle": "KissVK Top 50"
}
```

### 4. GET Stats

```
GET http://localhost:3001/api/kissvk-light/stats
```

### 5. POST Clear Cache

```
POST http://localhost:3001/api/kissvk-light/cache/clear
```

### 6. GET Stream Proxy

```
GET http://localhost:3001/api/kissvk-light/proxy/stream/:trackId
Params:
  - url: <encrypted_stream_url>
```

---

## Python

```python
import requests

# Превью треков
def preview_tracks(url, limit=10):
    response = requests.get('http://localhost:3001/api/kissvk-light/preview', params={
        'url': url,
        'limit': limit
    })
    return response.json()

# Поиск
def search_tracks(query, limit=10):
    response = requests.get('http://localhost:3001/api/kissvk-light/search', params={
        'q': query,
        'limit': limit
    })
    return response.json()

# Импорт
def import_metadata(url, limit=50, album_title='KissVK Collection'):
    response = requests.post('http://localhost:3001/api/kissvk-light/import/metadata', json={
        'url': url,
        'limit': limit,
        'createAlbum': True,
        'albumTitle': album_title
    })
    return response.json()

# Использование
result = search_tracks('Скриптонит', 5)
print(f"Найдено {result['count']} треков")
for track in result['tracks']:
    print(f"{track['artist']} - {track['title']}")
```

---

## Проверка работоспособности

### Быстрый тест

```powershell
# 1. Проверить что API работает
curl http://localhost:3001/api/kissvk-light/stats

# 2. Получить превью
curl "http://localhost:3001/api/kissvk-light/preview?url=https://kissvk.top/&limit=3"

# 3. Поиск
curl "http://localhost:3001/api/kissvk-light/search?q=test&limit=3"

# Если все команды вернули JSON - всё работает! ✅
```

---

## Типичные ошибки

### Ошибка: Connection refused

**Причина:** Сервер не запущен  
**Решение:**
```powershell
cd backend
npm start
```

### Ошибка: 404 Not Found

**Причина:** Неправильный URL  
**Решение:** Проверьте что используете `/api/kissvk-light/` (не `/api/kissvk/`)

### Ошибка: Empty response

**Причина:** kissvk.top изменил структуру  
**Решение:** Обновить селекторы в `kissvk-lightweight.service.js`

---

## 🎉 Готово!

Теперь вы можете использовать KissVK Lightweight API!

Полная документация: `docs/KISSVK_LIGHTWEIGHT.md`
