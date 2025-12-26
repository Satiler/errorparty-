# CS2 Advanced Statistics API

Расширенная API для получения детальной статистики CS2, включая:
- **Показатели эффективности игрока** (K/D, ADR, рейтинг HLTV)
- **История матчей** с фильтрами
- **Статистика использования оружия** (точность, урон, хедшоты)
- **Сравнение игроков**
- **Лидерборды**

---

## 📊 Эндпоинты API

### 1. **Показатели эффективности игрока**

**GET** `/api/cs2-stats/performance/:steamId`

Возвращает агрегированные метрики производительности игрока.

**Параметры:**
- `steamId` (path) - Steam ID игрока

**Ответ:**
```json
{
  "success": true,
  "performance": {
    "userId": 123,
    "totalMatches": 150,
    "matchesWon": 85,
    "matchesLost": 65,
    "winrate": 56.67,
    "totalKills": 2340,
    "totalDeaths": 1890,
    "totalAssists": 567,
    "kdRatio": 1.24,
    "adRatio": 0.30,
    "kaRatio": 1.54,
    "totalDamage": 356789,
    "averageDamagePerRound": 78.45,
    "averageDamagePerMatch": 2378.59,
    "totalHeadshots": 987,
    "headshotPercentage": 42.18,
    "totalRounds": 4550,
    "roundsWon": 2567,
    "totalMVPs": 234,
    "total3Kills": 45,
    "total4Kills": 12,
    "total5Kills": 3,
    "totalClutches": 89,
    "clutchesWon": 34,
    "clutchSuccessRate": 38.20,
    "totalEntryKills": 345,
    "entrySuccessRate": 52.50,
    "hltvRating": 1.18,
    "impactRating": 8.45,
    "recentWinrate": 60.00,
    "recentKD": 1.35,
    "recentADR": 82.30,
    "bestKillsInMatch": 35,
    "bestADRInMatch": 115.6,
    "longestWinStreak": 8,
    "currentWinStreak": 3,
    "lastMatchDate": "2025-11-27T10:30:00.000Z",
    "user": {
      "id": 123,
      "steamId": "76561198012345678",
      "username": "Player123",
      "avatar": "https://..."
    }
  }
}
```

**Пример:**
```bash
curl http://localhost:3000/api/cs2-stats/performance/76561198012345678
```

---

### 2. **Статистика использования оружия**

**GET** `/api/cs2-stats/weapons/:steamId`

Возвращает детальную статистику по каждому оружию.

**Параметры:**
- `steamId` (path) - Steam ID игрока
- `weaponType` (query, optional) - Фильтр по типу оружия (rifle, pistol, smg, sniper, shotgun, heavy, grenade, knife)
- `limit` (query, optional) - Количество результатов (по умолчанию все)

**Ответ:**
```json
{
  "success": true,
  "weaponStats": [
    {
      "weaponName": "ak47",
      "weaponType": "rifle",
      "kills": 456,
      "headshots": 198,
      "damage": 45678,
      "deaths": 123,
      "wallbangKills": 12,
      "firstKills": 67,
      "timeUsed": 34560,
      "headshotPercentage": 43.42,
      "accuracy": 24.5,
      "kdRatio": 3.71
    },
    {
      "weaponName": "m4a1",
      "weaponType": "rifle",
      "kills": 389,
      "headshots": 165,
      "damage": 38920,
      "deaths": 98,
      "wallbangKills": 8,
      "firstKills": 54,
      "timeUsed": 28900,
      "headshotPercentage": 42.42,
      "accuracy": 26.3,
      "kdRatio": 3.97
    }
  ],
  "total": 15
}
```

**Примеры:**
```bash
# Вся статистика
curl http://localhost:3000/api/cs2-stats/weapons/76561198012345678

# Только винтовки
curl http://localhost:3000/api/cs2-stats/weapons/76561198012345678?weaponType=rifle

# Топ 5 оружий
curl http://localhost:3000/api/cs2-stats/weapons/76561198012345678?limit=5
```

---

### 3. **История матчей**

