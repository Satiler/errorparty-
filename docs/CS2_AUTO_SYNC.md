# CS2 Match Auto-Sync System

## 🎯 Обзор

Система автоматической загрузки и анализа матчей CS2, аналогичная SCOPE.GG. Позволяет автоматически собирать историю матчей игрока, скачивать демо-файлы и извлекать детальную статистику.

## 🔧 Как это работает

### 1. Привязка Authentication Token

Пользователь получает Authentication Token (код аутентификации) из Steam:
- Переход на страницу поддержки: `https://help.steampowered.com/ru/wizard/HelpWithGameIssue/?appid=730&issueid=128`
- Авторизация в Steam
- Копирование Authentication Token из раздела "Код аутентификации игрока"

Token привязывается к аккаунту пользователя и хранится в базе данных.

### 2. Автоматическая синхронизация

**Cron Job** (`cs2AutoSyncCron.js`):
- Запускается каждые 6 часов автоматически
- Находит всех пользователей с привязанным токеном
- Для каждого пользователя запускает синхронизацию матчей

**Процесс синхронизации** (`cs2MatchSyncService.js`):
1. Получение списка новых матчей (через Share Codes или Steam API)
2. Проверка на дубликаты в базе данных
3. Декодирование Share Code для получения Match ID, Outcome ID, Token ID
4. Создание записи матча в базе данных

### 3. Загрузка Demo-файлов

**Demo Download Service** (`cs2DemoDownloadService.js`):
- Формирует URL демо-файла: `https://replay{cluster}.valve.net/730/{matchId}_{outcomeId}_{tokenId}.dem.bz2`
- Перебирает кластеры (0-255) для поиска файла
- Скачивает и сохраняет демо-файл локально
- Обновляет статус в базе данных

### 4. Парсинг Demo-файлов

**Demo Parser Service** (`cs2DemoParserService.js`):
- Парсит демо-файл с помощью библиотеки (например, `demofile2`)
- Извлекает детальную статистику:
  - Киллы, смерти, ассисты
  - Хедшоты, урон
  - Клатчи (1v1, 1v2, 1v3, 1v4, 1v5)
  - Мультикиллы (3K, 4K, 5K)
  - Карта, раунды, экономика
  - Позиции, тайминги, использование гранат
- Обновляет запись матча с детальной статистикой

## 📊 Архитектура

```
┌─────────────────────────────────────────────┐
│              Frontend (React)                │
│  ┌──────────────────────────────────────┐  │
│  │     CS2StatsPage.jsx                 │  │
│  │  ┌──────────────────────────────┐   │  │
│  │  │   CS2SyncStatus.jsx          │   │  │
│  │  │  - Статус синхронизации      │   │  │
│  │  │  - Ручной запуск синхр.      │   │  │
│  │  └──────────────────────────────┘   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│         Backend API (Express)               │
│  ┌──────────────────────────────────────┐  │
│  │      Routes (/api/cs2)               │  │
│  │  - POST /auth/link                   │  │
│  │  - POST /sync/trigger                │  │
│  │  - GET  /sync/status                 │  │
│  │  - POST /match/:id/demo/download     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │      Controllers                      │  │
│  │  - linkAuthToken()                   │  │
│  │  - triggerSync()                     │  │
│  │  - getSyncStatus()                   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              Services                        │
│  ┌──────────────────────────────────────┐  │
│  │   cs2AutoSyncCron.js                 │  │
│  │   ⏰ Каждые 6 часов                   │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   cs2MatchSyncService.js             │  │
│  │   📥 Синхронизация матчей             │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   cs2DemoDownloadService.js          │  │
│  │   ⬇️  Загрузка demo-файлов            │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   cs2DemoParserService.js            │  │
│  │   📊 Парсинг статистики               │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│            Database (PostgreSQL)             │
│  ┌──────────────────────────────────────┐  │
│  │   users                              │  │
│  │   - cs2_auth_token                   │  │
│  │   - cs2_token_linked_at              │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   cs2_matches                        │  │
│  │   - share_code, match_id             │  │
│  │   - kills, deaths, assists           │  │
│  │   - source (auto_sync, share_code)   │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   cs2_demos                          │  │
│  │   - demo_url, file_path              │  │
│  │   - status (pending, downloaded,     │  │
│  │     parsing, parsed, failed)         │  │
│  │   - parsed_data (JSON)               │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 🗃️ Модели данных

### User Model
```javascript
cs2AuthToken: STRING        // Authentication token от Steam
cs2TokenLinkedAt: DATE     // Дата привязки токена
```

### CS2Match Model
```javascript
userId: INTEGER
shareCode: STRING          // CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
matchId: STRING           // Декодированный ID матча
outcomeId: STRING         // Декодированный ID результата
tokenId: INTEGER          // Декодированный ID токена
kills, deaths, assists    // Базовая статистика
headshots, damage, mvps
clutch1v1, clutch1v2, ... // Клатчи
kills3k, kills4k, kills5k // Мультикиллы
source: ENUM              // auto_sync, share_code, demo_parser, gsi
playedAt: DATE
```

### CS2Demo Model
```javascript
matchId: INTEGER          // Связь с CS2Match
shareCode: STRING
demoUrl: STRING          // URL на сервере Valve
cluster: INTEGER         // Номер кластера (0-255)
filePath: STRING         // Локальный путь к файлу
fileSize: INTEGER
status: ENUM             // pending, downloading, downloaded,
                        // parsing, parsed, failed, expired
