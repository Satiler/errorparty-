# 🎮 CS2 Advanced Statistics - Integration Guide

## 📋 Оглавление
1. [Автоматическая интеграция](#автоматическая-интеграция)
2. [Ручное наполнение данными](#ручное-наполнение-данными)
3. [API Examples](#api-examples)
4. [Troubleshooting](#troubleshooting)

---

## 🔄 Автоматическая интеграция

### ✅ Реализовано (27.11.2025)

Статистика **автоматически обновляется** после каждого распарсенного demo файла.

**Интеграция в `cs2DemoParserService.js`:**

```javascript
// После завершения парсинга demo
match.status = 'completed';
await match.save();

// Автоматическое обновление CS2 Advanced Stats
try {
  const cs2StatsService = require('./cs2StatsService');
  await cs2StatsService.updatePlayerPerformance(matchId);
  console.log(`📊 CS2 Advanced Stats updated for match ${matchId}`);
} catch (statsError) {
  console.error(`⚠️ Failed to update CS2 stats:`, statsError.message);
  // Match data is saved, stats can be backfilled later
}
```

### 🎯 Как это работает:

1. **Пользователь загружает Share Code** → `cs2MatchSyncService.syncMatches()`
2. **Скачивается demo файл** → `cs2DemoDownloadService.queueDownload()`
3. **Парсится demo** → `cs2DemoParserService.parseDemo()`
4. **Обновляется match** → `updateMatchStatistics()`
5. **✨ НОВОЕ: Обновляется статистика** → `cs2StatsService.updatePlayerPerformance()`

### 📊 Что обновляется:

#### `cs2_player_performance` таблица:
- HLTV Rating 2.0 (KPR, DPR, Impact, ADR, KAST)
- K/D Ratio, Headshot %, Win Rate
- ADR (Average Damage per Round)
- Статистика по позициям (T/CT)
- Impact Rating (clutch kills, entry kills)
- Общие метрики (kills, deaths, assists)

#### `cs2_weapon_stats` таблица:
- Kills, Deaths, Headshots по каждому оружию
- Damage dealt (общий и на раунд)
- Точность (автоматический расчёт)
- Headshot % (автоматический расчёт)
- Группировка по типам оружия (rifle, smg, sniper, pistol, etc.)

---

## 🔧 Ручное наполнение данными

Если у вас уже есть завершённые CS2 матчи в базе, используйте **backfill скрипт**:

### Запуск backfill внутри контейнера:

```bash
# Обработать последние 100 матчей
docker exec errorparty_backend node backfill-cs2-stats.js --limit=100

# Обработать ВСЕ матчи (может занять часы!)
docker exec errorparty_backend node backfill-cs2-stats.js --all

# Обработать конкретный матч
docker exec errorparty_backend node backfill-cs2-stats.js --match-id=12345

# Dry run - посмотреть что будет обработано
docker exec errorparty_backend node backfill-cs2-stats.js --limit=50 --dry-run
```

### Локальный запуск (без Docker):

```bash
cd backend
node backfill-cs2-stats.js --limit=100
```

### Пример вывода:

```
🚀 CS2 Statistics Backfill Started

📊 Processing last 100 matches

📦 Found 100 matches to process

[1/100] (1.0%) Processing match 1543...
  ✅ Updated 10 players

[2/100] (2.0%) Processing match 1542...
  ⏭️  Already processed (10 players), skipping...

...

============================================================
📊 BACKFILL COMPLETE

✅ Processed: 85 matches
⏭️  Skipped:   15 matches (already processed)
❌ Errors:    0 matches
👥 Total players updated: 850
============================================================

🏆 Top 5 Players by HLTV Rating:

  1. vex - Rating: 1.42 (127 matches)
  2. ProPlayer123 - Rating: 1.31 (94 matches)
  3. AimGod - Rating: 1.28 (156 matches)
  4. HeadShooter - Rating: 1.19 (203 matches)
  5. ClutchMaster - Rating: 1.15 (178 matches)

✨ Backfill completed successfully
```

---

## 🚀 API Examples

### 1. Получить статистику игрока

```bash
curl "https://errorparty.ru/api/cs2-stats/performance/76561199073993071"
```

**Response:**
```json
{
  "success": true,
  "performance": {
    "steamId": "76561199073993071",
    "username": "vex",
    "rating": 1.42,
    "kdRatio": 1.35,
    "headshotPercentage": 48.5,
    "adr": 89.3,
    "totalMatches": 127,
    "totalKills": 2547,
    "totalDeaths": 1887,
    "winRate": 54.3
  }
}
```

### 2. Топ 10 игроков по рейтингу

```bash
curl "https://errorparty.ru/api/cs2-stats/leaderboard?criteria=rating&limit=10"
```

### 3. Статистика оружия игрока

```bash
curl "https://errorparty.ru/api/cs2-stats/weapons/76561199073993071?weaponType=rifle"
```

### 4. История последних матчей

```bash
curl "https://errorparty.ru/api/cs2-stats/matches/76561199073993071?limit=20"
```

### 5. Сравнение двух игроков

```bash
curl "https://errorparty.ru/api/cs2-stats/compare?steamId1=76561199073993071&steamId2=76561198123456789"
```

### 6. Статистика по картам

```bash
curl "https://errorparty.ru/api/cs2-stats/maps/76561199073993071"
```

### 7. Recent Form (последние 10 матчей)

```bash
curl "https://errorparty.ru/api/cs2-stats/recent-form/76561199073993071"
```

### 8. Группировка оружия по типам

```bash
curl "https://errorparty.ru/api/cs2-stats/weapon-types/76561199073993071"
```

---

## 🐛 Troubleshooting

### Проблема: Leaderboard пустой

**Причина:** Нет обработанных матчей в базе

**Решение:**
```bash
# Проверить сколько матчей в базе
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "SELECT COUNT(*) FROM cs2_matches WHERE status='completed';"

# Запустить backfill
docker exec errorparty_backend node backfill-cs2-stats.js --limit=100
```

### Проблема: Player not found

**Причина:** У игрока нет завершённых матчей

**Решение:**
- Дождаться когда игрок сыграет матч и загрузит Share Code
- Или запустить backfill если матчи уже были

### Проблема: Статистика не обновляется

**Причина:** Demo файлы не парсятся

**Решение:**
```bash
# Проверить логи парсера
docker-compose logs backend | grep "CS2 Advanced Stats"

# Проверить статус demo
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "SELECT status, COUNT(*) FROM cs2_demos GROUP BY status;"

# Форсировать обновление конкретного матча
docker exec errorparty_backend node -e "
const cs2StatsService = require('./src/services/cs2StatsService');
cs2StatsService.updatePlayerPerformance(12345).then(() => console.log('Done'));
"
```

### Проблема: Redis cache не работает

**Причина:** Redis не подключён или перегружен

**Решение:**
```bash
# Проверить Redis
docker exec errorparty_redis redis-cli PING
# Должно вернуть: PONG

# Очистить cache
docker exec errorparty_redis redis-cli FLUSHDB

# Перезапустить Redis
docker-compose restart redis
```

---

## 📈 Monitoring

### Проверить количество записей:

```bash
# Player Performance
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "SELECT COUNT(*) FROM cs2_player_performance;"

# Weapon Stats
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "SELECT COUNT(*) FROM cs2_weapon_stats;"

# Matches with stats
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "
SELECT 
  COUNT(DISTINCT cpp.user_id) as players_with_stats,
  COUNT(DISTINCT cws.match_id) as matches_with_weapon_stats,
  SUM(cpp.total_matches) as total_processed_matches
FROM cs2_player_performance cpp
LEFT JOIN cs2_weapon_stats cws ON cpp.user_id = cws.user_id;
"
```

### Топ 5 игроков в консоли:

```bash
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "
SELECT 
  u.username,
  cpp.rating,
  cpp.kd_ratio,
  cpp.total_matches
FROM cs2_player_performance cpp
JOIN users u ON cpp.user_id = u.id
ORDER BY cpp.rating DESC
LIMIT 5;
"
```

---

## 🎯 Рекомендации

1. **После первого запуска:** Запустите backfill для обработки существующих матчей
2. **Регулярно:** Новые матчи обрабатываются автоматически через 3-7 дней после игры
3. **Мониторинг:** Проверяйте логи на наличие ошибок парсинга
4. **Redis:** Следите за использованием памяти Redis
5. **Производительность:** Backfill больших объёмов (1000+ матчей) запускайте в нерабочее время

---

## 📚 Дополнительные ресурсы

- **API Documentation:** [docs/CS2_ADVANCED_STATS_API.md](docs/CS2_ADVANCED_STATS_API.md)
- **Quickstart Guide:** [CS2_STATS_QUICKSTART.md](CS2_STATS_QUICKSTART.md)
- **Deployment Report:** [CS2_STATS_DEPLOYMENT_REPORT.md](CS2_STATS_DEPLOYMENT_REPORT.md)
- **Docker Setup:** [DOCKER_MIGRATIONS_SETUP.md](DOCKER_MIGRATIONS_SETUP.md)

---

**Last Updated:** 27 November 2025  
**Status:** ✅ Production Ready