**GET** `/api/cs2-stats/matches/:steamId`

Возвращает историю матчей с фильтрами и пагинацией.

**Параметры:**
- `steamId` (path) - Steam ID игрока
- `limit` (query, optional) - Количество матчей (по умолчанию 20)
- `offset` (query, optional) - Смещение для пагинации (по умолчанию 0)
- `map` (query, optional) - Фильтр по карте (de_dust2, de_inferno и т.д.)
- `result` (query, optional) - Фильтр по результату (win, loss)
- `startDate` (query, optional) - Начальная дата (ISO 8601)
- `endDate` (query, optional) - Конечная дата (ISO 8601)

**Ответ:**
```json
{
  "success": true,
  "matches": [
    {
      "id": 1234,
      "userId": 123,
      "kills": 24,
      "deaths": 18,
      "assists": 6,
      "headshots": 10,
      "damage": 2456,
      "mvps": 3,
      "roundsPlayed": 30,
      "roundsWon": 16,
      "isWin": true,
      "map": "de_dust2",
      "adr": 81.87,
      "rating": 1.25,
      "headshotPercentage": 41.67,
      "playedAt": "2025-11-27T10:30:00.000Z",
      "user": {
        "id": 123,
        "steamId": "76561198012345678",
        "username": "Player123",
        "avatar": "https://..."
      }
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

**Примеры:**
```bash
# Последние 20 матчей
curl http://localhost:3000/api/cs2-stats/matches/76561198012345678

# Только победы на Dust2
curl http://localhost:3000/api/cs2-stats/matches/76561198012345678?map=de_dust2&result=win

# Матчи за последнюю неделю
curl "http://localhost:3000/api/cs2-stats/matches/76561198012345678?startDate=2025-11-20T00:00:00Z"

# Пагинация (страница 2, по 10 матчей)
curl http://localhost:3000/api/cs2-stats/matches/76561198012345678?limit=10&offset=10
```

---

### 4. **Лидерборды**

**GET** `/api/cs2-stats/leaderboard`

Возвращает топ игроков по различным критериям.

**Параметры:**
- `criteria` (query, optional) - Критерий сортировки:
  - `rating` - HLTV рейтинг (по умолчанию)
  - `kd` - K/D соотношение
  - `adr` - Средний урон за раунд
  - `winrate` - Винрейт
  - `headshot` - Процент хедшотов
  - `clutch` - Процент выигранных клатчей
  - `impact` - Impact рейтинг
- `limit` (query, optional) - Количество игроков (по умолчанию 50)

**Ответ:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "userId": 123,
      "hltvRating": 1.35,
      "kdRatio": 1.56,
      "winrate": 62.5,
      "averageDamagePerRound": 89.3,
      "totalMatches": 245,
      "user": {
        "id": 123,
        "steamId": "76561198012345678",
        "username": "ProPlayer",
        "avatar": "https://..."
      }
    }
  ],
  "criteria": "rating",
  "total": 50
}
```

**Примеры:**
```bash
# Топ 50 по рейтингу
curl http://localhost:3000/api/cs2-stats/leaderboard

# Топ 10 по K/D
curl http://localhost:3000/api/cs2-stats/leaderboard?criteria=kd&limit=10

# Топ 25 по винрейту
curl http://localhost:3000/api/cs2-stats/leaderboard?criteria=winrate&limit=25
```

---

### 5. **Статистика по типам оружия**

**GET** `/api/cs2-stats/weapon-types/:steamId`

Возвращает агрегированную статистику по типам оружия (винтовки, пистолеты и т.д.).

**Ответ:**
```json
{
  "success": true,
  "weaponTypes": [
    {
      "weaponType": "rifle",
      "totalKills": 1234,
      "totalHeadshots": 567,
      "totalDamage": 156789,
      "totalDeaths": 456,
      "headshotPercentage": 45.95,
      "kdRatio": 2.70,
      "weapons": ["ak47", "m4a1", "aug", "sg556"]
    },
    {
      "weaponType": "pistol",
      "totalKills": 234,
      "totalHeadshots": 89,
      "totalDamage": 23456,
      "totalDeaths": 123,
      "headshotPercentage": 38.03,
      "kdRatio": 1.90,
      "weapons": ["usp_silencer", "glock", "deagle"]
    }
  ]
}
```

