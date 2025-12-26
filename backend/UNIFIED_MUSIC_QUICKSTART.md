# 🎵 Улучшенная система скачивания и декодирования треков - Краткий гайд

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
cd backend
npm install
```

### 2. Запуск теста системы
```bash
node test-unified-music-system.js
```

### 3. Использование API
```bash
# Поиск по всем источникам
curl "http://localhost:3000/api/music/unified/search?q=Miyagi&limit=20"

# Умный поиск (автопереключение источников)
curl "http://localhost:3000/api/music/unified/smart-search?q=Скриптонит"

# Топ треки
curl "http://localhost:3000/api/music/unified/top?limit=50"
```

---

## 🎯 Ключевые возможности

### ✅ Множественные источники
- **KissVK** - основной источник с декодированием
- **Musify** - большая база русской музыки
- **Hitmo** - топ треки
- **PromoДJ** - электронная музыка

### ✅ Умное декодирование
**Multi-Decoder** автоматически выбирает правильный алгоритм:
1. KissVK CryptoJS (AES-256-CBC)
2. KissVK AES-128-CBC
3. KissVK AES-192-CBC
4. VK Base64
5. Прямые URL

### ✅ Надежная загрузка
**Download Manager** обеспечивает:
- 3 попытки с exponential backoff
- Валидация MP3 (magic bytes)
- Проверка размера (100KB - 50MB)
- Кеширование загрузок

### ✅ Дедупликация
Автоматическое удаление дубликатов по названию и артисту

---

## 📋 Основные endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/music/unified/search` | Поиск по всем источникам |
| GET | `/api/music/unified/smart-search` | Умный поиск с автопереключением |
| GET | `/api/music/unified/top` | Топ треки |
| POST | `/api/music/unified/download` | Скачать треки |
| POST | `/api/music/unified/import` | Импорт в БД |
| GET | `/api/music/unified/stats` | Статистика |
| GET | `/api/music/unified/sources` | Доступные источники |

---

## 💡 Примеры использования

### Пример 1: Поиск и загрузка
```javascript
const { getInstance } = require('./src/services/unified-music.service');
const unifiedMusic = getInstance();

// Поиск
const result = await unifiedMusic.smartSearch('Miyagi');

// Загрузка
const downloaded = await unifiedMusic.downloadTracks(result.tracks.slice(0, 5));

console.log(`Загружено: ${downloaded.filter(t => t.downloaded).length}/5`);
```

### Пример 2: API запрос
```bash
# Поиск по KissVK и Musify
curl "http://localhost:3000/api/music/unified/search?q=Баста&sources=kissvk,musify&limit=10"

# Результат:
# {
#   "success": true,
#   "totalTracks": 18,
#   "sources": [
#     { "source": "kissvk", "count": 10, "success": true },
#     { "source": "musify", "count": 8, "success": true }
#   ],
#   "allTracks": [...] // дедуплицированные
# }
```

### Пример 3: Импорт альбома
```bash
curl -X POST http://localhost:3000/api/music/unified/import \
  -H "Content-Type: application/json" \
  -d '{
    "tracks": [
      {
        "title": "Долго",
        "artist": "Баста",
        "streamUrl": "https://...",
        "source": "kissvk"
      }
    ],
    "createAlbum": true,
    "albumTitle": "Баста 5",
    "albumArtist": "Баста"
  }'
```

---

## 🔧 Конфигурация

### Переменные окружения (.env)
```env
MUSIC_DOWNLOAD_DIR=./uploads/music
DOWNLOAD_MAX_RETRIES=3
DOWNLOAD_TIMEOUT=60000
```

### Приоритет источников
Редактировать в `src/services/unified-music.service.js`:
```javascript
this.sourcePriority = ['kissvk', 'musify', 'hitmo', 'promodj'];
```

---

## 📊 Мониторинг

### Получить статистику
```bash
curl http://localhost:3000/api/music/unified/stats

# Результат:
# {
#   "searches": 10,
#   "successful": 9,
#   "bySource": {
#     "kissvk": { "requests": 5, "totalTracks": 75 },
#     "musify": { "requests": 3, "totalTracks": 45 }
#   },
#   "downloadManagerStats": {
#     "downloads": 15,
#     "successful": 14,
#     "successRate": "93.33%"
#   }
# }
```

---

## 🛠️ Troubleshooting

| Проблема | Решение |
|----------|---------|
| Не декодируются URL | Multi-Decoder пробует 5 алгоритмов автоматически |
| Ошибка загрузки | 3 retry с exponential backoff (2s, 4s, 6s) |
| Нет результатов | Используйте `smart-search` для автопереключения источников |
| Дубликаты треков | Автоматическая дедупликация включена по умолчанию |

---

## 📁 Структура файлов

```
backend/
├── src/
│   ├── utils/
│   │   └── multi-decoder.js          # Множественные алгоритмы декодирования
│   ├── services/
│   │   ├── download-manager.service.js # Менеджер загрузок
│   │   ├── unified-music.service.js    # Унифицированный сервис
│   │   ├── kissvk.service.js          # KissVK (обновлен)
│   │   ├── musify.service.js          # Musify
│   │   ├── hitmo.service.js           # Hitmo
│   │   └── promodj.service.js         # PromoДJ
│   ├── controllers/
│   │   └── unified-music.controller.js # API контроллер
│   └── modules/music/
│       └── unified-music.routes.js     # Маршруты
├── test-unified-music-system.js        # Тестовый скрипт
└── UNIFIED_MUSIC_SYSTEM.md            # Полная документация
```

---

## ✅ Checklist готовности

- [x] Multi-Decoder с 5+ алгоритмами
- [x] Download Manager с retry
- [x] Валидация MP3 файлов
- [x] Кеширование результатов
- [x] Дедупликация треков
- [x] Множественные источники
- [x] REST API
- [x] Статистика
- [x] Error handling
- [x] Документация

---

## 🎉 Готово к использованию!

Система полностью готова к работе. Для подробной информации см. [UNIFIED_MUSIC_SYSTEM.md](UNIFIED_MUSIC_SYSTEM.md)

### Следующие шаги:
1. Запустить тест: `node test-unified-music-system.js`
2. Проверить API endpoints
3. Настроить переменные окружения
4. Интегрировать с фронтендом
5. Мониторить статистику

**Разработано: 25 декабря 2025**
