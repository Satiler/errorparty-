# 🎮 CS2 Auto-Sync Setup Guide

## Быстрый старт

### 1. Установка зависенций

```bash
cd backend
npm install node-cron
```

Опционально для полного парсинга demo-файлов:
```bash
npm install demofile2 seek-bzip unbzip2-stream
```

### 2. Применение миграции БД

```bash
# Через Docker
docker exec errorparty_db psql -U postgres -d errorparty -f /migrations/add-cs2-auto-sync.sql

# Или напрямую
psql -U postgres -d errorparty -f backend/migrations/add-cs2-auto-sync.sql
```

### 3. Настройка переменных окружения

Добавьте в `.env`:
```env
# Путь для хранения demo-файлов (опционально)
CS2_DEMO_PATH=/app/demos

# Steam API Key (уже должен быть настроен)
STEAM_API_KEY=your_steam_api_key
```

### 4. Создание директории для demo

```bash
mkdir -p backend/demos
chmod 755 backend/demos
```

### 5. Перезапуск сервера

```bash
# Development
npm run dev

# Production
docker-compose restart backend
```

## Использование

### Для пользователей

1. **Получение Authentication Token**:
   - Перейти на https://help.steampowered.com/ru/wizard/HelpWithGameIssue/?appid=730&issueid=128
   - Войти в Steam аккаунт
   - Скопировать "Код аутентификации игрока"

2. **Привязка токена**:
   - Открыть профиль CS2 на сайте
   - Нажать "Настроить" в разделе "Автоматическая загрузка матчей"
   - Вставить токен и нажать "Привязать токен"

3. **Автоматическая синхронизация**:
   - Матчи синхронизируются автоматически каждые 6 часов
   - Можно запустить вручную кнопкой "Синхронизировать сейчас"

4. **Загрузка demo-файлов** (опционально):
   - В истории матчей нажать "Скачать demo"
   - Система загрузит и распарсит demo-файл
   - Детальная статистика появится в профиле матча

### Для администраторов

**Проверка статуса cron job**:
```bash
# Через логи
docker-compose logs -f backend | grep "CS2 auto-sync"
```

**Ручной запуск синхронизации через API**:
```bash
curl -X POST http://localhost:3000/api/cs2/sync/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Проверка статуса синхронизации**:
```bash
curl http://localhost:3000/api/cs2/sync/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Очистка старых demo-файлов**:
```javascript
// В консоли Node.js
const cs2DemoDownloadService = require('./src/services/cs2DemoDownloadService');
await cs2DemoDownloadService.cleanupOldDemos(30); // Старше 30 дней
```

## Настройка расписания

По умолчанию cron запускается каждые 6 часов. Для изменения отредактируйте:

```javascript
// backend/src/services/cs2AutoSyncCron.js
// Формат: секунды минуты часы дни месяцы дни_недели

// Каждые 6 часов (по умолчанию)
this.syncTask = cron.schedule('0 */6 * * *', ...);

// Каждый час
this.syncTask = cron.schedule('0 * * * *', ...);

// Каждые 30 минут
this.syncTask = cron.schedule('*/30 * * * *', ...);

// Каждый день в 3:00
this.syncTask = cron.schedule('0 3 * * *', ...);
```

## Мониторинг

### Логи синхронизации

```bash
# Через Docker
docker-compose logs -f backend | grep "CS2"

# Будут показаны:
# 🔄 Starting CS2 auto-sync for all users...
# 👤 Syncing matches for username (steamId)...
# ✅ Sync completed for username: 5 new matches
# 📊 Sync Summary:
```

### Статистика в БД

```sql
-- Количество пользователей с токенами
SELECT COUNT(*) FROM users WHERE cs2_auth_token IS NOT NULL;

-- Статистика по источникам матчей
SELECT source, COUNT(*) 
FROM cs2_matches 
GROUP BY source;

-- Статус demo-файлов
SELECT status, COUNT(*) 
FROM cs2_demos 
GROUP BY status;

-- Последние синхронизированные матчи
SELECT u.username, cm.*, cd.status as demo_status
FROM cs2_matches cm
JOIN users u ON cm.user_id = u.id
LEFT JOIN cs2_demos cd ON cd.match_id = cm.id
WHERE cm.source = 'auto_sync'
ORDER BY cm.created_at DESC
LIMIT 10;
```

## Решение проблем

### Синхронизация не работает

1. **Проверьте, что cron запущен**:
   ```bash
   docker-compose logs backend | grep "CS2 auto-sync cron job started"
   ```

2. **Проверьте наличие пользователей с токенами**:
   ```sql
   SELECT username, cs2_auth_token IS NOT NULL as has_token, cs2_token_linked_at 
   FROM users 
   WHERE cs2_auth_token IS NOT NULL;
   ```

3. **Проверьте логи на ошибки**:
   ```bash
   docker-compose logs backend | grep -i error | grep -i cs2
   ```

### Demo-файлы не загружаются

1. **Проверьте права доступа к директории**:
   ```bash
   ls -la backend/demos/
   chmod 755 backend/demos/
   ```

2. **Проверьте доступность серверов Valve**:
   ```bash
   curl -I https://replay0.valve.net/
   ```

3. **Demo может быть недоступен** - Valve хранит demo ~30 дней

### Steam API ошибки

1. **Rate limiting** - Steam ограничивает запросы. Увеличьте задержки между запросами:
   ```javascript
   // В cs2AutoSyncCron.js
   await this.sleep(5000); // 5 секунд между пользователями
   ```

2. **Недействительный токен**:
   - Пользователю нужно получить новый токен
   - Токены могут истекать

## Производительность

### Оптимизация хранения

- Demo-файлы могут занимать 50-200 MB каждый
- Рекомендуется регулярная очистка старых файлов
- Используйте SSD для быстрого парсинга

### Очистка старых demo

Добавьте в cron (опционально):
```javascript
// В cs2AutoSyncCron.js, в методе start()
cron.schedule('0 2 * * 0', async () => {
  // Каждое воскресенье в 2:00
  await cs2DemoDownloadService.cleanupOldDemos(30);
});
```

### Ограничение загрузок

```javascript
// В cs2DemoDownloadService.js
this.maxConcurrentDownloads = 3; // Одновременных загрузок
```

## Дальнейшее развитие

### Полный парсинг demo-файлов

Для получения детальной статистики установите:
```bash
npm install demofile2
```

И раскомментируйте код в `cs2DemoParserService.js`:
```javascript
const DemoFile = require('demofile');
// ... реализация парсинга
```

### Webhook уведомления

Добавьте в конце синхронизации:
```javascript
// Отправка уведомлений в Discord/Telegram
await sendNotification({
  user: user.username,
  newMatches: result.stats.newMatches
});
```

### API для сторонних сервисов

Создайте публичный endpoint:
```javascript
router.get('/api/public/cs2/user/:steamId/matches', ...);
```

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs backend`
2. Проверьте БД: подключитесь к PostgreSQL
3. Проверьте сетевой доступ к Steam API
4. Обратитесь к документации: `docs/CS2_AUTO_SYNC.md`