---

### 6. **Статистика по картам**

**GET** `/api/cs2-stats/maps/:steamId`

Возвращает статистику игрока на разных картах.

**Ответ:**
```json
{
  "success": true,
  "mapStats": [
    {
      "map": "de_dust2",
      "totalMatches": 45,
      "wins": 28,
      "losses": 17,
      "winrate": 62.22,
      "totalKills": 867,
      "totalDeaths": 678,
      "totalAssists": 234,
      "totalDamage": 67890,
      "kdRatio": 1.28,
      "avgADR": "79.45",
      "bestKills": 32,
      "totalRounds": 1350
    },
    {
      "map": "de_inferno",
      "totalMatches": 38,
      "wins": 22,
      "losses": 16,
      "winrate": 57.89,
      "totalKills": 723,
      "totalDeaths": 589,
      "totalAssists": 198,
      "totalDamage": 54320,
      "kdRatio": 1.23,
      "avgADR": "76.80",
      "bestKills": 28,
      "totalRounds": 1140
    }
  ]
}
```

---

### 7. **Последняя форма (Recent Form)**

**GET** `/api/cs2-stats/recent-form/:steamId`

Возвращает производительность в последних матчах (тренд).

**Параметры:**
- `steamId` (path) - Steam ID игрока
- `limit` (query, optional) - Количество последних матчей (по умолчанию 20)

**Ответ:**
```json
{
  "success": true,
  "recentForm": [
    {
      "matchNumber": 1,
      "id": 1000,
      "playedAt": "2025-11-20T14:30:00.000Z",
      "map": "de_dust2",
      "isWin": true,
      "kills": 22,
      "deaths": 16,
      "assists": 5,
      "damage": 2156,
      "roundsPlayed": 28,
      "adr": 77.0,
      "rating": 1.15,
      "kd": 1.38
    },
    {
      "matchNumber": 2,
      "id": 1001,
      "playedAt": "2025-11-21T10:00:00.000Z",
      "map": "de_inferno",
      "isWin": false,
      "kills": 18,
      "deaths": 21,
      "assists": 4,
      "damage": 1987,
      "roundsPlayed": 30,
      "adr": 66.23,
      "rating": 0.95,
      "kd": 0.86
    }
  ]
}
```

---

### 8. **Сравнение игроков**

**GET** `/api/cs2-stats/compare`

Сравнивает статистику двух игроков.

**Параметры:**
- `steamId1` (query) - Steam ID первого игрока
- `steamId2` (query) - Steam ID второго игрока

**Ответ:**
```json
{
  "success": true,
  "player1": { /* полная статистика игрока 1 */ },
  "player2": { /* полная статистика игрока 2 */ },
  "comparison": {
    "kdRatio": {
      "player1": 1.35,
      "player2": 1.18,
      "winner": "player1"
    },
    "winrate": {
      "player1": 58.5,
      "player2": 62.3,
      "winner": "player2"
    },
    "adr": {
      "player1": 82.4,
      "player2": 78.9,
      "winner": "player1"
    },
    "rating": {
      "player1": 1.25,
      "player2": 1.19,
      "winner": "player1"
    },
    "headshotPercentage": {
      "player1": 43.2,
      "player2": 45.8,
      "winner": "player2"
    }
  }
}
```

**Пример:**
```bash
curl "http://localhost:3000/api/cs2-stats/compare?steamId1=76561198012345678&steamId2=76561198087654321"
```

---

## 🔧 Автоматическое обновление статистики

Статистика обновляется автоматически после каждого матча через `cs2StatsService.updatePlayerPerformance()`:

