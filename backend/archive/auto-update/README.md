# 🎵 Система автоматического обновления плейлистов

Комплексная система автоматической актуализации музыкальных плейлистов на основе мировых трендов с интеграцией Spotify, Apple Music, Billboard, Shazam и kissvk.

## 📋 Содержание

- [Особенности](#особенности)
- [Архитектура](#архитектура)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [Использование](#использование)
- [API Endpoints](#api-endpoints)
- [Компоненты Frontend](#компоненты-frontend)
- [Алгоритмы](#алгоритмы)

## ✨ Особенности

### 🌍 Интеграция с мировыми чартами
- **Spotify Charts** - топ-треки, новые релизы, рекомендации
- **Apple Music** - чарты по регионам, альбомы
- **Billboard** - Hot 100, Global 200, Billboard 200
- **Shazam** - популярные треки по регионам и жанрам

### 🎧 Автоматизация
- Ежедневное обновление плейлистов на основе трендов
- Автоматический импорт новинок с kissvk
- Планировщик задач с настраиваемым расписанием
- Логирование всех операций

### 👤 Персонализация
- Рекомендации на основе предпочтений пользователя
- Отслеживание любимых артистов
- Уведомления о новых релизах
- История прослушивания

### 🛡️ Модерация
- Ручное подтверждение автоматических изменений
- Просмотр предлагаемых добавлений/удалений
- Административный интерфейс
- Откат изменений

## 🏗️ Архитектура

```
backend/auto-update/
├── config/              # Конфигурационные файлы
│   ├── charts-config.js       # Настройки интеграции с чартами
│   └── kissvk-config.js       # Настройки импорта с kissvk
├── services/            # Бизнес-логика
│   ├── spotify-charts.service.js
│   ├── apple-music-charts.service.js
│   ├── billboard-charts.service.js
│   ├── shazam-charts.service.js
│   ├── kissvk-auto-import.service.js
│   ├── playlist-actualization.service.js
│   └── recommendation.service.js
├── scheduler/           # Планировщик задач
│   └── auto-update.scheduler.js
├── routes/              # API маршруты
│   └── auto-update.routes.js
├── migrations/          # SQL миграции
│   └── create-auto-update-tables.sql
├── index.js            # Точка входа
└── package.json

frontend/src/components/
├── admin/
│   ├── PendingChangesManager.jsx    # Модерация изменений
│   └── PendingChangesManager.css
└── TrendingPlaylists.jsx             # Пользовательский интерфейс
    └── TrendingPlaylists.css
```

## 🚀 Установка

### 1. Установка зависимостей

```bash
cd backend/auto-update
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/music_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Apple Music API
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Shazam API (RapidAPI)
SHAZAM_API_KEY=your_rapidapi_key

# kissvk
KISSVK_API_URL=https://kissvk.com/api

# Storage
MUSIC_STORAGE_PATH=d:/МОЙ САЙТ/uploads/music
CDN_URL=https://yourdomain.com/uploads/music

# Server
AUTO_UPDATE_PORT=3001
```

### 3. Миграция базы данных

```bash
npm run migrate
```

## ⚙️ Конфигурация

### Настройка чартов (`config/charts-config.js`)

```javascript
module.exports = {
  updateSchedule: {
    enabled: true,
    cronExpression: '0 3 * * *', // Ежедневно в 3 утра
    timezone: 'Europe/Moscow'
  },
  
  sourceWeights: {
    spotify: 0.30,
    appleMusic: 0.25,
    billboard: 0.25,
    shazam: 0.20
  },
  
  playlistUpdate: {
    minScoreThreshold: 0.6,
    maxPlaylistSize: 100,
    updatePercentage: 0.15,
    requireModeration: true
  }
};
```

### Настройка kissvk (`config/kissvk-config.js`)

```javascript
module.exports = {
  updateSchedule: {
    enabled: true,
    cronExpression: '0 4 * * *'
  },
  
  importCategories: {
    newReleases: {
      enabled: true,
      maxItems: 50
    },
    topCharts: {
      enabled: true,
      maxItems: 100
    }
  },
  
  deduplication: {
    enabled: true,
    matchThreshold: 0.85
  }
};
```

## 🎯 Использование

### Запуск системы

```bash
# Продакшн
npm start

# Разработка (с автоперезагрузкой)
npm run dev
```

### Ручной запуск задач

```javascript
const autoUpdateScheduler = require('./scheduler/auto-update.scheduler');

// Обновление плейлистов из чартов
await autoUpdateScheduler.runTask('charts-update');

// Импорт с kissvk
await autoUpdateScheduler.runTask('kissvk-import');

// Обновление популярности
await autoUpdateScheduler.runTask('popularity-update');

// Очистка старых данных
await autoUpdateScheduler.runTask('cleanup');
```

## 🔌 API Endpoints

### Статус системы
```http
GET /api/auto-update/status
```

### Актуализация плейлиста
```http
POST /api/auto-update/playlists/:id/actualize
```

### Получить изменения для модерации
```http
GET /api/auto-update/pending-changes
```

### Одобрить изменения
```http
POST /api/auto-update/pending-changes/:id/approve
```

### Отклонить изменения
```http
POST /api/auto-update/pending-changes/:id/reject
```

### Импорт с kissvk
```http
POST /api/auto-update/kissvk/import
```

### Персональные рекомендации
```http
GET /api/auto-update/recommendations/:userId?limit=20
```

### Похожие треки
```http
GET /api/auto-update/recommendations/track/:trackId/similar?limit=10
```

### Управление планировщиком
```http
POST /api/auto-update/scheduler/start
POST /api/auto-update/scheduler/stop
POST /api/auto-update/tasks/:taskName/run
```

## 🎨 Компоненты Frontend

### Административная панель

```jsx
import PendingChangesManager from './components/admin/PendingChangesManager';

function AdminPanel() {
  return <PendingChangesManager />;
}
```

### Пользовательский интерфейс

```jsx
import TrendingPlaylists from './components/TrendingPlaylists';

function HomePage({ userId }) {
  return <TrendingPlaylists userId={userId} />;
}
```

## 🧮 Алгоритмы

### Расчёт рейтинга треков

Система использует взвешенный алгоритм для определения актуальности треков:

```javascript
score = 
  (spotify_position_score * 0.30) +
  (apple_position_score * 0.25) +
  (billboard_position_score * 0.25) +
  (shazam_position_score * 0.20) +
  (multi_source_bonus * 0.1)
```

Где `position_score = 1 - (position / 100)`

### Персональные рекомендации

```javascript
recommendation_score = 
  (popularity_score * 0.3) +
  (artist_match * 0.4) +
  (genre_match * 0.3) +
  (history_similarity * 0.2) +
  (freshness_bonus * 0.15)
```

### Актуализация плейлистов

1. Сбор данных из всех источников (Spotify, Apple Music, Billboard, Shazam)
2. Расчёт рейтинга для каждого трека
3. Фильтрация по минимальному порогу (0.6)
4. Сравнение с текущим плейлистом
5. Определение треков для добавления/удаления
6. Применение лимита изменений (15% за раз)
7. Сохранение для модерации или автоприменение

## 📊 Расписание задач

| Задача | Расписание | Описание |
|--------|-----------|----------|
| charts-update | Ежедневно 3:00 | Обновление плейлистов из чартов |
| kissvk-import | Ежедневно 4:00 | Импорт новинок с kissvk |
| popularity-update | Каждый час | Пересчёт популярности треков |
| cleanup | Воскресенье 2:00 | Очистка старых данных |

## 🗄️ База данных

### Основные таблицы

- `listening_history` - История прослушивания
- `user_favorites` - Избранные треки
- `playlist_pending_changes` - Изменения для модерации
- `user_artist_tracking` - Отслеживаемые артисты
- `import_logs` - Логи импорта
- `chart_history` - История позиций в чартах
- `user_notifications` - Уведомления пользователей

## 🔒 Безопасность

- Все API ключи хранятся в переменных окружения
- Ограничение rate limit для внешних API
- Проверка дубликатов при импорте
- Модерация автоматических изменений
- Логирование всех операций

## 📈 Мониторинг

```http
GET /health
```

Возвращает:
```json
{
  "status": "ok",
  "scheduler": {
    "isRunning": true,
    "tasks": [
      { "name": "charts-update", "isRunning": true },
      { "name": "kissvk-import", "isRunning": true },
      { "name": "popularity-update", "isRunning": true },
      { "name": "cleanup", "isRunning": true }
    ]
  },
  "timestamp": "2025-12-05T10:00:00.000Z"
}
```

## 🐛 Отладка

Логи сохраняются в:
- `logs/playlist-updates.log` - Обновления плейлистов
- `logs/kissvk-imports.log` - Импорт с kissvk

Уровни логирования: `debug`, `info`, `warn`, `error`

## 📝 Лицензия

MIT

## 🤝 Поддержка

Для вопросов и предложений создайте issue в репозитории проекта.
