# 📚 Примеры использования API

Коллекция примеров для работы с системой автообновления плейлистов.

## 🎯 Базовые операции

### Получить статус системы

```javascript
// GET /api/auto-update/status
const response = await fetch('http://localhost:3001/api/auto-update/status');
const data = await response.json();

console.log(data);
// {
//   "success": true,
//   "data": {
//     "isRunning": true,
//     "tasks": [
//       { "name": "charts-update", "isRunning": true },
//       { "name": "kissvk-import", "isRunning": true }
//     ]
//   }
// }
```

### Запустить актуализацию плейлиста

```javascript
// POST /api/auto-update/playlists/:id/actualize
const playlistId = 'global-top-100';

const response = await fetch(
  `http://localhost:3001/api/auto-update/playlists/${playlistId}/actualize`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
);

const result = await response.json();
console.log(result);
// {
//   "success": true,
//   "data": {
//     "playlistId": "global-top-100",
//     "changes": {
//       "toAdd": [...],
//       "toRemove": [...],
//       "toKeep": [...],
//       "summary": {
//         "currentCount": 100,
//         "keepCount": 85,
//         "removeCount": 15,
//         "addCount": 15,
//         "finalCount": 100
//       }
//     },
//     "requiresModeration": true
//   }
// }
```

## 🔄 Работа с изменениями

### Получить список изменений для модерации

```javascript
// GET /api/auto-update/pending-changes
const response = await fetch('http://localhost:3001/api/auto-update/pending-changes');
const data = await response.json();

data.data.forEach(change => {
  console.log(`Плейлист: ${change.playlist_name}`);
  console.log(`Дата: ${change.created_at}`);
  console.log(`Статус: ${change.status}`);
  
  const changesData = JSON.parse(change.changes_data);
  console.log(`Добавить: ${changesData.toAdd.length}`);
  console.log(`Удалить: ${changesData.toRemove.length}`);
});
```

### Одобрить изменения

```javascript
// POST /api/auto-update/pending-changes/:id/approve
const changeId = 123;

const response = await fetch(
  `http://localhost:3001/api/auto-update/pending-changes/${changeId}/approve`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
);

const result = await response.json();
console.log(result);
// {
//   "success": true,
//   "message": "Изменения одобрены и применены"
// }
```

### Отклонить изменения

```javascript
// POST /api/auto-update/pending-changes/:id/reject
const changeId = 123;

const response = await fetch(
  `http://localhost:3001/api/auto-update/pending-changes/${changeId}/reject`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
);

const result = await response.json();
// {
//   "success": true,
//   "message": "Изменения отклонены"
// }
```

## 🎵 Импорт треков

### Запустить импорт с kissvk

```javascript
// POST /api/auto-update/kissvk/import
const response = await fetch(
  'http://localhost:3001/api/auto-update/kissvk/import',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
);

const stats = await response.json();
console.log(stats);
// {
//   "success": true,
//   "data": {
//     "imported": 45,
//     "skipped": 5,
//     "errors": 0,
//     "duplicates": 10
//   }
// }
```

## 💡 Рекомендации

### Получить персональные рекомендации

```javascript
// GET /api/auto-update/recommendations/:userId
const userId = 42;
const limit = 20;

const response = await fetch(
  `http://localhost:3001/api/auto-update/recommendations/${userId}?limit=${limit}`
);

const recommendations = await response.json();
recommendations.data.forEach(rec => {
  console.log(`${rec.title} - ${rec.artist}`);
  console.log(`Рейтинг: ${(rec.score * 100).toFixed(0)}%`);
  console.log(`Причина: ${rec.reason}`);
  console.log('---');
});
```

### Получить похожие треки

```javascript
// GET /api/auto-update/recommendations/track/:trackId/similar
const trackId = 1234;
const limit = 10;

const response = await fetch(
  `http://localhost:3001/api/auto-update/recommendations/track/${trackId}/similar?limit=${limit}`
);

const similar = await response.json();
similar.data.forEach(track => {
  console.log(`${track.title} - ${track.artist}`);
});
```

## ⚙️ Управление планировщиком

### Запустить планировщик

```javascript
// POST /api/auto-update/scheduler/start
const response = await fetch(
  'http://localhost:3001/api/auto-update/scheduler/start',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
);

const result = await response.json();
// {
//   "success": true,
//   "message": "Планировщик запущен"
// }
```

### Остановить планировщик

```javascript
// POST /api/auto-update/scheduler/stop
const response = await fetch(
  'http://localhost:3001/api/auto-update/scheduler/stop',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
);

