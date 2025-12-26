# 🚀 Руководство по развёртыванию системы автообновления

## Шаг 1: Подготовка окружения

### 1.1 Требования
- Node.js >= 16.x
- PostgreSQL >= 13.x
- Redis >= 6.x (опционально, для кеширования)
- PM2 (для production)

### 1.2 Установка зависимостей системы

```bash
# Установка PostgreSQL (Windows)
# Скачайте с https://www.postgresql.org/download/windows/

# Установка Redis (Windows)
# Скачайте с https://github.com/microsoftarchive/redis/releases
# Или используйте WSL/Docker

# Установка PM2
npm install -g pm2
```

## Шаг 2: Настройка базы данных

### 2.1 Создание базы данных

```sql
CREATE DATABASE music_db;
CREATE USER music_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE music_db TO music_user;
```

### 2.2 Применение миграций

```bash
cd backend/auto-update
npm install
npm run migrate
```

### 2.3 Проверка таблиц

```sql
\c music_db
\dt

-- Должны быть созданы таблицы:
-- listening_history, user_favorites, playlist_pending_changes,
-- user_artist_tracking, import_logs, chart_history, user_notifications
```

## Шаг 3: Получение API ключей

### 3.1 Spotify API

1. Перейдите на https://developer.spotify.com/dashboard
2. Создайте приложение
3. Получите Client ID и Client Secret
4. Добавьте в `.env`:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

### 3.2 Apple Music API

1. Зарегистрируйтесь в Apple Developer Program
2. Создайте MusicKit API Key
3. Получите Team ID, Key ID и Private Key
4. Добавьте в `.env`:
   ```
   APPLE_TEAM_ID=your_team_id
   APPLE_KEY_ID=your_key_id
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

### 3.3 Shazam API (RapidAPI)

1. Зарегистрируйтесь на https://rapidapi.com
2. Подпишитесь на Shazam API
3. Получите API Key
4. Добавьте в `.env`:
   ```
   SHAZAM_API_KEY=your_rapidapi_key
   ```

## Шаг 4: Конфигурация

### 4.1 Основной .env файл

Создайте `backend/auto-update/.env`:

```env
# Database
DATABASE_URL=postgresql://music_user:your_password@localhost:5432/music_db

# Redis (опционально)
REDIS_HOST=localhost
REDIS_PORT=6379

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Apple Music
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Shazam (RapidAPI)
SHAZAM_API_KEY=your_rapidapi_key

# kissvk
KISSVK_API_URL=https://kissvk.com/api

# Storage
MUSIC_STORAGE_PATH=d:/МОЙ САЙТ/uploads/music
CDN_URL=https://yourdomain.com/uploads/music

# Server
AUTO_UPDATE_PORT=3001
NODE_ENV=production

# Уведомления (опционально)
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_BOT_TOKEN=your_bot_token
```

### 4.2 Настройка расписания

Отредактируйте `config/charts-config.js`:

```javascript
updateSchedule: {
  enabled: true,
  cronExpression: '0 3 * * *', // Измените время по необходимости
  timezone: 'Europe/Moscow'
}
```

### 4.3 Настройка весов источников

```javascript
sourceWeights: {
  spotify: 0.30,      // Настройте веса
  appleMusic: 0.25,
  billboard: 0.25,
  shazam: 0.20
}
```

## Шаг 5: Тестирование

### 5.1 Тестовый запуск

```bash
cd backend/auto-update
npm run dev
```

### 5.2 ПроверкаHealth Check

```bash
curl http://localhost:3001/health
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "scheduler": {
    "isRunning": true,
    "tasks": [...]
  },
  "timestamp": "..."
}
```

### 5.3 Ручной запуск задач

```bash
# Обновление плейлистов
curl -X POST http://localhost:3001/api/auto-update/tasks/charts-update/run

