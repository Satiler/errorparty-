# 🚀 Установка Steam Match History Parser

## Шаги установки

### 1. Обновить зависимости (если нужно)

```bash
cd backend
npm install cheerio@^1.0.0-rc.12
```

### 2. Тестовый запуск

```bash
# Простой тест парсера
node test-steam-parser.js
```

Этот скрипт:
- Получит последние 5 матчей
- Покажет статистику
- Выведет доступные типы матчей

### 3. Получение истории матчей

```bash
# Получить последние 10 матчей
node fetch-steam-matches.js 76561198306468078 --max 10

# Получить все доступные матчи
node fetch-steam-matches.js Satile --all

# Сохранить в базу данных (замените userId на ваш)
node fetch-steam-matches.js 76561198306468078 --save --userId 1 --max 50
```

### 4. Проверка API endpoints

После запуска сервера (`npm start` или `npm run dev`):

```bash
# Получить историю матчей (нужен Bearer token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/cs2/steam-history/76561198306468078?maxMatches=10"

# Синхронизировать с БД
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxMatches": 50}' \
  http://localhost:3001/api/cs2/steam-history/sync
```

## ✅ Что должно работать

После установки у вас есть:

1. **CLI скрипт** (`fetch-steam-matches.js`)
   - Получение матчей из Steam
   - Сохранение в БД
   - Различные форматы вывода

2. **API endpoints**
   - `GET /api/cs2/steam-history/:steamId` - получить историю
   - `POST /api/cs2/steam-history/sync` - синхронизировать

3. **Сервис** (`steamMatchHistoryParser`)
   - Парсинг HTML страниц Steam
   - Извлечение статистики
   - Определение результатов

## 🔧 Структура созданных файлов

```
backend/
├── src/
│   ├── services/
│   │   └── steamMatchHistoryParser.js      # ✨ Основной сервис парсера
│   ├── controllers/
│   │   └── cs2Controller.js                # ✨ Добавлены методы API
│   └── routes/
│       └── cs2.js                          # ✨ Добавлены routes
├── fetch-steam-matches.js                  # ✨ CLI скрипт
├── test-steam-parser.js                    # ✨ Тестовый скрипт
└── package.json                            # ✨ Обновлен cheerio

Документация:
├── STEAM_MATCH_HISTORY_GUIDE.md            # Полная документация
├── STEAM_PARSER_README.md                  # Quick Start
└── INSTALLATION.md                         # Эта инструкция
```

## 🎯 Примеры использования

### 1. Тест парсера (проще всего)

```bash
node test-steam-parser.js
```

Результат:
```
🧪 Testing Steam Match History Parser

📊 Fetching matches for Steam ID: 76561198306468078
✅ Successfully parsed 5 matches

📍 Match #1
──────────────────────────────────────────────────────────
  Map: Премьер-режим Mirage
  Date: 2025-11-09T22:14:17.000Z
  Score: 13 : 2
  Ranked: Yes
  Duration: 21:24
  Players: 10

  👤 Your Stats:
     K/D/A: 9/14/1
     MVPs: 1
     HS%: 11%
     Score: 19
     Result: ❌ LOSS
```

### 2. Получить последние матчи

```bash
node fetch-steam-matches.js 76561198306468078
```

### 3. Сохранить в базу данных

```bash
# Сначала узнайте свой userId из базы данных
node list-users.js

# Затем запустите синхронизацию
node fetch-steam-matches.js 76561198306468078 --save --userId 1 --max 50
```

### 4. Использование в коде

```javascript
const steamMatchHistoryParser = require('./src/services/steamMatchHistoryParser');

async function example() {
  // Получить матчи
  const result = await steamMatchHistoryParser.parseMatchHistory(
    '76561198306468078',
    { maxMatches: 10 }
  );
  
  console.log(`Найдено матчей: ${result.matches.length}`);
  
  // Показать статистику каждого матча
  for (const match of result.matches) {
    const userStats = steamMatchHistoryParser.getUserMatchStats(
      match, 
      '76561198306468078'
    );
    
    const won = steamMatchHistoryParser.determineMatchResult(
      match,
      '76561198306468078'
    );
    
    console.log(`${match.mapName}: ${won ? 'WIN' : 'LOSS'} - ${userStats.kills}/${userStats.deaths}/${userStats.assists}`);
  }
}
```

## 🐛 Troubleshooting

### Ошибка: "Cannot find module 'cheerio'"

```bash
npm install cheerio@^1.0.0-rc.12
```

### Ошибка: "Failed to fetch match history"

Причины:
1. Профиль Steam приватный → Сделайте публичным
2. Неверный Steam ID → Проверьте ID
3. Steam недоступен → Попробуйте позже

### Ошибка: "User with ID X not found"

При использовании `--save` убедитесь что:
1. Пользователь существует в БД
2. userId указан правильно

Проверить пользователей:
```bash
node list-users.js
```

## 📝 Следующие шаги

1. **Протестируйте** парсер с вашим Steam ID:
   ```bash
   node test-steam-parser.js
   ```

2. **Получите историю** через CLI:
   ```bash
   node fetch-steam-matches.js YOUR_STEAM_ID --max 20
   ```

3. **Интегрируйте** в ваше приложение через API

4. **Настройте автоматизацию** (опционально):
   ```bash
   # Добавить в crontab для регулярной синхронизации
   0 3 * * * cd /path/to/backend && node fetch-steam-matches.js YOUR_STEAM_ID --save --userId 1 --max 50
   ```

## ✨ Готово!

Система готова к использованию. Запустите `node test-steam-parser.js` для проверки.

Если возникли вопросы - смотрите полную документацию в `STEAM_MATCH_HISTORY_GUIDE.md`.