const result = await response.json();
// {
//   "success": true,
//   "message": "Планировщик остановлен"
// }
```

### Ручной запуск задачи

```javascript
// POST /api/auto-update/tasks/:taskName/run
const tasks = ['charts-update', 'kissvk-import', 'popularity-update', 'cleanup'];

for (const taskName of tasks) {
  const response = await fetch(
    `http://localhost:3001/api/auto-update/tasks/${taskName}/run`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }
  );
  
  const result = await response.json();
  console.log(`${taskName}:`, result.success ? '✓' : '✗');
}
```

## 🔨 Прямое использование сервисов

### Spotify Charts

```javascript
const spotifyService = require('./services/spotify-charts.service');

// Получить топ-50 треков
const topTracks = await spotifyService.getTopTracks('global', 50);
console.log(`Найдено ${topTracks.length} треков`);

// Получить новые релизы
const newReleases = await spotifyService.getNewReleases('US', 20);
console.log(`Новых релизов: ${newReleases.length}`);

// Поиск трека
const searchResult = await spotifyService.searchTrack('Dua Lipa', 'Levitating');
if (searchResult.found) {
  console.log(`Найден: ${searchResult.spotifyUrl}`);
  console.log(`Популярность: ${searchResult.popularity}`);
}

// Получить рекомендации
const recommendations = await spotifyService.getRecommendations(
  ['3n3Ppam7vgaVa1iaRUc9Lp', '7qiZfU4dY1lWllzX7mPBI'], // seed tracks
  20
);
```

### Apple Music Charts

```javascript
const appleMusicService = require('./services/apple-music-charts.service');

// Получить топ-треки
const topTracks = await appleMusicService.getTopTracks('us', 50);

// Получить топ-альбомы
const topAlbums = await appleMusicService.getTopAlbums('us', 25);

// Поиск трека
const searchResult = await appleMusicService.searchTrack(
  'The Weeknd',
  'Blinding Lights',
  'us'
);

// Получить детали трека
const trackDetails = await appleMusicService.getTrackDetails('1234567890', 'us');
console.log(trackDetails);
```

### Billboard Charts

```javascript
const billboardService = require('./services/billboard-charts.service');

// Получить Hot 100
const hot100 = await billboardService.getHot100(100);

// Получить Global 200
const global200 = await billboardService.getGlobal200(100);

// Получить все чарты
const allCharts = await billboardService.getAllCharts(50);
console.log(Object.keys(allCharts)); // ['hot-100', 'billboard-200', ...]

// Поиск трека
const found = await billboardService.findTrackInCharts('Beyoncé', 'Texas Hold \'Em');
found.forEach(result => {
  console.log(`Чарт: ${result.chart}, Позиция: ${result.position}`);
});
```

### Shazam Charts

```javascript
const shazamService = require('./services/shazam-charts.service');

// Получить топ-треки
const topTracks = await shazamService.getTopTracks('world', 50);

// Получить детали трека
const trackDetails = await shazamService.getTrackDetails('track_id_123');

// Поиск трека
const searchResults = await shazamService.searchTrack('Imagine Dragons Believer');

// Получить связанные треки
const related = await shazamService.getRelatedTracks('track_id_123', 20);

// Получить топ по жанру
const popTracks = await shazamService.getTopByGenre('POP', 'world', 50);
```

### KissVK Auto Import

```javascript
const kissvkService = require('./services/kissvk-auto-import.service');

// Импорт новых релизов
const stats = await kissvkService.importNewReleases();
console.log(`Импортировано: ${stats.imported}`);
console.log(`Дубликатов: ${stats.duplicates}`);
console.log(`Ошибок: ${stats.errors}`);

// Получить топ-чарты
const charts = await kissvkService.fetchTopCharts();
console.log(`Треков в чартах: ${charts.length}`);

// Проверить дубликат
const isDuplicate = await kissvkService.isDuplicate({
  title: 'Test Track',
  artist: 'Test Artist'
});
```

### Playlist Actualization

```javascript
const playlistService = require('./services/playlist-actualization.service');

// Актуализация плейлиста
const result = await playlistService.actualizePlaylist('global-top-100');
console.log('Изменения:', result.changes.summary);

// Применить изменения
await playlistService.applyChanges('global-top-100', result.changes);

// Получить текущие треки
const currentTracks = await playlistService.getCurrentPlaylistTracks('global-top-100');
console.log(`Треков в плейлисте: ${currentTracks.length}`);

// Сбор трендов из всех источников
const trendingTracks = await playlistService.fetchAllTrends();
console.log(`Всего трендовых треков: ${trendingTracks.length}`);
```

### Recommendation Service

```javascript
const recommendationService = require('./services/recommendation.service');

