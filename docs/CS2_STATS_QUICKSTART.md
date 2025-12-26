# 🎮 CS2 Advanced Statistics API - Quick Start

## 🚀 Установка

### 1. Применить миграцию базы данных

```bash
# Подключиться к PostgreSQL
psql -U errorparty -d errorparty

# Или через Docker
docker exec -i errorparty_postgres psql -U errorparty -d errorparty < backend/migrations/add-cs2-advanced-stats.sql
```

### 2. Перезапустить backend

```bash
# Development
cd backend
npm run dev

# Production (Docker)
docker-compose restart backend
```

### 3. Проверить работу API

```bash
# Health check
curl http://localhost:3000/api/health

# Получить лидерборд (должен вернуться пустой массив если нет данных)
curl http://localhost:3000/api/cs2-stats/leaderboard
```

---

## 📊 Быстрые примеры

### Получить статистику игрока
```bash
# Замените YOUR_STEAM_ID на реальный Steam ID
curl http://localhost:3000/api/cs2-stats/performance/76561198012345678
```

### Получить топ 5 оружий игрока
```bash
curl http://localhost:3000/api/cs2-stats/weapons/76561198012345678?limit=5
```

### Последние 10 матчей
```bash
curl http://localhost:3000/api/cs2-stats/matches/76561198012345678?limit=10
```

### Топ 10 игроков по рейтингу
```bash
curl http://localhost:3000/api/cs2-stats/leaderboard?limit=10
```

### Сравнить двух игроков
```bash
curl "http://localhost:3000/api/cs2-stats/compare?steamId1=76561198012345678&steamId2=76561198087654321"
```

---

## 🔧 Интеграция с существующим кодом

### Обновление статистики после матча

Добавьте в ваш контроллер обработки матчей:

```javascript
const cs2StatsService = require('../services/cs2StatsService');

// После сохранения матча
const match = await CS2Match.create({
  userId,
  kills: 24,
  deaths: 18,
  // ... другие поля
});

// Обновить агрегированную статистику игрока
try {
  await cs2StatsService.updatePlayerPerformance(userId, match.id);
  console.log('✅ Player performance updated');
} catch (error) {
  console.error('❌ Error updating performance:', error);
}

// Если есть данные об оружии (из demo parser)
if (weaponData) {
  try {
    await cs2StatsService.updateWeaponStats(userId, match.id, weaponData);
    console.log('✅ Weapon stats updated');
  } catch (error) {
    console.error('❌ Error updating weapon stats:', error);
  }
}
```

### Формат weaponData для updateWeaponStats

```javascript
const weaponData = [
  {
    name: 'ak47',
    type: 'rifle',
    kills: 5,
    headshots: 2,
    damage: 567,
    shotsFired: 45,
    shotsHit: 12,
    deaths: 1,
    firstKills: 2,
    wallbangKills: 1,
    timeUsed: 120 // секунды
  },
  {
    name: 'usp_silencer',
    type: 'pistol',
    kills: 3,
    headshots: 2,
    damage: 234,
    shotsFired: 18,
    shotsHit: 6,
    deaths: 0,
    firstKills: 1
  }
  // ... другие оружия
];
```

---

## 🎨 Frontend примеры

