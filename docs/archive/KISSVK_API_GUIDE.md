# KissVK API — Документация

REST API для получения музыки из kissvk.top (VK Music зеркало) с автоматическим декодированием ссылок.

---

## 📋 Endpoints

### 1. Получить топ треков

**GET** `/api/kissvk/tracks/chart`

**Query параметры:**
- `limit` (опционально) — количество треков (по умолчанию: 50)

**Пример запроса:**
```http
GET http://localhost:3001/api/kissvk/tracks/chart?limit=20
```

**Ответ:**
```json
{
  "success": true,
  "total": 20,
  "stats": {
    "decoded": 18,
    "encoded": 2
  },
  "tracks": [
    {
      "trackId": "-2001963489_143963489",
      "artist": "Jakone, Kiliana",
      "title": "Жиганская",
      "duration": "2:09",
      "durationSeconds": 129,
      "chartPosition": 1,
      "streamUrl": "https://cdn9.sefon.pro/prev/.../track.mp3",
      "encodedAudio": null,
      "coverUrl": "https://sun9-6.userapi.com/...",
      "source": "kissvk.top",
      "scrapedAt": "2025-12-04T12:34:56.789Z"
    }
  ]
}
```

---

### 2. Получить топ альбомов

**GET** `/api/kissvk/albums/chart`

**Query параметры:**
- `limit` (опционально) — количество альбомов (по умолчанию: 50)

**Пример запроса:**
```http
GET http://localhost:3001/api/kissvk/albums/chart?limit=10
```

**Ответ:**
```json
{
  "success": true,
  "total": 10,
  "albums": [
    {
      "url": "/playlist-2000753343_25753343_ce3a98a09f3a21c9e0",
      "playlistId": "2000753343_25753343_ce3a98a09f3a21c9e0",
      "title": "SLAANG",
      "source": "kissvk.top"
    }
  ]
}
```

---

### 3. Получить треки из плейлиста/альбома

**GET** `/api/kissvk/playlist/:playlistId`

**Параметры URL:**
- `playlistId` — ID плейлиста (например: `2000753343_25753343_ce3a98a09f3a21c9e0`)

**Пример запроса:**
```http
GET http://localhost:3001/api/kissvk/playlist/2000753343_25753343_ce3a98a09f3a21c9e0
```

**Ответ:**
```json
{
  "success": true,
  "playlist": {
    "id": "2000753343_25753343_ce3a98a09f3a21c9e0",
    "title": "SLAANG",
    "totalTracks": 15,
    "decoded": 15
  },
  "tracks": [...]
}
```

---

### 4. Получить новые альбомы

**GET** `/api/kissvk/albums/new`

**Query параметры:**
- `limit` (опционально) — количество альбомов (по умолчанию: 30)

**Пример запроса:**
```http
GET http://localhost:3001/api/kissvk/albums/new?limit=20
```

**Ответ:**
```json
{
  "success": true,
  "total": 20,
  "albums": [...]
}
```

---

### 5. Поиск треков

**GET** `/api/kissvk/search`

**Query параметры:**
- `q` (обязательно) — поисковый запрос

**Пример запроса:**
```http
GET http://localhost:3001/api/kissvk/search?q=Miyagi
```

**Ответ:**
```json
{
  "success": true,
  "query": "Miyagi",
  "total": 25,
  "tracks": [...]
}
```

---

### 6. Декодировать VK Audio URL

**POST** `/api/kissvk/decode`

**Body:**
```json
{
  "encodedAudio": "+Mw4Hi/uKl0Lu3d0GnwEFxsYaGs46oziQfN0/B/0ZEmpPX0JDqUC500jPnPhiTnu2NP03WEOIMDA+swb0haXVVifOKuvR0NqQkWMNxhj0h8z/6GxlME2CFMJ1RVPQrfFop/g2LG2+2ge6ph7sLsyBQJ..."
}
```

**Ответ:**
```json
{
  "success": true,
  "encodedAudio": "...",
  "streamUrl": "https://cdn9.sefon.pro/prev/.../track.mp3"
}
```

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```powershell
cd "d:\МОЙ САЙТ\backend"
npm install axios cheerio
```

### 2. Запуск сервера

```powershell
# Локально
npm start

# Или через Docker
docker-compose up backend
```

### 3. Тестирование API

```powershell
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/kissvk/tracks/chart?limit=5" -Method Get
$response | ConvertTo-Json -Depth 10

# curl
curl http://localhost:3001/api/kissvk/tracks/chart?limit=5
```