// Персональные рекомендации
const recommendations = await recommendationService.getPersonalizedRecommendations(
  userId: 42,
  limit: 20
);

// Похожие треки
const similar = await recommendationService.getSimilarTracks(trackId: 1234, limit: 10);

// Рекомендации для нового пользователя
const coldStart = await recommendationService.getColdStartRecommendations(20);

// Обновить популярность трека
await recommendationService.updateTrackPopularity(trackId: 1234);
```

## 📊 Планировщик задач

```javascript
const autoUpdateScheduler = require('./scheduler/auto-update.scheduler');

// Запуск планировщика
autoUpdateScheduler.start();

// Остановка планировщика
autoUpdateScheduler.stop();

// Ручной запуск задачи
const result = await autoUpdateScheduler.runTask('charts-update');

// Получить статус
const status = autoUpdateScheduler.getStatus();
console.log('Запущен:', status.isRunning);
console.log('Задачи:', status.tasks);
```

## 🔍 Комплексный пример: Полный цикл обновления

```javascript
async function fullUpdateCycle() {
  // 1. Сбор данных из всех источников
  console.log('Шаг 1: Сбор данных...');
  
  const [spotifyTracks, appleTracks, billboardTracks, shazamTracks] = await Promise.all([
    spotifyService.getTopTracks('global', 100),
    appleMusicService.getTopTracks('us', 100),
    billboardService.getGlobal200(100),
    shazamService.getTopTracks('world', 100)
  ]);
  
  console.log('Данные собраны:', {
    spotify: spotifyTracks.length,
    apple: appleTracks.length,
    billboard: billboardTracks.length,
    shazam: shazamTracks.length
  });
  
  // 2. Актуализация плейлистов
  console.log('Шаг 2: Актуализация плейлистов...');
  
  const playlists = ['global-top-100', 'trending-now', 'new-releases'];
  
  for (const playlistId of playlists) {
    const result = await playlistService.actualizePlaylist(playlistId);
    console.log(`${playlistId}:`, result.changes.summary);
  }
  
  // 3. Импорт новинок с kissvk
  console.log('Шаг 3: Импорт с kissvk...');
  
  const importStats = await kissvkService.importNewReleases();
  console.log('Статистика импорта:', importStats);
  
  // 4. Обновление рекомендаций
  console.log('Шаг 4: Обновление рекомендаций...');
  
  const users = [1, 2, 3, 4, 5]; // ID активных пользователей
  
  for (const userId of users) {
    const recs = await recommendationService.getPersonalizedRecommendations(userId, 20);
    console.log(`Рекомендации для пользователя ${userId}: ${recs.length}`);
  }
  
  console.log('✓ Полный цикл обновления завершён!');
}

// Запуск
fullUpdateCycle().catch(console.error);
```

## 🎨 React компоненты: Примеры использования

### Интеграция TrendingPlaylists

```jsx
import React from 'react';
import TrendingPlaylists from './components/TrendingPlaylists';

function HomePage() {
  const userId = getCurrentUserId(); // Ваша функция получения ID пользователя
  
  return (
    <div className="home-page">
      <h1>Главная</h1>
      <TrendingPlaylists userId={userId} />
    </div>
  );
}
```

### Интеграция PendingChangesManager

```jsx
import React from 'react';
import PendingChangesManager from './components/admin/PendingChangesManager';

function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>Панель администратора</h1>
      <PendingChangesManager />
    </div>
  );
}
```

## 🛠️ Утилиты и хелперы

### Создание кастомного плейлиста на основе трендов

```javascript
async function createTrendPlaylist(name, filters = {}) {
  // Получить тренды
  const trends = await playlistService.fetchAllTrends();
  
  // Применить фильтры
  let filtered = trends;
  
  if (filters.genre) {
    filtered = filtered.filter(t => t.genre === filters.genre);
  }
  
  if (filters.minScore) {
    const ranked = playlistService.calculateTrackScores(filtered);
    filtered = ranked.filter(t => t.score >= filters.minScore);
  }
  
  // Создать плейлист
  const playlistId = await db.query(
    'INSERT INTO playlists (name, description) VALUES ($1, $2) RETURNING id',
    [name, `Автоматически созданный плейлист: ${name}`]
  );
  
  // Добавить треки
  for (let i = 0; i < Math.min(filtered.length, 50); i++) {
    const track = filtered[i];
    // Найти или создать трек в БД
    // Добавить в плейлист
  }
  
  return playlistId;
}

// Использование
await createTrendPlaylist('Популярный Поп', {
  genre: 'pop',
  minScore: 0.7
});
```

Эти примеры покрывают все основные сценарии использования системы автообновления плейлистов!
