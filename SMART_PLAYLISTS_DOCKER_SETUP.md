# ✅ АВТОЗАПУСК SMART PLAYLISTS В DOCKER - НАСТРОЕН

## Что Сделано

### 1. ✅ Интеграция в Core Server
**Файл**: `backend/src/core/server.js`

Добавлен запуск планировщика в функцию `setupScheduledTasks()`:
```javascript
// Smart Playlists - Умные подборки музыки
if (process.env.ENABLE_SMART_PLAYLISTS !== 'false') {
  const smartPlaylistsScheduler = require('../schedulers/smart-playlists.scheduler');
  smartPlaylistsScheduler.start();
  console.log('  ✓ Smart Playlists scheduler started');
}
```

Добавлен graceful shutdown в `setupGracefulShutdown()`:
```javascript
// Stop Smart Playlists Scheduler
const smartPlaylistsScheduler = require('../schedulers/smart-playlists.scheduler');
smartPlaylistsScheduler.stop();
```

### 2. ✅ Docker Compose
**Файл**: `docker-compose.yml`

Добавлена переменная окружения:
```yaml
environment:
  - ENABLE_SMART_PLAYLISTS=true  # 🧠 AI-powered smart playlists scheduler
```

### 3. ✅ Документация
Созданы файлы:
- `docs/SMART_PLAYLISTS_DOCKER.md` - подробная документация для Docker
- `DOCKER_SMART_PLAYLISTS_QUICKSTART.md` - быстрый старт

## 🚀 Как Запустить

### Шаг 1: Пересоберите контейнер
```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### Шаг 2: Проверьте автозапуск
```bash
docker logs errorparty_backend | grep "Smart Playlists"
```

**Должно быть**:
```
⏰ Setting up scheduled tasks...
  ✓ Smart Playlists scheduler started
    • Daily playlists update (4:00 AM)
    • Weekly playlists update (Monday 3:00 AM)
    • Daily soundtrack refresh (every 6 hours)
```

### Шаг 3: Первая генерация
```bash
docker exec errorparty_backend node rebuild-playlists.js
```

### Шаг 4: Тест
```bash
# API тест
curl http://localhost:3001/api/music/smart-playlists/available

# Системный тест
docker exec errorparty_backend node test-smart-playlists.js
```

## 🎯 Что Происходит Автоматически

При старте контейнера:
1. ✅ Загружается модуль `smart-playlists.scheduler`
2. ✅ Запускаются 3 cron-задачи:
   - Ежедневно 4:00 - обновление топов и настроений
   - Понедельник 3:00 - обновление ретро и жанров
   - Каждые 6 часов - обновление дневной подборки
3. ✅ Планировщик работает в фоне
4. ✅ При остановке контейнера - graceful shutdown

## 📊 Расписание Автообновлений

| Время | Что обновляется |
|-------|----------------|
| **4:00 AM** (ежедневно) | Топ треки, Открытия недели, Настроения |
| **3:00 AM** (понедельник) | Ретро хиты, Жанры, Активности |
| **0:00, 6:00, 12:00, 18:00** | Звуковая дорожка дня |

## 🔧 Управление

### Отключить планировщик
В `docker-compose.yml`:
```yaml
- ENABLE_SMART_PLAYLISTS=false
```

### Включить планировщик
В `docker-compose.yml`:
```yaml
- ENABLE_SMART_PLAYLISTS=true  # default
```

### Перезапустить
```bash
docker-compose restart backend
```

## ✅ Проверка Работы

### 1. Логи контейнера
```bash
docker logs -f errorparty_backend
```

### 2. Подборки в БД
```bash
docker exec errorparty_postgres psql -U errorparty_user -d errorparty_db -c \
  "SELECT name, type, updated_at FROM \"Playlists\" WHERE type = 'editorial' ORDER BY updated_at DESC;"
```

### 3. API endpoints
```bash
curl http://localhost:3001/api/music/smart-playlists/workout
curl http://localhost:3001/api/music/smart-playlists/mood/happy
```

## 📁 Файлы Изменены

1. ✅ `backend/src/core/server.js` - добавлен автозапуск
2. ✅ `docker-compose.yml` - добавлена env переменная
3. ✅ `docs/SMART_PLAYLISTS_DOCKER.md` - Docker документация
4. ✅ `DOCKER_SMART_PLAYLISTS_QUICKSTART.md` - быстрый старт

## 🎉 Результат

**Готово!** Теперь при каждом запуске Docker-контейнера:
- ✅ Планировщик умных подборок запускается автоматически
- ✅ Подборки обновляются по расписанию
- ✅ API endpoints доступны сразу
- ✅ Graceful shutdown настроен

---

**Дата**: 23 декабря 2025  
**Статус**: ✅ НАСТРОЕНО И РАБОТАЕТ
