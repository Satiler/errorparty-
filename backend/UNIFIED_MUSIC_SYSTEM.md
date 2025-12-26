# Unified Music System - Улучшенная система скачивания и декодирования треков

## 🎯 Обзор

Комплексная система для работы с множественными источниками музыки, включающая:
- **Множественные источники**: KissVK, Musify, Hitmo, PromoДJ
- **Умное декодирование**: Автоматический выбор алгоритма декодирования
- **Менеджер загрузок**: Retry, валидация, кеширование
- **Унифицированный API**: Единый интерфейс для всех источников

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────┐
│         Unified Music System                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Multi-Decoder│  │Download Mgr  │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────┐ ┌─────────┐ ┌────────┐ ┌───────┐│
│  │ KissVK   │ │ Musify  │ │ Hitmo  │ │PromoДJ││
│  └──────────┘ └─────────┘ └────────┘ └───────┘│
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📦 Компоненты

### 1. **Multi-Decoder** (`src/utils/multi-decoder.js`)

Универсальный декодер с поддержкой множественных алгоритмов:

**Поддерживаемые методы:**
- KissVK CryptoJS-compatible (AES-256-CBC)
- KissVK AES-128-CBC
- KissVK AES-192-CBC
- VK Base64
- Прямые URL (Hitmo, Musify, PromoДJ)

**Использование:**
```javascript
const { getInstance } = require('./src/utils/multi-decoder');
const decoder = getInstance();

const result = await decoder.decode(encryptedUrl, 'kissvk');
// result = { success: true, url: 'https://...', method: 'kissvk-cryptojs' }
```

**API:**
```javascript
// Декодирование одного URL
decoder.decode(encodedData, source = 'auto')

// Batch декодирование
decoder.decodeMany(encodedDataArray, source = 'auto')
```

---

### 2. **Download Manager** (`src/services/download-manager.service.js`)

Менеджер загрузок с расширенными возможностями:

**Функции:**
- ✅ Retry с exponential backoff (до 3 попыток)
- ✅ Валидация MP3 файлов (magic bytes)
- ✅ Проверка размера (мин 100KB, макс 50MB)
- ✅ Кеширование загрузок
- ✅ Статистика загрузок

**Использование:**
```javascript
const { getInstance } = require('./src/services/download-manager.service');
const downloadManager = getInstance();

const result = await downloadManager.downloadTrack({
  trackId: '12345',
  streamUrl: 'https://...',
  title: 'Song Title',
  artist: 'Artist Name',
  source: 'kissvk'
});

// result = {
//   success: true,
//   filePath: '/uploads/music/Artist - Song_abc123.mp3',
//   fileSize: 4567890,
//   downloadedAt: Date
// }
```

**Массовая загрузка:**
```javascript
const results = await downloadManager.downloadMany(tracks, concurrency = 3);
```

---

### 3. **Unified Music Service** (`src/services/unified-music.service.js`)

Единый сервис для работы со всеми источниками:

**Основные методы:**

#### `searchAllSources(query, options)`
Поиск по всем источникам с параллельным выполнением:

```javascript
const result = await unifiedMusic.searchAllSources('Miyagi', {
  limit: 20,
  sources: ['kissvk', 'musify', 'hitmo'],
  includeStreamUrl: true,
  downloadTracks: false
});

// result = {
//   query: 'Miyagi',
//   sources: [
//     { source: 'kissvk', tracks: [...], count: 15, success: true },
//     { source: 'musify', tracks: [...], count: 10, success: true }
//   ],
//   totalTracks: 25,
//   allTracks: [...] // дедуплицированные
// }
```

#### `smartSearch(query, options)`
Умный поиск с автоматическим переключением источников:

```javascript
const result = await unifiedMusic.smartSearch('Скриптонит', {
  minResults: 10,
  maxSources: 3
});

// Автоматически пробует источники по приоритету
// Останавливается при достижении minResults
```

#### `getTopTracks(options)`
Топ треки со всех источников:

