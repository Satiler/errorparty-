# Steam Match History Parser - Руководство

## Описание

Система для парсинга истории матчей CS2 со страниц Steam Community и сохранения их в базу данных. Позволяет автоматически получать данные о матчах без необходимости использования Share Code.

## Возможности

- ✅ Парсинг истории матчей со страницы Steam Community
- ✅ Поддержка всех типов матчей (Premier, Competitive, Wingman, и т.д.)
- ✅ Автоматическое определение результата матча (Win/Loss)
- ✅ Извлечение статистики игрока (K/D/A, MVP, HS%)
- ✅ Сохранение матчей в базу данных
- ✅ API endpoints для интеграции с frontend
- ✅ CLI инструмент для ручного использования

## Структура проекта

```
backend/
├── src/
│   ├── services/
│   │   └── steamMatchHistoryParser.js   # Основной парсер
│   ├── controllers/
│   │   └── cs2Controller.js             # API контроллеры
│   └── routes/
│       └── cs2.js                       # API маршруты
└── fetch-steam-matches.js               # CLI скрипт
```

## Использование через CLI

### Основной синтаксис

```bash
node fetch-steam-matches.js <steamIdOrVanity> [options]
```

### Опции

- `--tab <type>` - Тип матчей (по умолчанию: matchhistorypremier)
  - `matchhistorypremier` - Премьер матчи
  - `matchhistorycompetitive` - Соревновательные матчи
  - `matchhistorycompetitivepermap` - Соревновательные по картам
  - `matchhistoryscrimmage` - Схватки
  - `matchhistorywingman` - Wingman
  - `matchhistorycasual` - Казуальные матчи

- `--max <number>` - Максимальное количество матчей (по умолчанию: 50)
- `--all` - Получить все доступные матчи
- `--save` - Сохранить матчи в базу данных
- `--userId <id>` - ID пользователя для сохранения (обязательно с --save)
- `--format <type>` - Формат вывода: table или json (по умолчанию: table)

### Примеры

#### 1. Просмотр последних 10 премьер матчей

```bash
node fetch-steam-matches.js 76561198306468078 --max 10
```

#### 2. Получить все доступные матчи

```bash
node fetch-steam-matches.js Satile --all
```

#### 3. Сохранить матчи в базу данных

```bash
node fetch-steam-matches.js 76561198306468078 --save --userId 1 --max 50
```

#### 4. Получить соревновательные матчи в JSON формате

```bash
node fetch-steam-matches.js Satile --tab matchhistorycompetitive --format json
```

#### 5. Комплексный пример: получить и сохранить все премьер матчи

```bash
node fetch-steam-matches.js 76561198306468078 --tab matchhistorypremier --all --save --userId 1
```

## Использование через API

### 1. Получить историю матчей

**Endpoint:** `GET /api/cs2/steam-history/:steamId`

**Параметры запроса:**
- `tab` - тип матчей (опционально, по умолчанию: matchhistorypremier)
- `maxMatches` - максимальное количество (опционально, по умолчанию: 50)
- `all` - получить все матчи (true/false, опционально)

**Пример запроса:**

