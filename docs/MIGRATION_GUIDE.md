# 🔄 Миграция с Share Code на Steam Bot

## Обзор изменений

ErrorParty переходит с ручного ввода Share Code на полностью автоматическую систему загрузки матчей через Steam Bot.

## Что изменилось?

### ❌ Старый подход (Share Code)
```
1. Пользователь заходит в игру
2. Открывает "Мои матчи" → "Скопировать Share Code"
3. Вставляет код на сайт
4. Нажимает "Загрузить матч"
5. Сервер скачивает demo файл (если доступен)
6. Парсит статистику
```

**Проблемы:**
- 😫 Ручной процесс для каждого матча
- ⏱️ Занимает время (копировать → вставить → ждать)
- 🚫 Share Code доступен только 21 день
- 📥 Demo файлы весят много (~40-100 MB)
- 🔒 Valve заблокировала HTTP загрузку demo
- ❌ Требует действия от пользователя каждый раз

### ✅ Новый подход (Steam Bot)
```
1. Пользователь добавляет бота в друзья Steam (один раз)
2. Бот автоматически загружает последние 8 матчей
3. Каждые 5 минут синхронизирует новые матчи
4. Обновляет квесты автоматически
```

**Преимущества:**
- 🤖 Полная автоматизация
- ⚡ Мгновенная синхронизация
- 🔄 Постоянные обновления (каждые 5 минут)
- 💾 Не требует demo файлов
- 📊 Данные напрямую от Valve GC
- ✨ Никаких действий от пользователя

## Технические отличия

### API Changes

#### Старые endpoints (deprecated):
```javascript
POST /api/cs2/match/add
// Body: { shareCode: "CSGO-xxxxx-xxxxx" }
// Загружает один матч по Share Code

POST /api/cs2/auth/match-token
// Body: { matchToken: "CSGO-xxxxx-xxxxx" }
// Устанавливает anchor для auto-sync
```

#### Новые endpoints (active):
```javascript
POST /api/cs2/bot/add-friend
// Отправляет запрос в друзья от бота
// Бот автоматически синхронизирует матчи

POST /api/cs2/bot/sync
// Ручная синхронизация
// Бот загружает последние матчи немедленно

GET /api/cs2/bot/status
// Проверка статуса бота
// Возвращает: connected, gcReady, friends count

GET /api/cs2/bot/friends
// Список друзей бота
// Все пользователи с активной синхронизацией
```

### Database Changes

#### cs2_matches
Структура таблицы не изменилась, но источник данных другой:

**Share Code подход:**
```sql
-- Данные из demo файла (детальные, все 10 игроков)
- match_id (из Share Code)
- demo_url (ссылка на Valve CDN)
- demo_status (downloading/parsing/ready)
- full_player_data (JSON с данными всех игроков)
```

**Steam Bot подход:**
```sql
-- Данные из Game Coordinator (быстрые, основная статистика)
- match_id (от Valve GC)
- demo_url (NULL, не используется)
- demo_status (NULL, не требуется)
- player_stats (статистика текущего пользователя)
```

## Frontend Changes

### Старый UI
```jsx
// CS2StatsPage.jsx
<div className="gsi-banner">
  <input 
    placeholder="CSGO-xxxxx-xxxxx-xxxxx" 
    value={shareCode}
  />
  <button onClick={handleSubmitShareCode}>
    Загрузить матч
  </button>
</div>
```

### Новый UI
```jsx
// CS2StatsPage.jsx
<div className="bot-banner">
  <div>🤖 Автоматическая синхронизация матчей</div>
  <div>Статус: {botStatus.connected ? 'Онлайн' : 'Офлайн'}</div>
  <button onClick={handleAddBot}>
    ➕ Добавить бота
  </button>
  <button onClick={() => setShowBotInstructions(true)}>
    📖 Инструкция
  </button>
</div>
```

## Миграция для пользователей

### Что нужно сделать?

1. **Перейдите на страницу CS2 статистики**
   ```
   https://errorparty.ru/cs2/{ваш_steam_id}
   ```

2. **Нажмите "➕ Добавить бота"**
   - Бот отправит запрос в друзья
   - Вы получите уведомление в Steam

3. **Примите запрос в Steam**
   - Откройте Steam клиент
   - Друзья → Запросы
   - Примите запрос от "errorparty"

4. **Готово!**
   - Последние 8 матчей загрузятся автоматически
   - Новые матчи будут синхронизироваться каждые 5 минут

### Что происходит со старыми данными?

- ✅ **Сохранены** - все матчи из Share Code остаются в базе
- ✅ **Совместимость** - старые и новые матчи отображаются вместе
- ✅ **Квесты** - прогресс квестов сохранён

### А если я уже использовал Share Code?

**Всё нормально!** Старые матчи останутся, новые будут добавляться автоматически. Просто добавьте бота в друзья для автоматической синхронизации.

## Миграция для разработчиков

### Backend Services