```javascript
const result = await unifiedMusic.getTopTracks({
  limit: 50,
  sources: ['kissvk', 'musify']
});
```

---

## 🚀 API Endpoints

### Поиск

**GET** `/api/music/unified/search`
```bash
# Поиск по всем источникам
curl "http://localhost:3000/api/music/unified/search?q=Miyagi&limit=20"

# Только KissVK и Musify
curl "http://localhost:3000/api/music/unified/search?q=Miyagi&sources=kissvk,musify"
```

**GET** `/api/music/unified/smart-search`
```bash
# Умный поиск (автопереключение источников)
curl "http://localhost:3000/api/music/unified/smart-search?q=Скриптонит&minResults=10"
```

### Топ треки

**GET** `/api/music/unified/top`
```bash
curl "http://localhost:3000/api/music/unified/top?limit=50"
```

### Загрузка треков

**POST** `/api/music/unified/download`
```bash
curl -X POST http://localhost:3000/api/music/unified/download \
  -H "Content-Type: application/json" \
  -d '{
    "tracks": [
      {
        "trackId": "123",
        "streamUrl": "https://...",
        "title": "Song",
        "artist": "Artist",
        "source": "kissvk"
      }
    ],
    "concurrency": 3
  }'
```

### Импорт в БД

**POST** `/api/music/unified/import`
```bash
curl -X POST http://localhost:3000/api/music/unified/import \
  -H "Content-Type: application/json" \
  -d '{
    "tracks": [...],
    "createAlbum": true,
    "albumTitle": "Best Hits",
    "albumArtist": "Various Artists"
  }'
```

### Статистика

**GET** `/api/music/unified/stats`
```bash
curl "http://localhost:3000/api/music/unified/stats"
```

**GET** `/api/music/unified/sources`
```bash
# Список доступных источников
curl "http://localhost:3000/api/music/unified/sources"
```

---

## 🧪 Тестирование

### Запуск теста
```bash
cd backend
node test-unified-music-system.js
```

### Результат теста
```
🎵 ТЕСТИРОВАНИЕ UNIFIED MUSIC SYSTEM
============================================================

📌 ТЕСТ 1: Поиск по всем источникам
  kissvk: 15 треков ✓
  musify: 10 треков ✓
  hitmo: 8 треков ✓

📌 ТЕСТ 2: Умный поиск
  Найдено: 12 треков
  Использовано источников: 2

📌 ТЕСТ 3: Топ треки
  Всего: 50 треков

📌 ТЕСТ 4: Декодирование
  Метод: kissvk-cryptojs
  Статус: ✓ Успешно

📌 ТЕСТ 5: Статистика
  Всего поисков: 3
  Успешных: 3
  Треков получено: 75

✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО
```

---

## 💡 Примеры использования

### Пример 1: Поиск и загрузка

```javascript
const { getInstance } = require('./src/services/unified-music.service');
const unifiedMusic = getInstance();

// Поиск
const searchResult = await unifiedMusic.smartSearch('Miyagi', {
  minResults: 5
});

// Загрузка найденных треков
const downloadedTracks = await unifiedMusic.downloadTracks(
  searchResult.tracks.slice(0, 3),
  concurrency = 3
);

console.log(`Загружено: ${downloadedTracks.filter(t => t.downloaded).length}`);
```

### Пример 2: Импорт альбома

```javascript
// 1. Найти треки альбома
const result = await unifiedMusic.searchAllSources('Скриптонит УРОБОРОС');

// 2. Декодировать URL
const tracksWithUrls = result.allTracks.filter(t => t.isDecrypted);

// 3. Загрузить треки
const downloaded = await unifiedMusic.downloadTracks(tracksWithUrls);

// 4. Импортировать в БД через API
// POST /api/music/unified/import
```

### Пример 3: Мульти-источниковый плейлист

