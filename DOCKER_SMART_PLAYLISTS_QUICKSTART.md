# 🐳 Запуск Smart Playlists в Docker - Быстрая Инструкция

## ✅ Готово к Использованию!

Система умных подборок настроена для автозапуска в Docker.

## 🚀 Запуск

### 1. Пересоберите контейнер (если был запущен ранее)

```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### 2. Первая генерация подборок

```bash
# Подождите ~30 секунд пока контейнер запустится
docker exec errorparty_backend node rebuild-playlists.js
```

**Ожидаемый вывод**:
```
🔄 Starting playlist rebuild...
📊 Total tracks available: XXX
✅ Created: Топ 100 Треков (100 tracks)
✅ Created: 💪 Тренировка (40 tracks)
...
✅ PLAYLIST REBUILD COMPLETE!
```

### 3. Проверка автозапуска

```bash
docker logs errorparty_backend | grep "Smart Playlists"
```

**Должно быть**:
```
✓ Smart Playlists scheduler started
  • Daily playlists update (4:00 AM)
  • Weekly playlists update (Monday 3:00 AM)
  • Daily soundtrack refresh (every 6 hours)
```

## ✅ Проверка Работы

### API тест
```bash
curl http://localhost:3001/api/music/smart-playlists/available
```

### Проверка БД
```bash
docker exec errorparty_postgres psql -U errorparty_user -d errorparty_db -c \
  "SELECT COUNT(*) FROM \"Playlists\" WHERE type = 'editorial';"
```

### Тест системы
```bash
docker exec errorparty_backend node test-smart-playlists.js
```

## 📋 Полезные Команды

### Посмотреть все логи
```bash
docker logs -f errorparty_backend
```

### Перезапустить планировщик
```bash
docker-compose restart backend
```

### Ручное обновление подборок
```bash
docker exec errorparty_backend node -e "
const scheduler = require('./src/schedulers/smart-playlists.scheduler');
scheduler.runManualUpdate().then(() => process.exit(0));
"
```

### Проверить подборки
```bash
docker exec errorparty_backend node -e "
const { Playlist } = require('./src/models');
(async () => {
  const playlists = await Playlist.findAll({ 
    where: { type: 'editorial' },
    attributes: ['name', 'updatedAt'],
    limit: 10 
  });
  playlists.forEach(p => console.log(p.name, '-', p.updatedAt));
  process.exit(0);
})();
"
```

## 🔧 Отключение (если нужно)

В `docker-compose.yml` измените:
```yaml
- ENABLE_SMART_PLAYLISTS=false
```

И перезапустите:
```bash
docker-compose restart backend
```

## ❓ Проблемы?

### Контейнер не запускается
```bash
# Проверить логи
docker logs errorparty_backend

# Проверить статус
docker ps -a | grep backend
```

### Подборки пустые
```bash
# Проверить треки
docker exec errorparty_backend node -e "
const { Track } = require('./src/models');
(async () => {
  const count = await Track.count();
  console.log('Треков в БД:', count);
  process.exit(0);
})();
"

# Если мало треков, загрузите больше через API или скрипты импорта
```

### node-cron не установлен
```bash
docker exec errorparty_backend npm install node-cron
docker-compose restart backend
```

## 📚 Документация

- [Полная документация](SMART_PLAYLISTS_DOCKER.md)
- [Архитектура](SMART_PLAYLISTS_ARCHITECTURE.md)
- [API Reference](SMART_PLAYLISTS.md)

---

**Готово!** 🎉 Умные подборки автоматически работают в Docker!
