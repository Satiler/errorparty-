# CS2 Demo Parser

## Обзор

Парсер CS2 демо-файлов на основе библиотеки [demofile](https://github.com/saul/demofile).

## Функции

- ✅ Парсинг демо-файлов CS2/CSGO
- ✅ Извлечение детальной статистики игроков (K/D/A, HS%, ADR)
- ✅ Обработка раундов и событий
- ✅ Определение мультикиллов (3k, 4k, 5k)
- ✅ Трекинг MVP и урона
- ✅ Автоматическая загрузка демо с серверов Valve
- ✅ Очередь парсинга с ограничением параллельных операций

## Установка

```bash
npm install demofile
```

## Использование

### 1. Автоматическая загрузка и парсинг

```javascript
const cs2DemoDownloadService = require('./services/cs2DemoDownloadService');
const cs2DemoParserService = require('./services/cs2DemoParserService');

// Скачать демо по share code
await cs2DemoDownloadService.queueDownload(matchId, shareCode);

// Парсить демо (автоматически ждёт загрузки)
const parsedData = await cs2DemoParserService.queueParsing(demoId);
```

### 2. Прямой парсинг локального файла

```bash
# Тестовый скрипт для проверки библиотеки
node backend/test-demofile-lib.js path/to/demo.dem

# Тестовый парсер с базой данных
node backend/test-demo-parser.js <demo-id>
```

## Структура данных

### Parsed Data Schema

```javascript
{
  matchInfo: {
    mapName: 'de_dust2',
    duration: 2456,           // секунды
    tickRate: 64,
    serverType: 'matchmaking'
  },
  teams: {
    ct: { score: 13, players: [] },
    t: { score: 16, players: [] }
  },
  rounds: [
    {
      roundNumber: 1,
      startTick: 12800,
      endTick: 25600,
      winnerTeam: 'T',
      kills: [...],
      damage: [...]
    }
  ],
  players: {
    '76561198123456789': {
      name: 'Player1',
      steamId: '76561198123456789',
      team: 'CT',
      kills: 24,
      deaths: 18,
      assists: 5,
      headshots: 12,
      damage: 2450,
      mvps: 3,
      multikills: { '3k': 2, '4k': 1, '5k': 0 }
    }
  }
}
```

## События

Библиотека `demofile` поддерживает следующие события:

### Game Events
- `player_death` - убийство игрока
- `player_hurt` - урон игроку
- `round_start` - начало раунда
- `round_officially_ended` - официальное завершение раунда
- `round_mvp` - выбор MVP раунда
- `bomb_planted` - установка бомбы
- `bomb_defused` - разминирование бомбы
- `weapon_fire` - выстрел
- `grenade_thrown` - бросок гранаты

### Parser Events
- `start` - начало парсинга (доступ к header)
- `end` - завершение парсинга
- `tickstart` - начало обработки тика
- `tickend` - конец обработки тика

## API

### CS2DemoDownloadService

```javascript
// Инициализация
await cs2DemoDownloadService.init();

// Добавить в очередь загрузки
await cs2DemoDownloadService.queueDownload(matchId, shareCode, authCode);

// Проверить статус
const status = await cs2DemoDownloadService.getDownloadStatus(demoId);
```

### CS2DemoParserService

```javascript
// Добавить в очередь парсинга
await cs2DemoParserService.queueParsing(demoId);

// Парсить сразу
const parsedData = await cs2DemoParserService.parseDemo(demoId);

// Проверить статус
const status = await cs2DemoParserService.getParsingStatus(demoId);
```

## Статусы Demo

- `pending` - ожидает загрузки
- `downloading` - загружается
- `downloaded` - загружено, готово к парсингу
- `parsing` - парсится
- `parsed` - распарсено
- `unavailable` - демо ещё не доступно на серверах Valve (повтор через 2 часа)
- `failed` - ошибка загрузки/парсинга

## Производительность

- Параллельная загрузка: 3 демо одновременно
- Параллельный парсинг: 2 демо одновременно
- Средняя скорость парсинга: ~30-60 секунд на матч
- Размер демо: 30-100 MB (зависит от длительности)

## Ограничения Valve

- Демо становятся доступны через 1-24 часа после матча
- Демо хранятся на серверах ~30 дней
- Replay кластеры: replay0.valve.net - replay500.valve.net
- Автоматический поиск кластера по matchID

## Troubleshooting

### Demo unavailable

```javascript
// Демо ещё не опубликовано Valve
// Система автоматически повторит через 2 часа
demo.status === 'unavailable'
demo.nextRetryAt // время следующей попытки
```

### Parse errors

```javascript
// Проверить логи
docker-compose logs backend | grep -i "parse\|demo"

// Проверить файл
ls -lh backend/demos/

// Попробовать парсинг вручную
node backend/test-demofile-lib.js backend/demos/demo_123.dem
```

## Примеры

### Получить топ игроков матча

```javascript
const demo = await CS2Demo.findByPk(demoId);
const parsedData = JSON.parse(demo.parsedData);

const topPlayers = Object.entries(parsedData.players)
  .sort((a, b) => b[1].kills - a[1].kills)
  .slice(0, 10);

console.log('Top 10 players:', topPlayers);
```

### Найти раунд с наибольшим количеством убийств

```javascript
const busiestRound = parsedData.rounds
  .reduce((max, round) => 
    round.kills.length > max.kills.length ? round : max
  );

console.log(`Round ${busiestRound.roundNumber}: ${busiestRound.kills.length} kills`);
```

### Рассчитать ADR игрока

```javascript
const player = parsedData.players[steamId];
const adr = player.damage / parsedData.rounds.length;
console.log(`ADR: ${adr.toFixed(2)}`);
```

## Ссылки

- [demofile GitHub](https://github.com/saul/demofile)
- [demofile Documentation](https://saul.github.io/demofile/)
- [CS:GO Game Events](https://wiki.alliedmods.net/Counter-Strike:_Global_Offensive_Events)
- [Valve GOTV Broadcast](https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Broadcast)

## Лицензия

MIT