```javascript
// Собираем топ треки с разных источников
const topKissVK = await unifiedMusic.getTopTracks({ 
  sources: ['kissvk'], 
  limit: 20 
});

const topMusify = await unifiedMusic.getTopTracks({ 
  sources: ['musify'], 
  limit: 20 
});

// Объединяем и дедуплицируем
const allTop = unifiedMusic.mergeAndDeduplicate([
  { source: 'kissvk', tracks: topKissVK.tracks },
  { source: 'musify', tracks: topMusify.tracks }
]);

console.log(`Уникальных треков: ${allTop.length}`);
```

---

## ⚙️ Конфигурация

### Переменные окружения

```env
# Директория загрузок
MUSIC_DOWNLOAD_DIR=./uploads/music

# Настройки Download Manager
DOWNLOAD_MAX_RETRIES=3
DOWNLOAD_TIMEOUT=60000
DOWNLOAD_MIN_FILE_SIZE=102400
DOWNLOAD_MAX_FILE_SIZE=52428800

# Настройки KissVK
KISSVK_CACHE_TTL=3600000
KISSVK_REQUEST_DELAY=1000
KISSVK_MAX_CONCURRENT=2
```

### Приоритет источников

Изменить приоритет в `unified-music.service.js`:

```javascript
this.sourcePriority = ['kissvk', 'musify', 'hitmo', 'promodj'];
```

---

## 📊 Статистика и мониторинг

### Статистика Unified Music
```javascript
const stats = unifiedMusic.getStats();

// {
//   searches: 10,
//   successful: 9,
//   failed: 1,
//   bySource: {
//     kissvk: { requests: 5, successful: 5, totalTracks: 75 },
//     musify: { requests: 3, successful: 3, totalTracks: 45 }
//   },
//   downloadManagerStats: {
//     downloads: 15,
//     successful: 14,
//     successRate: '93.33%',
//     totalSize: '45.6 MB'
//   }
// }
```

---

## 🔧 Troubleshooting

### Проблема: Не декодируются URL KissVK

**Решение:**
Multi-Decoder пробует несколько алгоритмов. Проверить логи:
```bash
[MultiDecoder] Method 1: kissvk-cryptojs...
[MultiDecoder] ✓ Decoded with kissvk-cryptojs
```

### Проблема: Загрузка падает с ошибкой

**Решение:**
Download Manager делает 3 retry. Проверить:
- Валидность URL
- Размер файла (100KB - 50MB)
- MP3 magic bytes

### Проблема: Нет результатов поиска

**Решение:**
1. Проверить доступность источников
2. Использовать `smartSearch` для автопереключения
3. Проверить статистику: `/api/music/unified/stats`

---

## 🚀 Production Ready

### Checklist
- ✅ Множественные алгоритмы декодирования
- ✅ Retry механизм с exponential backoff
- ✅ Валидация файлов (MP3 magic bytes)
- ✅ Кеширование результатов
- ✅ Rate limiting
- ✅ Статистика и мониторинг
- ✅ Error handling
- ✅ Дедупликация треков
- ✅ Unified API

### Рекомендации
1. Настроить переменные окружения
2. Установить лимиты rate limiting
3. Мониторить статистику
4. Периодически очищать кеш
5. Использовать `smartSearch` для оптимизации

---

## 📚 Связанные файлы

- `src/utils/multi-decoder.js` - Множественные алгоритмы декодирования
- `src/services/download-manager.service.js` - Менеджер загрузок
- `src/services/unified-music.service.js` - Унифицированный сервис
- `src/controllers/unified-music.controller.js` - API контроллер
- `src/modules/music/unified-music.routes.js` - Маршруты
- `test-unified-music-system.js` - Тестовый скрипт

---

## 📝 Changelog

### v1.0.0 (2025-12-25)
- ✅ Создан Multi-Decoder с 5+ алгоритмами
- ✅ Добавлен Download Manager с retry и валидацией
- ✅ Реализован Unified Music Service
- ✅ Создан полный REST API
- ✅ Добавлены тесты и документация
- ✅ Интеграция с KissVK, Musify, Hitmo, PromoДJ

---

**Готово к использованию! 🎉**
