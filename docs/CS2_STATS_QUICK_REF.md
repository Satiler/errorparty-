# 🚀 CS2 Stats - Quick Reference

## 📋 Быстрые команды

### Backfill (наполнение данными)
```bash
# Последние 100 матчей
docker exec errorparty_backend node backfill-cs2-stats.js --limit=100

# Все матчи
docker exec errorparty_backend node backfill-cs2-stats.js --all

# Конкретный матч
docker exec errorparty_backend node backfill-cs2-stats.js --match-id=12345

# Dry run
docker exec errorparty_backend node backfill-cs2-stats.js --limit=50 --dry-run
```

### API Endpoints (curl examples)
```bash
# Leaderboard
curl "https://errorparty.ru/api/cs2-stats/leaderboard"
curl "https://errorparty.ru/api/cs2-stats/leaderboard?criteria=kd&limit=20"

# Player stats
curl "https://errorparty.ru/api/cs2-stats/performance/76561199073993071"
curl "https://errorparty.ru/api/cs2-stats/weapons/76561199073993071"
curl "https://errorparty.ru/api/cs2-stats/matches/76561199073993071?limit=20"

# Weapon types
curl "https://errorparty.ru/api/cs2-stats/weapon-types/76561199073993071"

# Maps
curl "https://errorparty.ru/api/cs2-stats/maps/76561199073993071"

# Recent form
curl "https://errorparty.ru/api/cs2-stats/recent-form/76561199073993071"

# Compare
curl "https://errorparty.ru/api/cs2-stats/compare?steamId1=76561199073993071&steamId2=76561198123456789"
```

### Мониторинг
```bash
# Количество записей
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "SELECT COUNT(*) FROM cs2_player_performance;"
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "SELECT COUNT(*) FROM cs2_weapon_stats;"

# Топ 5
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "
SELECT u.username, cpp.rating, cpp.kd_ratio, cpp.total_matches
FROM cs2_player_performance cpp
JOIN users u ON cpp.user_id = u.id
ORDER BY cpp.rating DESC LIMIT 5;
"

# Статус матчей
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "SELECT status, COUNT(*) FROM cs2_matches GROUP BY status;"

# Redis cache
docker exec errorparty_redis redis-cli KEYS "cs2:stats:*"
docker exec errorparty_redis redis-cli FLUSHDB
```

### Troubleshooting
```bash
# Логи backend
docker-compose logs backend | grep "CS2 Advanced Stats"

# Перезапуск
docker-compose restart backend

# Rebuild
docker-compose build backend && docker-compose up -d backend

# Health check
curl https://errorparty.ru/api/health
```

## 📚 Документация

- **API Docs:** [docs/CS2_ADVANCED_STATS_API.md](docs/CS2_ADVANCED_STATS_API.md)
- **Quickstart:** [CS2_STATS_QUICKSTART.md](CS2_STATS_QUICKSTART.md)
- **Integration:** [CS2_STATS_INTEGRATION.md](CS2_STATS_INTEGRATION.md)
- **Deployment:** [CS2_STATS_DEPLOYMENT_REPORT.md](CS2_STATS_DEPLOYMENT_REPORT.md)

## 🎯 Next Steps

1. **Backfill:** `docker exec errorparty_backend node backfill-cs2-stats.js --limit=100`
2. **Check:** `curl https://errorparty.ru/api/cs2-stats/leaderboard`
3. **Frontend:** Создать страницу со статистикой
