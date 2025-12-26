# 🐳 Smart Playlists в Docker

## Автозапуск

Система умных подборок автоматически запускается при старте Docker-контейнера.

### Конфигурация

В `docker-compose.yml` или `.env` добавьте:

```env
# Включить/выключить умные подборки
ENABLE_SMART_PLAYLISTS=true
```

### Проверка Запуска

После запуска контейнера проверьте логи:

```bash
docker logs errorparty_backend
```

**Должно быть**:
```
⏰ Setting up scheduled tasks...
  ✓ Smart Playlists scheduler started
    • Daily playlists update (4:00 AM)
    • Weekly playlists update (Monday 3:00 AM)
    • Daily soundtrack refresh (every 6 hours)
```

## Команды

### Запуск контейнера
```bash
docker-compose up -d backend
```

### Просмотр логов
```bash
docker logs -f errorparty_backend
```

### Проверка работы
```bash
# Проверить API
curl http://localhost:3001/api/music/smart-playlists/available

# Проверить подборки в БД
docker exec errorparty_backend node -e "
const { Playlist } = require('./src/models');
(async () => {
  const count = await Playlist.count({ where: { type: 'editorial' } });
  console.log('Editorial playlists:', count);
})();
"
```

### Первичная генерация подборок

```bash
# Запустить скрипт генерации
docker exec errorparty_backend node rebuild-playlists.js
```

### Ручное обновление

```bash
# Обновить все подборки вручную
docker exec errorparty_backend node -e "
const scheduler = require('./src/schedulers/smart-playlists.scheduler');
scheduler.runManualUpdate().then(() => {
  console.log('✅ Обновление завершено');
  process.exit(0);
}).catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
"
```

### Тестирование

```bash
# Запустить тесты
docker exec errorparty_backend node test-smart-playlists.js
```

## Переменные Окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `ENABLE_SMART_PLAYLISTS` | Включить планировщик | `true` |

## Автоматическое Обновление

Планировщик работает по расписанию:

- **4:00 AM ежедневно** → Топ треки, Открытия недели, Настроения
- **3:00 AM понедельник** → Ретро, Жанры, Активности
- **Каждые 6 часов** → Звуковая дорожка дня

## Проблемы

### Подборки не создаются

**Решение**:
```bash
# 1. Проверьте, что планировщик запущен
docker logs errorparty_backend | grep "Smart Playlists"

# 2. Запустите вручную
docker exec errorparty_backend node rebuild-playlists.js

# 3. Проверьте треки в БД
docker exec errorparty_backend node -e "
const { Track } = require('./src/models');
(async () => {
  const count = await Track.count();
  console.log('Total tracks:', count);
})();
"
```

### Планировщик не запускается

**Решение**:
```bash
# 1. Проверьте зависимости
docker exec errorparty_backend npm list node-cron

# 2. Если отсутствует, установите
docker exec errorparty_backend npm install node-cron

# 3. Перезапустите контейнер
docker-compose restart backend
```

### Ошибки в логах

**Решение**:
```bash
# Посмотреть детальные логи
docker logs errorparty_backend --tail 100

# Проверить подключение к БД
docker exec errorparty_backend node -e "
const { sequelize } = require('./src/core/database');
sequelize.authenticate().then(() => {
  console.log('✅ DB connected');
  process.exit(0);
}).catch(err => {
  console.error('❌ DB error:', err.message);
  process.exit(1);
});
"
```

## Мониторинг

### Логи планировщика

```bash
# Следить за логами в реальном времени
docker logs -f errorparty_backend | grep -E "(Smart Playlists|Running.*playlists)"
```

### Проверка обновлений

```sql
-- В PostgreSQL контейнере
docker exec errorparty_postgres psql -U errorparty_user -d errorparty_db -c "
SELECT name, type, updated_at 
FROM \"Playlists\" 
WHERE type = 'editorial' 
ORDER BY updated_at DESC 
LIMIT 10;
"
```

## Отключение

Если нужно отключить планировщик:

```bash
# В .env или docker-compose.yml
ENABLE_SMART_PLAYLISTS=false

# Перезапустить
docker-compose restart backend
```

---

**Готово!** Умные подборки теперь работают автоматически в Docker! 🎉
