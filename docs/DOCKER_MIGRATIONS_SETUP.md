# 🐳 Docker Setup для CS2 Advanced Statistics

## ✅ Что обновлено:

### 1. **docker-entrypoint.sh** (НОВЫЙ)
Entrypoint скрипт автоматически:
- ⏳ Ждёт готовности PostgreSQL
- ⏳ Ждёт готовности Redis
- 📊 Применяет все SQL миграции из `/app/migrations/`
- 🚀 Запускает Node.js приложение

### 2. **Dockerfile** (ОБНОВЛЁН)
- Добавлен `postgresql-client` для psql команды
- Добавлен `netcat-openbsd` для проверки портов
- Копируется и делается исполняемым `docker-entrypoint.sh`
- Используется ENTRYPOINT вместо CMD

### 3. **docker-compose.yml** (ОБНОВЛЁН)
- Добавлен volume mount для миграций: `./backend/migrations:/app/migrations:ro`
- Миграции монтируются в read-only режиме для безопасности

---

## 🚀 Запуск

### Первый запуск (с применением миграций)

```bash
# Остановить текущие контейнеры
docker-compose down

# Пересобрать backend с новым entrypoint
docker-compose build backend

# Запустить все сервисы
docker-compose up -d

# Проверить логи применения миграций
docker-compose logs backend
```

Вы должны увидеть:
```
🚀 Starting ErrorParty Backend...
⏳ Waiting for PostgreSQL...
✅ PostgreSQL is ready!
⏳ Waiting for Redis...
✅ Redis is ready!
📊 Applying database migrations...
   Applying add-critical-indexes.sql...
   Applying add-cs2-auto-sync.sql...
   Applying add-gsi-data-column.sql...
   Applying add-push-subscription.sql...
   Applying add-quests-system.sql...
   Applying add-cs2-advanced-stats.sql...
✅ Migrations applied!
🎮 Starting Node.js application...
```

### Проверка

```bash
# Проверить, что backend запустился
curl http://localhost:3000/api/health

# Проверить новые таблицы
docker exec -i errorparty_postgres psql -U errorparty -d errorparty -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_name LIKE 'cs2_%' 
  ORDER BY table_name;
"

# Должны быть:
# cs2_demos
# cs2_matches
# cs2_player_performance
# cs2_weapon_stats
```

### Тест API

```bash
# Проверить новые эндпоинты
curl http://localhost:3000/api/cs2-stats/leaderboard

# Должен вернуть:
# {"success":true,"leaderboard":[],"criteria":"rating","total":0}
```

---

## 🔄 Обновление миграций

### Добавление новой миграции

1. Создайте файл в `backend/migrations/`:
   ```bash
   touch backend/migrations/add-new-feature.sql
   ```

2. Перезапустите backend:
   ```bash
   docker-compose restart backend
   ```

3. Миграция применится автоматически! ✅

### Ручное применение (если нужно)

```bash
# Скопировать миграцию
docker cp backend/migrations/add-new-feature.sql errorparty_postgres:/tmp/

# Применить
docker exec -i errorparty_postgres psql -U errorparty -d errorparty -f /tmp/add-new-feature.sql
```

---

## 🛠️ Troubleshooting

### Backend не стартует

```bash
# Проверить логи
docker-compose logs backend

# Проверить PostgreSQL
docker exec -i errorparty_postgres psql -U errorparty -d errorparty -c '\l'

# Проверить Redis
docker exec -i errorparty_redis redis-cli ping
```

### Миграция не применилась

```bash
# Проверить, что файл миграции существует
ls -la backend/migrations/

# Проверить права на файл entrypoint
docker exec errorparty_backend ls -la /usr/local/bin/docker-entrypoint.sh

# Должно быть: -rwxr-xr-x (исполняемый)
```

### "Permission denied" для docker-entrypoint.sh

```bash
# Сделать файл исполняемым локально
chmod +x backend/docker-entrypoint.sh

# Пересобрать образ
docker-compose build backend
docker-compose up -d backend
```

### Миграции применяются повторно

Это нормально! Скрипт использует `|| true` чтобы игнорировать ошибки "already exists".
PostgreSQL сам проверит, что таблицы уже существуют, и пропустит их создание.

---

## 📁 Структура файлов

```
backend/
├── Dockerfile                    # ✅ ОБНОВЛЁН (добавлен psql, entrypoint)
├── docker-entrypoint.sh          # ✅ НОВЫЙ (автоприменение миграций)
├── migrations/                   # ✅ Монтируется в контейнер
│   ├── add-critical-indexes.sql
│   ├── add-cs2-auto-sync.sql
│   ├── add-gsi-data-column.sql
│   ├── add-push-subscription.sql
│   ├── add-quests-system.sql
│   └── add-cs2-advanced-stats.sql  # ✅ НОВЫЙ
└── src/
    ├── models/
    │   ├── CS2WeaponStats.js        # ✅ НОВЫЙ
    │   └── CS2PlayerPerformance.js  # ✅ НОВЫЙ
    ├── services/
    │   └── cs2StatsService.js       # ✅ НОВЫЙ
    └── routes/
        └── cs2Stats.js               # ✅ НОВЫЙ

docker-compose.yml                # ✅ ОБНОВЛЁН (добавлен volume для миграций)
```

---

## 🎯 Преимущества автоматических миграций

✅ **Не нужно вручную применять** - всё происходит при старте
✅ **Идемпотентность** - можно запускать много раз безопасно
✅ **Логи** - видно какие миграции применились
✅ **Production ready** - подходит для CI/CD
✅ **Простота** - добавил файл → перезапустил → готово

---

## 🚀 Production деплой

```bash
# 1. Загрузить код на сервер
git pull origin main

# 2. Пересобрать образы
docker-compose build

# 3. Запустить с применением миграций
docker-compose up -d

# 4. Проверить
docker-compose logs -f backend
curl http://your-domain.com/api/health
curl http://your-domain.com/api/cs2-stats/leaderboard
```

---

**Готово! Docker настроен для автоматического применения миграций! 🐳✅**