### React Component - Player Stats Card

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PlayerStatsCard = ({ steamId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`/api/cs2-stats/performance/${steamId}`);
        setStats(response.data.performance);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [steamId]);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>No stats available</div>;

  return (
    <div className="stats-card">
      <h2>{stats.user.username}</h2>
      
      <div className="stats-grid">
        <div className="stat">
          <span className="label">Matches</span>
          <span className="value">{stats.totalMatches}</span>
        </div>
        
        <div className="stat">
          <span className="label">Winrate</span>
          <span className="value">{stats.winrate}%</span>
        </div>
        
        <div className="stat">
          <span className="label">K/D</span>
          <span className="value">{stats.kdRatio}</span>
        </div>
        
        <div className="stat">
          <span className="label">ADR</span>
          <span className="value">{stats.averageDamagePerRound}</span>
        </div>
        
        <div className="stat">
          <span className="label">HS%</span>
          <span className="value">{stats.headshotPercentage}%</span>
        </div>
        
        <div className="stat">
          <span className="label">HLTV Rating</span>
          <span className="value">{stats.hltvRating}</span>
        </div>
      </div>

      <div className="recent-form">
        <h3>Recent Form (Last 10 matches)</h3>
        <div className="form-stats">
          <p>Winrate: {stats.recentWinrate}%</p>
          <p>K/D: {stats.recentKD}</p>
          <p>ADR: {stats.recentADR}</p>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsCard;
```

### React Component - Weapon Stats

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WeaponStats = ({ steamId, weaponType }) => {
  const [weapons, setWeapons] = useState([]);

  useEffect(() => {
    const fetchWeapons = async () => {
      try {
        const url = weaponType 
          ? `/api/cs2-stats/weapons/${steamId}?weaponType=${weaponType}`
          : `/api/cs2-stats/weapons/${steamId}`;
        const response = await axios.get(url);
        setWeapons(response.data.weaponStats);
      } catch (error) {
        console.error('Error fetching weapons:', error);
      }
    };

    fetchWeapons();
  }, [steamId, weaponType]);

  return (
    <div className="weapon-stats">
      <h2>Weapon Statistics</h2>
      <table>
        <thead>
          <tr>
            <th>Weapon</th>
            <th>Kills</th>
            <th>HS%</th>
            <th>Accuracy</th>
            <th>K/D</th>
            <th>Damage</th>
          </tr>
        </thead>
        <tbody>
          {weapons.map(weapon => (
            <tr key={weapon.weaponName}>
              <td>{weapon.weaponName}</td>
              <td>{weapon.kills}</td>
              <td>{weapon.headshotPercentage}%</td>
              <td>{weapon.accuracy}%</td>
              <td>{weapon.kdRatio}</td>
              <td>{weapon.damage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeaponStats;
```

---

## 📝 Endpoints Cheatsheet

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cs2-stats/performance/:steamId` | GET | Показатели эффективности |
| `/api/cs2-stats/weapons/:steamId` | GET | Статистика оружия |
| `/api/cs2-stats/matches/:steamId` | GET | История матчей |
| `/api/cs2-stats/leaderboard` | GET | Топ игроков |
| `/api/cs2-stats/weapon-types/:steamId` | GET | Статистика по типам оружия |
| `/api/cs2-stats/maps/:steamId` | GET | Статистика по картам |
| `/api/cs2-stats/recent-form/:steamId` | GET | Последняя форма (тренд) |
| `/api/cs2-stats/compare` | GET | Сравнение двух игроков |

---

## 🔍 Troubleshooting

### Ошибка: "Player not found"
- Убедитесь, что пользователь с этим Steam ID существует в базе данных
- Проверьте таблицу `users`: `SELECT * FROM users WHERE steam_id = 'YOUR_STEAM_ID';`

### Ошибка: "No performance data available"
- Игрок должен сыграть хотя бы один матч
- Проверьте таблицу `cs2_matches`: `SELECT * FROM cs2_matches WHERE user_id = X;`
- Убедитесь, что вызывается `updatePlayerPerformance()` после каждого матча

### Пустой лидерборд
- Требуется минимум 10 матчей для попадания в лидерборд
- Проверьте: `SELECT * FROM cs2_player_performance WHERE total_matches >= 10;`

### Низкая производительность
- Убедитесь, что Redis работает корректно
- Проверьте индексы в базе данных
- Кэш очищается автоматически при обновлении статистики

---

## 📚 Полная документация

См. [CS2_ADVANCED_STATS_API.md](./CS2_ADVANCED_STATS_API.md) для полной документации API.

---

## ✅ Чеклист готовности

- [ ] Миграция применена
- [ ] Backend перезапущен
- [ ] API endpoints отвечают
- [ ] Интеграция с обработкой матчей добавлена
- [ ] Frontend компоненты созданы
- [ ] Тестирование пройдено

---

**Ready to go! 🚀**