parsedData: JSON        // Полная статистика из демо
mapName: STRING
duration: INTEGER
downloadedAt: DATE
parsedAt: DATE
```

## 🔌 API Endpoints

### Привязка токена
```
POST /api/cs2/auth/link
Body: { "authToken": "YOUR_TOKEN_HERE" }
Response: { "success": true, "linkedAt": "2025-11-22T..." }
```

### Отвязка токена
```
POST /api/cs2/auth/unlink
Response: { "success": true }
```

### Ручной запуск синхронизации
```
POST /api/cs2/sync/trigger
Response: {
  "success": true,
  "stats": {
    "newMatches": 5,
    "skippedMatches": 10,
    "failedMatches": 0,
    "totalMatches": 150
  }
}
```

### Статус синхронизации
```
GET /api/cs2/sync/status
Response: {
  "success": true,
  "hasAuthToken": true,
  "tokenLinkedAt": "2025-11-22T...",
  "stats": {
    "total": 150,
    "fromAutoSync": 100,
    "fromShareCode": 50,
    "fromGSI": 0,
    "lastSync": "2025-11-22T..."
  }
}
```

### Загрузка demo для матча
```
POST /api/cs2/match/:matchId/demo/download
Response: {
  "success": true,
  "demo": { "id": 123, "status": "pending" }
}
```

### Статус demo
```
GET /api/cs2/match/:matchId/demo/status
Response: {
  "status": "downloaded",
  "downloadedAt": "2025-11-22T...",
  "parsedAt": null,
  "fileSize": 123456789
}
```

## ⚙️ Настройка

### Переменные окружения
```env
# Путь для хранения demo-файлов
CS2_DEMO_PATH=/path/to/demos

# Steam API Key
STEAM_API_KEY=your_steam_api_key
```

### Установка зависимостей
```bash
cd backend
npm install node-cron axios
# Для парсинга демо-файлов (опционально):
npm install demofile2
```

### Создание таблиц
```sql
-- Добавить поля в users
ALTER TABLE users ADD COLUMN cs2_auth_token VARCHAR(255);
ALTER TABLE users ADD COLUMN cs2_token_linked_at TIMESTAMP;

-- Создать таблицу cs2_demos
CREATE TABLE cs2_demos (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES cs2_matches(id),
  share_code VARCHAR(255) NOT NULL,
  demo_url VARCHAR(500),
  cluster INTEGER,
  file_path VARCHAR(500),
  file_size INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  downloaded_at TIMESTAMP,
  parsed_at TIMESTAMP,
  parse_error TEXT,
  parsed_data JSONB,
  map_name VARCHAR(100),
  duration INTEGER,
  tick_rate INTEGER,
  server_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cs2_demos_match_id ON cs2_demos(match_id);
CREATE INDEX idx_cs2_demos_status ON cs2_demos(status);
```

## 🚀 Запуск

Cron job запускается автоматически при старте сервера:

```javascript
// backend/src/server.js
const cs2AutoSyncCron = require('./services/cs2AutoSyncCron');
cs2AutoSyncCron.start();
```

## 📝 Ограничения Steam API

⚠️ **Важно**: Valve не предоставляет публичный API для получения списка матчей по Authentication Token.

**Текущие решения**:
1. ✅ Ручное добавление матчей через Share Code
2. ✅ Автоматическая загрузка demo-файлов
3. ✅ Парсинг статистики из demo
4. 🔄 GSI (Game State Integration) для real-time трекинга
5. ❌ Прямой API для enumeration матчей (недоступен)

**Альтернативы**:
- Использование unofficial/undocumented API (риск бана)
- Сотрудничество с Valve для доступа к API
- Использование сторонних сервисов парсинга

## 🔮 Будущие улучшения

1. **Demo парсинг**:
   - Интеграция с библиотекой `demofile2`
   - Полный анализ позиций и таймингов
   - Экстракция хайлайтов и ошибок

2. **Расширенная статистика**:
   - Heatmaps позиций
   - Траектории гранат
   - Экономический анализ
   - Анализ стиля игры

3. **Уведомления**:
   - Push-уведомления о новых матчах
   - Email-отчеты о прогрессе
   - Telegram bot интеграция

4. **Оптимизация**:
   - Кэширование demo-файлов
   - Параллельная обработка
   - CDN для демо-файлов

## 📚 Дополнительные ресурсы

- [CS2 Share Code Format](https://github.com/akiver/cs2-sharecode)
- [Demo File Format](https://github.com/saul/demofile)
- [Steam Web API Documentation](https://developer.valvesoftware.com/wiki/Steam_Web_API)
