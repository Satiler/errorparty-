# 🎮 Steam Match History Parser - Quick Start

Система для автоматического получения истории матчей CS2 со страниц Steam Community.

## 🚀 Быстрый старт

### 1. Получить историю матчей через CLI

```bash
# Просмотр последних матчей
node fetch-steam-matches.js 76561198306468078

# С сохранением в базу данных
node fetch-steam-matches.js 76561198306468078 --save --userId 1 --max 50
```

### 2. Использование через API

```javascript
// GET - Получить историю
GET /api/cs2/steam-history/:steamId?tab=matchhistorypremier&maxMatches=20

// POST - Синхронизировать с БД
POST /api/cs2/steam-history/sync
Body: { "tab": "matchhistorypremier", "maxMatches": 50 }
```

### 3. Программное использование

```javascript
const steamMatchHistoryParser = require('./src/services/steamMatchHistoryParser');

// Получить матчи
const result = await steamMatchHistoryParser.parseMatchHistory('76561198306468078');
console.log(result.matches);

// Получить все матчи с пагинацией
const allMatches = await steamMatchHistoryParser.fetchAllMatchHistory('76561198306468078');
```

## 📊 Что можно получить

Из каждого матча:
- ✅ Карта и дата
- ✅ Счет (например, 13:2)
- ✅ Статистика игрока (K/D/A, MVP, HS%)
- ✅ Результат (Win/Loss)
- ✅ Информация обо всех игроках

## 🎯 Типы матчей

- `matchhistorypremier` - Премьер (рейтинговые)
- `matchhistorycompetitive` - Соревновательные
- `matchhistorywingman` - Wingman 2v2
- `matchhistorycasual` - Казуальные

## 📝 Примеры

### CLI - Получить все премьер матчи и сохранить

```bash
node fetch-steam-matches.js Satile --tab matchhistorypremier --all --save --userId 1
```

### API - React компонент для синхронизации

```jsx
function SyncButton() {
  const sync = async () => {
    const res = await fetch('/api/cs2/steam-history/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ maxMatches: 50 })
    });
    const data = await res.json();
    console.log(`Добавлено: ${data.stats.saved}`);
  };
  
  return <button onClick={sync}>Синхронизировать матчи</button>;
}
```

## 📦 Структура файлов

```
backend/
├── src/services/steamMatchHistoryParser.js  # Парсер
├── src/controllers/cs2Controller.js         # API
├── src/routes/cs2.js                        # Routes
└── fetch-steam-matches.js                   # CLI скрипт
```

## ⚙️ Основные методы

### steamMatchHistoryParser

- `parseMatchHistory(steamId, options)` - Получить страницу матчей
- `fetchAllMatchHistory(steamId, options)` - Получить все матчи
- `getUserMatchStats(match, steamId)` - Статистика пользователя
- `determineMatchResult(match, steamId)` - Результат (win/loss)
- `getAvailableMatchTypes()` - Доступные типы матчей

## 🔧 Настройка

Все готово к использованию! Зависимости уже установлены:
- ✅ axios
- ✅ cheerio

## ⚠️ Важно

1. **Публичный профиль**: Steam профиль должен быть публичным
2. **Rate Limiting**: Не делайте слишком частые запросы
3. **Дубликаты**: Система автоматически пропускает дубликаты при сохранении

## 📚 Полная документация

См. `STEAM_MATCH_HISTORY_GUIDE.md` для детальной информации.

## 🐛 Troubleshooting

**Ошибка при парсинге?**
1. Проверьте что профиль публичный
2. Убедитесь что Steam ID правильный
3. Попробуйте позже (Steam может быть недоступен)

**Все матчи пропущены?**
- Это нормально, означает что они уже в базе

## 💡 Рекомендации

1. **Первый запуск**: используйте `--all` для получения всей истории
2. **Обновления**: используйте `--max 20` для последних матчей
3. **Автоматизация**: настройте cron для регулярной синхронизации

```bash
# Crontab - каждый день в 3:00
0 3 * * * cd /path/to/backend && node fetch-steam-matches.js YOUR_STEAM_ID --save --userId 1 --max 50
```

---

**Готово к использованию! 🚀**
