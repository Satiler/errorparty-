# ⚡ Быстрый старт - Система автообновления плейлистов

## 🚀 За 5 минут до первого запуска

### Шаг 1: Установка (2 мин)

```bash
# Перейдите в директорию
cd "d:\МОЙ САЙТ\backend\auto-update"

# Установите зависимости
npm install
```

### Шаг 2: Настройка (2 мин)

```bash
# Скопируйте шаблон конфигурации
copy .env.example .env

# Откройте .env и заполните минимум:
# - DATABASE_URL
# - SPOTIFY_CLIENT_ID
# - SPOTIFY_CLIENT_SECRET
```

**Минимальный .env для тестирования:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/music_db
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
AUTO_UPDATE_PORT=3001
NODE_ENV=development
```

### Шаг 3: База данных (1 мин)

```bash
# Примените миграции
npm run migrate
```

### Шаг 4: Запуск! ✨

```bash
# Запустите в режиме разработки
npm run dev

# Откройте в браузере
# http://localhost:3001/health
```

---

## 🎯 Первые шаги после запуска

### 1. Проверьте статус

```bash
curl http://localhost:3001/health
```

### 2. Запустите тестовое обновление плейлиста

```bash
curl -X POST http://localhost:3001/api/auto-update/tasks/charts-update/run
```

### 3. Посмотрите изменения для модерации

```bash
curl http://localhost:3001/api/auto-update/pending-changes
```

### 4. Получите рекомендации (замените USER_ID)

```bash
curl http://localhost:3001/api/auto-update/recommendations/1?limit=10
```

---

## 📚 Что дальше?

1. **Полная настройка** → Читайте [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. **API примеры** → Смотрите [EXAMPLES.md](EXAMPLES.md)
3. **Документация** → Изучите [README.md](README.md)
4. **Интеграция Frontend** → Используйте компоненты из `/frontend/src/components/`

---

## 🛠️ Основные команды

```bash
# Разработка
npm run dev                # Запуск с hot reload
npm start                  # Обычный запуск
npm run migrate           # Применить миграции

# Тестирование API
curl http://localhost:3001/health                                    # Health check
curl http://localhost:3001/api/auto-update/status                    # Статус
curl -X POST http://localhost:3001/api/auto-update/scheduler/start   # Старт планировщика
curl -X POST http://localhost:3001/api/auto-update/scheduler/stop    # Стоп планировщика

# Ручной запуск задач
curl -X POST http://localhost:3001/api/auto-update/tasks/charts-update/run
curl -X POST http://localhost:3001/api/auto-update/tasks/kissvk-import/run
curl -X POST http://localhost:3001/api/auto-update/tasks/popularity-update/run
```

---

## ⚙️ Быстрая настройка для разных сценариев

### Только Spotify (минимальная конфигурация)

```env
# .env
DATABASE_URL=postgresql://...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

```javascript
// config/charts-config.js - отключите остальные
spotify: { enabled: true },
appleMusic: { enabled: false },
billboard: { enabled: false },
shazam: { enabled: false }
```

### Без модерации (автоматическое применение)

```javascript
// config/charts-config.js
playlistUpdate: {
  requireModeration: false,
  autoApply: true
}
```

### Изменить расписание

```javascript
// config/charts-config.js
updateSchedule: {
  cronExpression: '0 2 * * *', // Каждый день в 2:00
}
```

---

## 🐛 Частые проблемы

### Ошибка подключения к БД
```bash
# Проверьте PostgreSQL
psql -U postgres -c "SELECT 1"

# Проверьте строку подключения
echo $DATABASE_URL
```

### Ошибка Spotify API
```bash
# Проверьте ключи
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -u "CLIENT_ID:CLIENT_SECRET"
```

### Планировщик не запускается
```javascript
// Проверьте логи
tail -f logs/playlist-updates.log

// Или запустите вручную
const scheduler = require('./scheduler/auto-update.scheduler');
scheduler.start();
```

---

## 📱 Интеграция Frontend (React)

### 1. Установите компоненты

Компоненты уже созданы в:
- `frontend/src/components/TrendingPlaylists.jsx`
- `frontend/src/components/admin/PendingChangesManager.jsx`

### 2. Настройте axios

```javascript
// frontend/src/config/api.js
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';
```

### 3. Используйте компоненты

```jsx
import TrendingPlaylists from './components/TrendingPlaylists';

function App() {
  return <TrendingPlaylists userId={currentUserId} />;
}
```

---

## 🎓 Полезные ссылки

- 📖 [Полная документация](README.md)
- 🚀 [Руководство по развёртыванию](DEPLOYMENT_GUIDE.md)
- 💻 [Примеры кода](EXAMPLES.md)
- 📊 [Резюме проекта](../AUTO_UPDATE_SYSTEM_SUMMARY.md)

---

## ✅ Контрольный список

- [ ] Node.js установлен (v16+)
- [ ] PostgreSQL установлен
- [ ] `npm install` выполнен
- [ ] `.env` файл создан
- [ ] Миграции применены
- [ ] Spotify API ключи получены
- [ ] Сервер запущен
- [ ] Health check успешен

**Всё готово? Начинайте использовать! 🎉**

---

## 💡 Совет дня

Начните с **Spotify** интеграции - она самая простая и не требует дополнительных настроек. После успешного запуска добавляйте остальные источники по очереди.

**Удачи! 🚀**