```javascript
// В контроллере после обработки матча
const cs2StatsService = require('../services/cs2StatsService');

// Обновить статистику игрока
await cs2StatsService.updatePlayerPerformance(userId, matchId);

// Обновить статистику оружия (если есть данные)
if (weaponData) {
  await cs2StatsService.updateWeaponStats(userId, matchId, weaponData);
}
```

---

## 📈 Расчёт метрик

### HLTV Rating 2.0 (упрощённая версия)
```
Rating = 0.0073 * KPR * 100 +
         0.3591 * SurvivalRate * 100 +
        -0.5329 * DeathsPerRound * 100 +
         0.2372 * AssistsPerRound * 100 +
         0.0032 * DamagePerRound

где:
- KPR = Kills Per Round
- SurvivalRate = (Rounds - Deaths) / Rounds
```

### Impact Rating
```
Impact = (EntryKills * 3 + ClutchesWon * 5 + MVPs * 2 + 
          5Kills * 10 + 4Kills * 5 + 3Kills * 2) / TotalMatches
```

### ADR (Average Damage per Round)
```
ADR = TotalDamage / TotalRounds
```

---

## 🎯 Примеры использования

### React/Frontend пример

```javascript
import axios from 'axios';

// Получить показатели эффективности
const getPlayerPerformance = async (steamId) => {
  try {
    const response = await axios.get(`/api/cs2-stats/performance/${steamId}`);
    return response.data.performance;
  } catch (error) {
    console.error('Error fetching performance:', error);
    throw error;
  }
};

// Получить статистику оружия
const getWeaponStats = async (steamId, weaponType = null) => {
  try {
    const url = weaponType 
      ? `/api/cs2-stats/weapons/${steamId}?weaponType=${weaponType}`
      : `/api/cs2-stats/weapons/${steamId}`;
    const response = await axios.get(url);
    return response.data.weaponStats;
  } catch (error) {
    console.error('Error fetching weapon stats:', error);
    throw error;
  }
};

// Получить историю матчей с фильтрами
const getMatchHistory = async (steamId, filters = {}) => {
  try {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`/api/cs2-stats/matches/${steamId}?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching match history:', error);
    throw error;
  }
};

// Использование
const performance = await getPlayerPerformance('76561198012345678');
console.log(`K/D: ${performance.kdRatio}, ADR: ${performance.averageDamagePerRound}`);

const rifles = await getWeaponStats('76561198012345678', 'rifle');
console.log(`Best rifle: ${rifles[0].weaponName} with ${rifles[0].kills} kills`);

const recentMatches = await getMatchHistory('76561198012345678', {
  limit: 10,
  result: 'win',
  map: 'de_dust2'
});
```

---

## 🗄️ База данных

### Таблицы
1. **cs2_weapon_stats** - детальная статистика оружия
2. **cs2_player_performance** - агрегированные метрики игрока

### Миграция
```bash
# Применить миграцию
psql -U errorparty -d errorparty -f backend/migrations/add-cs2-advanced-stats.sql
```

---

## 🚀 Преимущества

✅ **Комплексная статистика** - все метрики в одном месте
✅ **HLTV Rating** - индустриальный стандарт оценки
✅ **Детализация оружия** - точность, урон, хедшоты для каждого оружия
✅ **Фильтры и пагинация** - гибкая выборка данных
✅ **Redis кэширование** - быстрые ответы (5-10 минут TTL)
✅ **Автоматическое обновление** - статистика обновляется после каждого матча
✅ **Лидерборды** - соревновательный элемент
✅ **Сравнение игроков** - head-to-head анализ

---

## 📝 TODO (опционально)

- [ ] **Heatmaps** - карты убийств/смертей на картах
- [ ] **Экономика** - анализ покупок и денежного менеджмента
- [ ] **Утилиты** - статистика использования гранат
- [ ] **Позиционная статистика** - производительность на CT/T стороне
- [ ] **Временные метрики** - производительность по времени суток
- [ ] **Streak tracking** - отслеживание серий побед/поражений
- [ ] **Role detection** - определение роли игрока (entry, support, awper)

---

**Created:** 2025-11-27
**Version:** 1.0.0
**Author:** ErrorParty Development Team