# Импорт с kissvk
curl -X POST http://localhost:3001/api/auto-update/tasks/kissvk-import/run
```

## Шаг 6: Настройка Frontend

### 6.1 Установка компонентов

Компоненты уже созданы в:
- `frontend/src/components/admin/PendingChangesManager.jsx`
- `frontend/src/components/TrendingPlaylists.jsx`

### 6.2 Интеграция в роутинг

```javascript
// frontend/src/App.jsx
import TrendingPlaylists from './components/TrendingPlaylists';
import PendingChangesManager from './components/admin/PendingChangesManager';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TrendingPlaylists userId={userId} />} />
        <Route path="/admin/pending-changes" element={<PendingChangesManager />} />
      </Routes>
    </Router>
  );
}
```

### 6.3 Настройка axios

```javascript
// frontend/src/config/api.js
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3001';
// Или ваш production URL
```

## Шаг 7: Production развёртывание

### 7.1 Настройка PM2

Создайте `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'auto-update-system',
    script: './backend/auto-update/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      AUTO_UPDATE_PORT: 3001
    },
    error_file: './logs/auto-update-error.log',
    out_file: './logs/auto-update-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 7.2 Запуск через PM2

```bash
# Запуск
pm2 start ecosystem.config.js

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs auto-update-system

# Автозапуск при перезагрузке
pm2 startup
pm2 save
```

### 7.3 Nginx конфигурация (опционально)

```nginx
# /etc/nginx/sites-available/auto-update
server {
    listen 80;
    server_name yourdomain.com;

    location /api/auto-update {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Шаг 8: Мониторинг

### 8.1 Логи

```bash
# PM2 логи
pm2 logs auto-update-system

# Файловые логи
tail -f backend/auto-update/logs/playlist-updates.log
tail -f backend/auto-update/logs/kissvk-imports.log
```

### 8.2 Метрики PM2

```bash
pm2 monit
```

### 8.3 Алерты

Настройте уведомления в конфигурации:

```javascript
// config/charts-config.js
logging: {
  enabled: true,
  notifyAdmins: true,
  emailRecipients: ['admin@yourdomain.com']
}
```

## Шаг 9: Резервное копирование

### 9.1 База данных

```bash
# Создание бэкапа
pg_dump -U music_user -d music_db > backup_$(date +%Y%m%d).sql

# Восстановление
psql -U music_user -d music_db < backup_20251205.sql
```

### 9.2 Автоматические бэкапы

Добавьте в crontab:

```bash
# Ежедневный бэкап в 2:00
0 2 * * * pg_dump -U music_user -d music_db > /backups/music_db_$(date +\%Y\%m\%d).sql
```

## Шаг 10: Обслуживание

### 10.1 Обновление зависимостей

```bash
cd backend/auto-update
npm update
npm audit fix
```

### 10.2 Очистка старых данных

Система автоматически очищает старые данные каждое воскресенье в 2:00.

Ручная очистка:
```bash
curl -X POST http://localhost:3001/api/auto-update/tasks/cleanup/run
```

### 10.3 Проверка состояния

```bash
# Статус планировщика
curl http://localhost:3001/api/auto-update/status

# Pending changes
curl http://localhost:3001/api/auto-update/pending-changes
```

## 🔧 Troubleshooting

### Проблема: Планировщик не запускается

```bash
# Проверьте логи
pm2 logs auto-update-system --lines 100

# Проверьте переменные окружения
pm2 env 0
```

### Проблема: Ошибки API

```javascript
// Проверьте конфигурацию
const config = require('./config/charts-config');
console.log(config);

// Тест Spotify API
const spotifyService = require('./services/spotify-charts.service');
await spotifyService.getTopTracks('global', 10);
```

### Проблема: База данных недоступна

```bash
# Проверьте подключение
psql -U music_user -d music_db -c "SELECT 1"

# Проверьте строку подключения в .env
echo $DATABASE_URL
```

## 📞 Поддержка

- Email: support@yourdomain.com
- Telegram: @your_support_channel
- GitHub Issues: https://github.com/yourrepo/issues

## ✅ Контрольный список развёртывания

- [ ] PostgreSQL установлен и настроен
- [ ] Redis установлен (опционально)
- [ ] Все API ключи получены
- [ ] Файл .env создан и заполнен
- [ ] Миграции применены
- [ ] Зависимости установлены
- [ ] Тестовый запуск успешен
- [ ] PM2 настроен
- [ ] Frontend компоненты интегрированы
- [ ] Nginx настроен (если используется)
- [ ] Мониторинг настроен
- [ ] Резервное копирование настроено
- [ ] Документация изучена

🎉 **Поздравляем! Система автообновления плейлистов готова к работе!**