```javascript
fetch('/api/cs2/steam-history/76561198306468078?tab=matchhistorypremier&maxMatches=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Пример ответа:**

```json
{
  "success": true,
  "matches": [
    {
      "mapName": "Премьер-режим Mirage",
      "mapImage": "https://...",
      "date": "2025-11-09T22:14:17.000Z",
      "ranked": true,
      "waitTime": "00:12",
      "duration": "21:24",
      "teamAScore": 13,
      "teamBScore": 2,
      "players": [...],
      "userStats": {
        "nickname": "Vex",
        "kills": 9,
        "deaths": 14,
        "assists": 1,
        "mvps": 1,
        "headshotPercentage": 11,
        "score": 19
      },
      "result": "loss"
    }
  ],
  "count": 20,
  "tab": "matchhistorypremier",
  "steamId": "76561198306468078"
}
```

### 2. Синхронизировать матчи с базой данных

**Endpoint:** `POST /api/cs2/steam-history/sync`

**Body параметры:**
- `tab` - тип матчей (опционально)
- `maxMatches` - максимальное количество (опционально)
- `all` - получить все матчи (true/false, опционально)

**Пример запроса:**

```javascript
fetch('/api/cs2/steam-history/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tab: 'matchhistorypremier',
    maxMatches: 50,
    all: false
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Пример ответа:**

```json
{
  "success": true,
  "message": "Match history synced successfully",
  "stats": {
    "total": 50,
    "saved": 35,
    "skipped": 15,
    "errors": 0
  }
}
```

## Интеграция с Frontend

### React пример

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function SteamMatchSync() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const syncMatches = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/cs2/steam-history/sync', {
        tab: 'matchhistorypremier',
        maxMatches: 50
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setResult(response.data);
    } catch (error) {
      console.error('Error syncing matches:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={syncMatches} disabled={loading}>
        {loading ? 'Синхронизация...' : 'Синхронизировать матчи'}
      </button>
      
      {result && (
        <div>
          {result.success ? (
            <div>
              <p>✅ Успешно синхронизировано!</p>
              <ul>
                <li>Всего найдено: {result.stats.total}</li>
                <li>Добавлено новых: {result.stats.saved}</li>
                <li>Пропущено (дубликаты): {result.stats.skipped}</li>
              </ul>
            </div>
          ) : (
            <p>❌ Ошибка: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SteamMatchSync;
```

## Программное использование сервиса

```javascript
const steamMatchHistoryParser = require('./src/services/steamMatchHistoryParser');

// Получить историю матчей
async function getMatches() {
  const result = await steamMatchHistoryParser.parseMatchHistory(
    '76561198306468078',
    {
      tab: 'matchhistorypremier',
      maxMatches: 20
    }
  );
  
  console.log('Найдено матчей:', result.matches.length);
  console.log('Есть еще:', result.hasMore);
  
  // Получить статистику пользователя из матча
  const match = result.matches[0];
  const userStats = steamMatchHistoryParser.getUserMatchStats(
    match, 
    '76561198306468078'
  );
  
  console.log('Статистика:', userStats);
  
  // Определить результат
  const won = steamMatchHistoryParser.determineMatchResult(
    match,
    '76561198306468078'
  );
  
  console.log('Результат:', won ? 'Победа' : 'Поражение');
}

// Получить все матчи (с пагинацией)
async function getAllMatches() {
  const matches = await steamMatchHistoryParser.fetchAllMatchHistory(
    '76561198306468078',
    {
      tab: 'matchhistorypremier',
      maxMatches: 100
    }
  );
  
  console.log('Всего матчей:', matches.length);
}
```

## Доступные типы матчей

```javascript
const types = steamMatchHistoryParser.getAvailableMatchTypes();

// Результат:
[
  { 
    id: 'matchhistorypremier', 
    name: 'Premier Matches', 
    description: 'Ranked Premier mode' 
  },
  { 
    id: 'matchhistorycompetitive', 
    name: 'Competitive Matches', 
    description: 'Standard competitive' 
  },
  // ... и т.д.
]
```

## Структура данных матча

```javascript
{
  // Информация о карте
  mapName: "Премьер-режим Mirage",
  mapImage: "https://steamuserimages-a.akamaihd.net/...",
  
  // Информация о времени
  date: Date, // JavaScript Date object
  
  // Детали матча
  ranked: true,
  waitTime: "00:12",
  duration: "21:24",
  
  // Счет
  teamAScore: 13,
  teamBScore: 2,
  
  // Игроки
  players: [
    {
      nickname: "Vex",
      steamId: "76561198306468078",
      steamProfileUrl: "https://steamcommunity.com/id/Satile",
      avatarUrl: "https://avatars.akamai.steamstatic.com/...",
      ping: 78,
      kills: 9,
      deaths: 14,
      assists: 1,
      mvps: 1,
      headshotPercentage: 11,
      score: 19
    },
    // ... остальные игроки
  ]
}
```

## Ограничения и особенности

1. **Rate Limiting**: Steam может ограничивать частоту запросов. При массовом парсинге используйте задержки между запросами.

2. **Приватность**: Можно парсить только публичные профили. Если профиль приватный, парсинг не сработает.

3. **Дубликаты**: При сохранении в БД система автоматически пропускает дубликаты на основе даты и карты.

4. **Share Codes**: Данный метод НЕ предоставляет Share Code матчей, поэтому детальный парсинг демо недоступен.

5. **Пагинация**: Steam использует continue_token для подгрузки следующих страниц. Система автоматически обрабатывает это.

## Рекомендации

1. **Первичная синхронизация**: При первом запуске используйте `--all` для получения полной истории.

2. **Регулярные обновления**: Для обновлений используйте `--max 20` чтобы получить только последние матчи.

3. **Автоматизация**: Настройте cron job для автоматической синхронизации:
   ```bash
   # Каждый день в 3:00 AM
   0 3 * * * cd /path/to/backend && node fetch-steam-matches.js 76561198306468078 --save --userId 1 --max 50
   ```

4. **Обработка ошибок**: Всегда проверяйте статистику синхронизации на наличие ошибок.

## Troubleshooting

### Ошибка: "Failed to fetch match history"

**Причина**: Профиль может быть приватным или Steam временно недоступен.

**Решение**: 
1. Проверьте, что профиль Steam публичный
2. Попробуйте позже
3. Проверьте интернет соединение

### Ошибка: "User not found in match"

**Причина**: Парсер не может найти пользователя среди игроков матча.

**Решение**: Убедитесь, что указан правильный Steam ID

### Все матчи пропущены (skipped)

**Причина**: Все матчи уже есть в базе данных.

**Решение**: Это нормально, означает что база актуальна

## Дополнительная информация

- Парсер использует библиотеки `axios` и `cheerio`
- Поддерживает как Steam ID64, так и vanity URL
- Автоматически определяет команду игрока и результат матча
- Сохраняет полные данные матча в поле `rawData` для будущего использования

## Поддержка

Если возникли проблемы или вопросы, проверьте:
1. Логи сервера
2. Настройки приватности Steam профиля
3. Корректность Steam ID или vanity URL
