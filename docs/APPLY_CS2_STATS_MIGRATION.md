# 🎯 Применение миграции CS2 Advanced Statistics

## ⚡ Автоматическое применение (рекомендуется)

Миграции применяются **автоматически** при старте backend контейнера благодаря `docker-entrypoint.sh`.

```bash
# Просто пересоберите и запустите контейнеры
docker-compose down
docker-compose up --build -d

# Проверить логи применения миграций
docker-compose logs backend | grep "migration"
```

**Миграция применится автоматически при первом запуске!** ✅

---

## Способ 1: Через Docker (ручное применение)

```bash
# Скопировать миграцию в контейнер
docker cp backend/migrations/add-cs2-advanced-stats.sql errorparty_postgres:/tmp/

# Применить миграцию
docker exec -i errorparty_postgres psql -U errorparty -d errorparty -f /tmp/add-cs2-advanced-stats.sql

# Проверить созданные таблицы
docker exec -i errorparty_postgres psql -U errorparty -d errorparty -c "\dt cs2*"
```

## Способ 2: Локально (для development)

```bash
# Перейти в папку миграций
cd backend/migrations

# Применить миграцию
psql -U errorparty -d errorparty -f add-cs2-advanced-stats.sql

# Или если нужен пароль
PGPASSWORD=your_password psql -h localhost -U errorparty -d errorparty -f add-cs2-advanced-stats.sql
```

## Способ 3: Через pgAdmin/DBeaver

1. Откройте файл `backend/migrations/add-cs2-advanced-stats.sql`
2. Скопируйте содержимое
3. В SQL редакторе pgAdmin/DBeaver вставьте и выполните

## Проверка успешной миграции

```bash
# Проверить таблицы
docker exec -i errorparty_postgres psql -U errorparty -d errorparty -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE 'cs2_%'
  ORDER BY table_name;
"

# Должны быть:
# cs2_demos
# cs2_matches
# cs2_player_performance
# cs2_weapon_stats
```

## Перезапуск backend

```bash
# Автоматическое применение миграций при старте
docker-compose up --build -d backend

# Или полный перезапуск
docker-compose restart backend

# Проверить логи
docker-compose logs -f backend

# Вы должны увидеть:
# ✅ PostgreSQL is ready!
# ✅ Redis is ready!
# 📊 Applying database migrations...
# ✅ Migrations applied!
# 🎮 Starting Node.js application...
```

## Тестирование API

```bash
# Health check
curl http://localhost:3000/api/health

# Проверить новые эндпоинты (должен вернуть пустой массив)
curl http://localhost:3000/api/cs2-stats/leaderboard
```

## Готово! ✅

Теперь можно использовать новую API для CS2 статистики.

См. документацию:
- `docs/CS2_ADVANCED_STATS_API.md` - полная документация
- `CS2_STATS_QUICKSTART.md` - быстрый старт