#### 1. Steam Bot Service (NEW)
```javascript
// backend/src/services/steamBotService.js
class SteamBotService extends EventEmitter {
  // Singleton instance
  static instance = null;
  
  constructor() {
    this.client = new SteamUser();
    this.csgo = new GlobalOffensive(this.client);
    this.friendsList = new Map();
  }
  
  // Auto-accept friend requests
  client.on('friendRelationship', async (steamid, relationship) => {
    if (relationship === RequestRecipient) {
      this.client.addFriend(steamid);
      await this.syncUserMatches(steamid);
    }
  });
  
  // Request recent matches
  async syncUserMatches(steamId64) {
    this.csgo.requestRecentGames(steamId64);
  }
  
  // Process GC response
  csgo.on('matchList', (matches) => {
    this.handleMatchListResponse(matches);
  });
}
```

#### 2. CS2 Controller Updates
```javascript
// backend/src/controllers/cs2Controller.js

// NEW: Bot endpoints
exports.addBotFriend = async (req, res) => {
  const bot = getSteamBot();
  const result = await bot.addFriend(req.user.steamId);
  res.json({ success: true, ...result });
};

exports.syncBotMatches = async (req, res) => {
  const bot = getSteamBot();
  await bot.syncUserMatches(req.user.steamId);
  res.json({ success: true, message: 'Syncing matches...' });
};

// DEPRECATED (но работают для обратной совместимости)
exports.addMatchByShareCode = async (req, res) => {
  // Старая логика Share Code
  // Оставлено для совместимости
};
```

### Environment Variables

#### Добавить в `.env`:
```bash
# Steam Bot Configuration
STEAM_BOT_USERNAME=errorparty
STEAM_BOT_PASSWORD=your_secure_password

# Optional: Steam Guard code for first login
STEAM_GUARD_CODE=F5CC6
```

### Docker Configuration

#### docker-compose.yml updates:
```yaml
services:
  backend:
    environment:
      - STEAM_BOT_USERNAME=${STEAM_BOT_USERNAME}
      - STEAM_BOT_PASSWORD=${STEAM_BOT_PASSWORD}
    volumes:
      - steam_sentry:/app/.steam  # NEW: Persistent credentials

volumes:
  steam_sentry:  # NEW
    driver: local
```

### NPM Dependencies

#### Добавить в `package.json`:
```json
{
  "dependencies": {
    "steam-user": "^5.2.3",
    "globaloffensive": "^3.2.0"
  }
}
```

## Testing

### 1. Проверка подключения бота
```bash
curl https://errorparty.ru/api/cs2/bot/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "status": {
    "connected": true,
    "gcReady": true,
    "friends": 4,
    "pendingRequests": 0
  }
}
```

### 2. Добавление бота
```bash
curl -X POST https://errorparty.ru/api/cs2/bot/add-friend \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Проверка синхронизации
```bash
# Проверить логи бота
docker logs errorparty_backend | grep "Match data received"

# Проверить базу данных
docker exec errorparty_postgres psql -U errorparty -d errorparty \
  -c "SELECT COUNT(*) FROM cs2_matches WHERE user_id = YOUR_USER_ID"
```

## Rollback Plan

Если нужно вернуться к Share Code:

1. **Откатить frontend:**
   ```bash
   git checkout main~1 frontend/src/pages/CS2StatsPage.jsx
   docker-compose build frontend
   ```

2. **Остановить бота:**
   ```bash
   # Закомментировать в server.js
   // const steamBot = getSteamBot();
   ```

3. **Восстановить Share Code UI:**
   - Вернуть input для Share Code
   - Восстановить обработчики `handleSubmitShareCode`

## FAQ

### Q: Можно ли использовать оба подхода одновременно?
**A:** Да, они совместимы. Старые матчи из Share Code останутся, новые будут через бота.

### Q: Что если бот офлайн?
**A:** Матчи синхронизируются автоматически при следующем подключении.

### Q: Сколько матчей загружается?
**A:** Последние 8 матчей при добавлении, новые каждые 5 минут.

### Q: Нужно ли удалять бота из друзей потом?
**A:** Нет, держите его в друзьях для постоянной синхронизации.

### Q: Работает ли бот для всех режимов?
**A:** Да: Competitive, Premier, Wingman.

## Известные проблемы

### Rate Limit
При частых перезапусках контейнера Steam может заблокировать вход на 30-60 минут.

**Решение:** Используйте volume `steam_sentry` для сохранения credentials.

### Steam Guard
При первом входе требуется код из email.

**Решение:** Добавьте `STEAM_GUARD_CODE` в docker-compose.yml временно.

### GC Timeout
Game Coordinator иногда отвечает медленно (10-30 секунд).

**Решение:** Бот автоматически повторяет запрос через 5 минут.

## Поддержка

Если возникли проблемы:

1. **Проверьте логи:**
   ```bash
   docker logs errorparty_backend --tail 100 | grep -E "Steam|Bot|GC"
   ```

2. **Проверьте статус бота:**
   ```bash
   curl https://errorparty.ru/api/cs2/bot/status
   ```

3. **Свяжитесь с поддержкой:**
   - Discord: [Server Link]
   - Email: admin@errorparty.ru
   - GitHub Issues: [Repository Link]

---

**Последнее обновление:** 23 ноября 2025  
**Статус миграции:** ✅ Завершена  
**Обратная совместимость:** ✅ Сохранена
