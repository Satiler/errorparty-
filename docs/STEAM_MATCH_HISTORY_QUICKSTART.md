# Steam Match History - Quick Start

## Что это?

Система для загрузки истории матчей CS2 из Steam Community в вашу базу данных.

## Как это работает?

1. Пользователь авторизован в Steam в браузере ✅
2. Frontend делает запрос к Steam Community (используя cookies пользователя)
3. Frontend отправляет HTML на ваш backend
4. Backend парсит HTML и извлекает данные о матчах
5. Опционально: сохраняет матчи в базу данных

## Backend API

### Endpoints

```
GET  /api/cs2/steam-history/match-types    - Список типов матчей
POST /api/cs2/steam-history/parse          - Парсинг HTML с матчами  
POST /api/cs2/steam-history/sync           - Синхронизация в БД
```

### Пример использования

```javascript
// Получить типы матчей
const types = await axios.get('/api/cs2/steam-history/match-types');

// Парсить матчи
const result = await axios.post('/api/cs2/steam-history/parse', {
  html: matchHistoryHtml,
  tab: 'matchhistorypremier'
}, {
  headers: { Authorization: `Bearer ${token}` }
});

// Синхронизировать в БД
const syncResult = await axios.post('/api/cs2/steam-history/sync', {
  html: matchHistoryHtml,
  tab: 'matchhistorypremier'
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Frontend Component

### Установка

Компонент уже создан:
- `frontend/src/components/SteamMatchHistory.jsx`
- `frontend/src/components/SteamMatchHistory.css`

### Использование

```jsx
import SteamMatchHistory from './components/SteamMatchHistory';

function ProfilePage() {
  return (
    <div>
      <SteamMatchHistory />
    </div>
  );
}
```

### Требования

В localStorage должны быть:
```javascript
localStorage.setItem('user', JSON.stringify({
  steamId: '76561198123456789'
}));
localStorage.setItem('token', 'jwt-token-here');
```

## Типы матчей

- **Premier** (`matchhistorypremier`) - Премьер режим с рейтингом
- **Competitive** (`matchhistorycompetitive`) - Обычный соревновательный
- **Wingman** (`matchhistorywingman`) - 2v2 режим
- **Scrimmage** (`matchhistoryscrimmage`) - Тренировочные матчи
- **Casual** (`matchhistorycasual`) - Casual режим

## Структура данных

```javascript
{
  success: true,
  matches: [
    {
      mapName: "de_mirage",
      date: "2024-01-15T10:30:00Z",
      ranked: true,
      duration: "45:23",
      teamAScore: 16,
      teamBScore: 14,
      result: "win", // или "loss"
      userStats: {
        kills: 25,
        deaths: 18,
        assists: 7,
        mvps: 3,
        score: 85,
        headshotPercentage: 45.5
      },
      players: [...]
    }
  ]
}
```

## Важные файлы

### Backend
```
backend/src/services/steamMatchHistoryService.js  - Парсер HTML
backend/src/controllers/cs2Controller.js          - API endpoints
backend/src/routes/cs2.js                         - Routes
```

### Frontend
```
frontend/src/components/SteamMatchHistory.jsx     - React компонент
frontend/src/components/SteamMatchHistory.css     - Стили
```

## Требования для пользователя

1. ✅ Авторизован в Steam Community в браузере
2. ✅ Профиль Steam должен быть **Публичным**
3. ✅ Есть матчи CS2 в истории

## Troubleshooting

### "Failed to fetch from Steam"
➡️ Войдите на https://steamcommunity.com в этом браузере

### "No match data found"
➡️ Проверьте настройки приватности профиля Steam (должен быть Public)

### CORS ошибки
➡️ Это нормально! Используется `credentials: 'include'` для обхода

## Безопасность

✅ Никаких креденшалов на сервере  
✅ Только собственные данные пользователя  
✅ JWT защита всех endpoints  
✅ Пользователь контролирует свои cookies  

❌ НЕ храним Steam cookies  
❌ НЕ запрашиваем пароли  
❌ НЕ используем чужие аккаунты  

## Тестирование

### Тест парсера (backend)

```javascript
const steamMatchHistoryService = require('./src/services/steamMatchHistoryService');
const fs = require('fs');

const html = fs.readFileSync('sample.html', 'utf8');
const result = steamMatchHistoryService.parseMatchHistoryHTML(html, 'YOUR_STEAM_ID');

console.log(JSON.stringify(result, null, 2));
```

### Тест через Postman

```http
POST http://localhost:3001/api/cs2/steam-history/parse
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "html": "<html>...ваш HTML от Steam...</html>",
  "tab": "matchhistorypremier"
}
```

## Полная документация

Смотрите: `STEAM_MATCH_HISTORY_INTEGRATION.md`

## Что дальше?

1. ✅ Backend готов
2. ✅ Frontend компонент готов
3. 🔄 Добавьте компонент в свое приложение
4. 🔄 Протестируйте с реальным пользователем
5. 🔄 Настройте стили под свой дизайн

---

**Готово к использованию!** 🚀
