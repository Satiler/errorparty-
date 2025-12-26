# 🚀 Быстрый Старт: Умные Подборки

## Запуск Системы

### 1. Установка Зависимостей

```bash
cd backend
npm install node-cron
```

### 2. Первичная Генерация Подборок

```bash
# Генерация всех подборок
node rebuild-playlists.js
```

Это создаст ~15 умных подборок в базе данных.

### 3. Автоматический Запуск

Планировщик запускается автоматически при старте сервера:

```bash
npm start
```

Вы увидите в логах:
```
🧠 Initializing Smart Playlists Scheduler...
✅ Smart Playlists Scheduler started!
   🎵 Daily playlists update (every day at 4:00 AM)
   📅 Weekly playlists update (Monday at 3:00 AM)
   🎶 Daily soundtrack refresh (every 6 hours)
   🤖 AI-powered mood, activity & genre playlists
```

## API Примеры

### Получить Подборку для Тренировки

```bash
curl http://localhost:3001/api/music/smart-playlists/workout
```

### Получить Веселую Подборку

```bash
curl http://localhost:3001/api/music/smart-playlists/mood/happy?limit=30
```

### Персональный Радар (требует авторизации)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/music/smart-playlists/personal-radar
```

### Список Всех Доступных Подборок

```bash
curl http://localhost:3001/api/music/smart-playlists/available
```

## Frontend Интеграция

```javascript
// React/Vue/Angular пример
async function loadWorkoutPlaylist() {
  const response = await fetch('/api/music/smart-playlists/workout?limit=30');
  const playlist = await response.json();
  
  console.log(playlist.name);        // "💪 Тренировка"
  console.log(playlist.tracks);      // Массив треков
  console.log(playlist.algorithm);   // "workout"
}

// Сохранить как свой плейлист
async function savePlaylist(tracks) {
  const response = await fetch('/api/music/smart-playlists/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Моя подборка',
      trackIds: tracks.map(t => t.id),
      algorithm: 'custom'
    })
  });
  
  return response.json();
}
```

## Тестирование

```javascript
// Из Node.js REPL или скрипта
const smartGen = require('./src/services/smart-playlist-generator.service');

// Генерация подборок
const happy = await smartGen.generateByMood('happy', 20);
const workout = await smartGen.generateWorkoutPlaylist(30);
const radar = await smartGen.generatePersonalRadar(userId, 50);

console.log(`Happy: ${happy.tracks.length} треков`);
console.log(`Workout: ${workout.tracks.length} треков`);
console.log(`Radar: ${radar.tracks.length} треков`);
```

## Проверка Работы

### 1. Проверить созданные плейлисты в БД

```sql
SELECT name, type, 
       (SELECT COUNT(*) FROM "PlaylistTracks" WHERE "playlistId" = "Playlists".id) as track_count
FROM "Playlists" 
WHERE type = 'editorial'
ORDER BY metadata->>'priority';
```

### 2. Проверить планировщик

```bash
# Логи должны показывать:
📅 Daily playlists job scheduled (4:00 AM)
📅 Weekly playlists job scheduled (Monday 3:00 AM)
📅 Daily soundtrack job scheduled (every 6 hours)
```

### 3. Ручной запуск обновления

```javascript
const scheduler = require('./src/schedulers/smart-playlists.scheduler');
await scheduler.runManualUpdate();
```

## Расписание Обновлений

| Подборка | Частота | Время |
|----------|---------|-------|
| Топ треки | Ежедневно | 4:00 AM |
| Открытия недели | Ежедневно | 4:00 AM |
| Настроения | Ежедневно | 4:00 AM |
| Ретро | Еженедельно | Пн 3:00 AM |
| Жанры | Еженедельно | Пн 3:00 AM |
| Активности | Еженедельно | Пн 3:00 AM |
| Звуковая дорожка дня | Каждые 6 часов | 0:00, 6:00, 12:00, 18:00 |

## Кастомизация

### Добавить Новое Настроение

```javascript
// В smart-playlist-generator.service.js
const moodConfigs = {
  // ... существующие
  mystic: { 
    energy: [0.4, 0.6], 
    genres: ['ambient', 'psychedelic'],
    preferInstrumental: true 
  }
};
```

### Добавить Новый API Endpoint

```javascript
// В smart-playlists.controller.js
async getMystic(req, res) {
  const result = await smartPlaylistGenerator.generateByMood('mystic', 50);
  res.json(result);
}

// В smart-playlists.routes.js
router.get('/mystic', smartPlaylistsController.getMystic);
```

## Оптимизация

### Для Больших Баз Данных (10,000+ треков)

1. Добавьте индексы:
```sql
CREATE INDEX IF NOT EXISTS idx_tracks_energy ON "Tracks"(energy);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON "Tracks"(bpm);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON "Tracks"(genre);
```

2. Используйте лимиты:
```javascript
// Генерировать меньше треков
const result = await smartGen.generateByMood('happy', 30);
```

3. Кэшируйте результаты (Redis):
```javascript
const cached = await redis.get('playlist:workout');
if (cached) return JSON.parse(cached);

const result = await smartGen.generateWorkoutPlaylist(40);
await redis.setex('playlist:workout', 3600, JSON.stringify(result));
```

## FAQ

**Q: Как часто обновляются подборки?**  
A: Зависит от типа. Ежедневные - каждый день в 4:00, еженедельные - по понедельникам в 3:00.

**Q: Можно ли изменить расписание?**  
A: Да, в `smart-playlists.scheduler.js` измените cron выражения.

**Q: Требуется ли ML-анализ треков?**  
A: Желательно. Заполните поля `energy`, `bpm`, `isInstrumental` для лучших результатов.

**Q: Как добавить ML-параметры?**  
A: Используйте библиотеки аудио-анализа (librosa, essentia) или API (Spotify Audio Features).

**Q: Работает ли без авторизации?**  
A: Большинство подборок - да. Только "Персональный радар" требует авторизации.

---

Готово! 🎉 Умные подборки работают.