---

## 📊 Примеры использования

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function getTopTracks() {
  const response = await axios.get('http://localhost:3001/api/kissvk/tracks/chart', {
    params: { limit: 20 }
  });
  
  console.log(`Получено треков: ${response.data.total}`);
  console.log(`Расшифровано URL: ${response.data.stats.decoded}`);
  
  return response.data.tracks;
}

getTopTracks();
```

### Frontend (React/Vue)

```javascript
// Получить топ треков
fetch('http://localhost:3001/api/kissvk/tracks/chart?limit=20')
  .then(res => res.json())
  .then(data => {
    console.log('Треки:', data.tracks);
  });

// Получить альбом
fetch('http://localhost:3001/api/kissvk/playlist/2000753343_25753343_ce3a98a09f3a21c9e0')
  .then(res => res.json())
  .then(data => {
    console.log('Альбом:', data.playlist.title);
    console.log('Треки:', data.tracks);
  });
```

### PowerShell

```powershell
# Топ 10 треков
$tracks = Invoke-RestMethod -Uri "http://localhost:3001/api/kissvk/tracks/chart?limit=10"
$tracks.tracks | ForEach-Object {
  Write-Host "$($_.chartPosition). $($_.artist) - $($_.title)"
}

# Скачать альбом
$album = Invoke-RestMethod -Uri "http://localhost:3001/api/kissvk/playlist/2000753343_25753343_ce3a98a09f3a21c9e0"
$album.tracks | ForEach-Object {
  if ($_.streamUrl) {
    $filename = "$($_.artist) - $($_.title).mp3"
    Invoke-WebRequest -Uri $_.streamUrl -OutFile $filename
    Write-Host "✅ Скачано: $filename"
  }
}
```

---

## 🔧 Технические детали

### Декодер VK Audio

Файл: `backend/src/utils/vk-audio-decoder.js`

**Методы:**
- `decode(encodedString)` — основной метод декодирования
- `decodeAlt(encodedString)` — альтернативный метод
- `decodeAny(encodedString)` — пробует все методы

**Алгоритм:**
1. Разделить строку по `:` (3 части: `encodedUrl:salt:extra`)
2. Base64 декодирование первой части
3. XOR с солью (hex)
4. Преобразование в UTF-8 строку
5. Проверка на валидный HTTP(S) URL

### Парсинг HTML

Используется **cheerio** (jQuery-подобный парсер):
- Извлечение атрибутов `data-id`, `data-audio`, `data-cover`
- Парсинг `.artist`, `.title`, `.duration`
- Обработка чарт позиций

### Кэширование

Рекомендуется добавить Redis кэширование:
```javascript
// В kissvk.service.js
const redis = require('../services/redisService');

async getTracksChart(limit = 50) {
  const cacheKey = `kissvk:tracks:chart:${limit}`;
  
  // Проверяем кэш
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Загружаем с сайта
  const tracks = await this._fetchTracksChart(limit);
  
  // Сохраняем в кэш (TTL: 1 час)
  await redis.setEx(cacheKey, 3600, JSON.stringify(tracks));
  
  return tracks;
}
```

---

## ⚠️ Ограничения

1. **Декодирование не гарантировано 100%**
   - Некоторые треки могут иметь `streamUrl: null`
   - Это значит, что декодер не смог расшифровать ссылку

2. **Rate Limiting**
   - Не делайте слишком частые запросы к kissvk.top
   - Используйте кэширование

3. **Легальность**
   - KissVK.top — неофициальное зеркало VK Music
   - Используйте только для личных целей

---

## 🐛 Устранение неполадок

### Ошибка: "Cannot find module 'axios'"

```powershell
cd "d:\МОЙ САЙТ\backend"
npm install axios cheerio
```

### Треки без streamUrl

- Декодер не смог расшифровать ссылку
- Попробуйте декодировать вручную через `/api/kissvk/decode`
- Проверьте формат `encodedAudio` строки

### Timeout при запросах

- Увеличьте таймаут в `kissvk.service.js`
- Проверьте доступность kissvk.top

---

## 📈 Что дальше?

1. ✅ **API endpoints созданы**
2. ✅ **Декодер VK Audio работает**
3. 🔄 **Добавить в модульную систему**
4. 🚀 **Интеграция с фронтендом**

---

**API готов к использованию!** 🎉

Тестируй: `http://localhost:3001/api/kissvk/tracks/chart?limit=10`
