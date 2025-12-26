# Roadmap: Фаза 3 - Новый функционал и улучшения

## Дата создания: 25 ноября 2025
## Срок реализации: 2-3 месяца

---

## ✅ Завершённые фазы

### Фаза 1: Критические исправления (ЗАВЕРШЕНО)
- ✅ Утечки памяти (intervals/timeouts tracking)
- ✅ Race conditions (Redis locking)
- ✅ Индексы БД (12 критичных индексов)
- ✅ Безопасность (13 уязвимостей устранено)

### Фаза 2: Оптимизации среднего приоритета (ЗАВЕРШЕНО)
- ✅ Joi валидация
- ✅ Оптимизированный HomePage endpoint
- ✅ Socket.IO для админки
- ✅ Debounce для live matches
- ✅ Оптимистичный UI для квестов
- ✅ Исправлены анимации DashboardPage

---

## 📋 Code Review - Найденные проблемы

### 🔴 Критичные (требуют исправления)

#### 1. Логирование токенов и секретов
**Файл:** `backend/src/services/teamspeakService.js:529`
```javascript
// ❌ ПРОБЛЕМА: Логируется токен пользователя
console.log(`🔗 Link request from ${invoker.nickname} with token: ${token}`);
```

**Решение:**
```javascript
// ✅ Маскировать токены в логах
console.log(`🔗 Link request from ${invoker.nickname} with token: ${token.substring(0, 4)}****`);
```

#### 2. TODO комментарии в критичных местах
**Файл:** `backend/src/services/cs2MatchSyncService.js:381`
```javascript
// TODO: Implement demo file parsing using demofile library
```

**Решение:** Реализовать парсинг demo файлов или удалить комментарий если не планируется.

#### 3. Недостающая валидация на публичных эндпоинтах
**Файл:** `backend/src/routes/cs2.js`
- `POST /demo/load` - нет Joi валидации
- `POST /match/add` - есть валидация ✅

**Решение:** Добавить валидацию для `/demo/load`

---

### 🟡 Средние (желательно исправить)

#### 1. MemoryStore для сессий
**Предупреждение при запуске:**
```
Warning: connect.session() MemoryStore is not designed for production
```

**Решение:** Использовать Redis для хранения сессий
```javascript
const RedisStore = require('connect-redis').default;
const session = require('express-session');

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

#### 2. Отсутствие retry логики для критичных операций
- Steam Bot подключение при rate limit
- TeamSpeak переподключение при сбое

**Решение:** Добавить exponential backoff с максимальным количеством попыток

---

### 🟢 Низкие (можно отложить)

#### 1. TypeScript миграция
- Улучшит type safety
- Предотвратит ошибки на этапе разработки
- Интеграция с IDE

#### 2. Документация API
- Swagger/OpenAPI спецификация
- Автогенерация клиентов

---

## 🧪 План тестирования

### Unit тесты

#### Backend (Jest + Supertest)
```bash
npm install --save-dev jest supertest @types/jest
```

**Приоритетные модули:**
1. **Validation middleware** (`middleware/validation.js`)
   - Тест всех Joi схем
   - Граничные случаи (min/max length, patterns)
   
2. **Share Code Decoder** (`utils/shareCodeDecoder.js`)
   - Декодирование валидных кодов
   - Обработка невалидных форматов
   
3. **Quest Service** (`services/questService.js`)
   - Логика начисления опыта
   - Проверка условий квестов
   - Пенальти система

**Пример теста:**
```javascript
// tests/middleware/validation.test.js
const { validate } = require('../../src/middleware/validation');

describe('Validation Middleware', () => {
  describe('cs2AuthToken schema', () => {
    it('should accept valid auth token', () => {
      const req = { body: { authToken: '9BK4-5Z9HP-A9KL' } };
      const res = {};
      const next = jest.fn();
      
      validate('cs2AuthToken')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    
    it('should reject invalid format', () => {
      const req = { body: { authToken: 'invalid' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      validate('cs2AuthToken')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
```

#### Frontend (Vitest + React Testing Library)
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Приоритетные компоненты:**
1. **QuestsPanel** - оптимистичный UI + rollback
2. **AdminBotPage** - Socket.IO интеграция
3. **CS2StatsPage** - visibility detection

**Пример теста:**
```javascript
// tests/components/QuestsPanel.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestsPanel from '../../src/components/QuestsPanel';

describe('QuestsPanel', () => {
  it('should update UI optimistically on claim', async () => {
    const { getByText } = render(<QuestsPanel />);
    const claimButton = getByText('Получить награду');
    
    fireEvent.click(claimButton);
    
    // Проверяем немедленное обновление UI
    expect(screen.getByText('Получено')).toBeInTheDocument();
  });
  
  it('should rollback on error', async () => {
    // Mock failed API call
    global.fetch = jest.fn(() => Promise.reject('Network error'));
    
    const { getByText } = render(<QuestsPanel />);
    const claimButton = getByText('Получить награду');
    
    fireEvent.click(claimButton);
    
    await waitFor(() => {
      // UI должен вернуться в исходное состояние
      expect(screen.getByText('Получить награду')).toBeInTheDocument();
    });
  });
});
```

### Integration тесты

**Критичные потоки:**
1. Регистрация/авторизация пользователя
2. Связывание TeamSpeak аккаунта
3. Синхронизация CS2 матчей
4. Система квестов (claim → exp → level up)

### E2E тесты (Playwright)
```bash
npm install --save-dev @playwright/test
```

**Сценарии:**
1. Полный цикл пользователя (регистрация → квест → награда)
2. Админ панель (управление ботом, модерация мемов)
3. Real-time обновления (Socket.IO события)

---

## 🎯 Фаза 3: Новый функционал (2-3 месяца)

### 1️⃣ Система достижений (4-6 недель)

#### Архитектура
```javascript
// backend/src/models/Achievement.js
{
  id: UUID,
  code: 'first_blood', // уникальный идентификатор
  title: 'Первая кровь',
  description: 'Получи первый килл в CS2',
  icon: '🎯',
  rarity: 'common' | 'rare' | 'epic' | 'legendary',
  category: 'cs2' | 'teamspeak' | 'social' | 'special',
  points: 50, // очки достижения
  hidden: false, // скрытое достижение
  requirements: {
    type: 'stat_threshold',
    condition: {
      stat: 'cs2_kills',
      operator: '>=',
      value: 1
    }
  }
}

// backend/src/models/UserAchievement.js
{
  id: UUID,
  userId: UUID,
  achievementId: UUID,
  unlockedAt: Date,
  progress: 0-100, // для многоступенчатых
  notified: Boolean
}
```

#### Типы достижений

**CS2 Достижения:**
- 🎯 Первая кровь - первый килл
- 💀 Убийца - 1000 киллов
- 🔥 Горячая серия - 5 побед подряд
- ⭐ Мастер - 100 MVP звёзд
- 🎖️ Ветеран - 500 матчей
- 🏆 Чемпион - достичь Global Elite

**TeamSpeak Достижения:**
- 🎤 Болтун - 100 часов в голосовых каналах
- 👑 Король лобби - провести 24 часа в одном канале
- 🌙 Полуночник - зайти в TS в 3 ночи
- 👥 Командный игрок - сыграть с 50 разными людьми

**Социальные Достижения:**
- 😂 Мемолорд - 10 мемов одобрено
- 💬 Комментатор - 100 комментариев
- ⭐ Звезда сообщества - получить 1000 лайков
- 🎉 Организатор - создать 10 ивентов

**Специальные (скрытые):**
- 🐛 Багхантер - найти критичный баг
- 🎂 День рождения - зайти в день регистрации
- 🌟 Легенда - достичь 10000 уровня
- 👻 Призрак - не заходить 365 дней, затем вернуться

#### API Endpoints
```javascript
// GET /api/achievements - список всех достижений
// GET /api/achievements/user/:userId - достижения пользователя
// GET /api/achievements/progress/:userId - прогресс по достижениям
// POST /api/achievements/unlock - разблокировать достижение (admin)
```

#### Система уведомлений
```javascript
// Socket.IO event при разблокировке
socket.emit('achievement:unlocked', {
  achievement: {
    title: 'Первая кровь',
    description: '...',
    icon: '🎯',
    points: 50
  },
  totalPoints: 1250,
  rank: 'Bronze III'
});
```

#### UI компоненты
- **AchievementCard** - карточка достижения (заблокирована/разблокирована)
- **AchievementProgress** - прогресс бар для многоступенчатых
- **AchievementShowcase** - витрина избранных достижений на профиле
- **AchievementNotification** - всплывающее уведомление при разблокировке

---

### 2️⃣ Расширенная аналитика (3-4 недели)

#### Dashboard для пользователя

**Статистика CS2:**
- 📊 График динамики K/D ratio
- 📈 Прогресс по рангам (история изменений)
- 🎯 Точность по оружиям (heatmap)
- 🗺️ Лучшие карты (win rate)
- ⏰ Пиковая активность (по часам/дням)
- 👥 Статистика с друзьями (кто лучший teammate)

**Статистика TeamSpeak:**
- ⏱️ График онлайн времени по дням
- 🎤 Топ каналов по времени
- 👥 С кем чаще играешь (топ соседей по каналам)
- 🌙 Распределение активности по времени суток

**Статистика квестов:**
- 📈 История уровней (график прогресса)
- 🎯 Выполнено квестов по категориям
- 💰 Заработано опыта (breakdown по источникам)
- 🔥 Текущий streak выполнения

#### Сравнительная аналитика
```javascript
// GET /api/analytics/compare/:userId1/:userId2
{
  users: [user1, user2],
  comparison: {
    cs2: {
      kd_ratio: [1.5, 1.2],
      win_rate: [55, 48],
      avg_kills: [18, 15]
    },
    teamspeak: {
      total_time: [350, 280],
      avg_session: [2.5, 1.8]
    },
    quests: {
      level: [25, 18],
      completed: [150, 98]
    }
  }
}
```

#### Leaderboards (Таблицы лидеров)

**Категории:**
- 🏆 Топ по уровню
- 🎯 Топ по K/D
- ⏰ Топ по онлайн времени
- 💰 Топ по опыту за неделю
- 🔥 Топ по streak'у квестов
- ⭐ Топ по достижениям

**Фильтры:**
- Все время / Месяц / Неделя / Сегодня
- Друзья / Глобальный

#### Экспорт данных
```javascript
// GET /api/analytics/export/:userId?format=json|csv|pdf
// Экспорт полной статистики пользователя
```

#### Визуализация (Charts)
```bash
npm install recharts chart.js react-chartjs-2
```

**Типы графиков:**
- Line Chart - динамика во времени
- Bar Chart - сравнение показателей
- Pie Chart - распределение
- Radar Chart - сравнение по категориям
- Heatmap - активность по часам/дням

---

## 🔧 Технические улучшения

### 1. Redis для сессий
```javascript
// backend/src/server.js
const RedisStore = require('connect-redis').default;
const redisClient = require('./config/redis');

app.use(session({
  store: new RedisStore({ 
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400 // 24 hours
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

### 2. Логирование с маскировкой секретов
```javascript
// backend/src/utils/logger.js
const maskSensitiveData = (message) => {
  return message
    .replace(/token:\s*[A-Za-z0-9\-]+/gi, 'token: ****')
    .replace(/password:\s*[^\s]+/gi, 'password: ****')
    .replace(/secret:\s*[^\s]+/gi, 'secret: ****');
};

const logger = {
  log: (message) => console.log(maskSensitiveData(message)),
  error: (message) => console.error(maskSensitiveData(message)),
  warn: (message) => console.warn(maskSensitiveData(message))
};

module.exports = logger;
```

### 3. Error Boundary для React
```javascript
// frontend/src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
    // Отправка в Sentry/LogRocket
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Что-то пошло не так</h1>
          <button onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 4. Rate Limiting per User
```javascript
// backend/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const createUserRateLimiter = (options) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:user:'
    }),
    keyGenerator: (req) => req.user?.id || req.ip,
    windowMs: options.windowMs || 60000,
    max: options.max || 100,
    message: options.message || 'Слишком много запросов'
  });
};

module.exports = { createUserRateLimiter };
```

---

## 📅 Timeline (2-3 месяца)

### Месяц 1: Code Review + Тесты + Система достижений (база)
**Неделя 1-2:**
- ✅ Code review критичных проблем
- ✅ Исправление логирования секретов
- ✅ Миграция на Redis сессии
- ✅ Unit тесты для validation middleware

**Неделя 3-4:**
- 🎯 Модели Achievement & UserAchievement
- 🎯 Система проверки условий достижений
- 🎯 API endpoints для достижений
- 🎯 Базовые достижения (20-30 штук)

### Месяц 2: Достижения (UI) + Аналитика (база)
**Неделя 5-6:**
- 🎯 UI компоненты для достижений
- 🎯 Socket.IO уведомления
- 🎯 Страница достижений
- 🎯 Интеграция с профилем

**Неделя 7-8:**
- 📊 Модели и endpoints для аналитики
- 📊 Агрегация данных (daily/weekly/monthly)
- 📊 Leaderboards API
- 📊 Экспорт данных

### Месяц 3: Аналитика (UI) + Тестирование + Оптимизация
**Неделя 9-10:**
- 📊 Dashboard с графиками
- 📊 Страница сравнения пользователей
- 📊 Таблицы лидеров
- 📊 Визуализация статистики

**Неделя 11-12:**
- 🧪 Integration тесты
- 🧪 E2E тесты критичных потоков
- 🔧 Оптимизация производительности
- 📝 Документация API

---

## 🎯 KPI и метрики успеха

### Технические метрики:
- ✅ Code coverage: >80%
- ✅ API response time: <200ms (p95)
- ✅ Uptime: >99.5%
- ✅ Zero critical security issues

### Пользовательские метрики:
- 📈 Engagement rate: +30%
- 📈 Daily active users: +25%
- 📈 Average session time: +40%
- 📈 Feature adoption (достижения): >60%

---

## 📚 Ресурсы и инструменты

### Тестирование:
- Jest: https://jestjs.io/
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- React Testing Library: https://testing-library.com/

### Визуализация:
- Recharts: https://recharts.org/
- Chart.js: https://www.chartjs.org/
- D3.js: https://d3js.org/

### Мониторинг:
- Sentry (error tracking): https://sentry.io/
- LogRocket (session replay): https://logrocket.com/
- PM2 (process manager): https://pm2.keymetrics.io/

### Документация:
- Swagger/OpenAPI: https://swagger.io/
- Redoc: https://redocly.com/

---

## 🚀 Приоритеты

### Must Have (обязательно):
1. ✅ Исправление логирования секретов
2. ✅ Redis для сессий
3. ✅ Unit тесты валидации
4. 🎯 Базовая система достижений
5. 📊 Основная аналитика

### Should Have (желательно):
1. 🧪 Integration тесты
2. 📊 Расширенная аналитика
3. 🎯 Скрытые достижения
4. 📊 Экспорт данных

### Nice to Have (можно отложить):
1. TypeScript миграция
2. E2E тесты
3. Swagger документация
4. Advanced visualizations

---

## 📝 Заметки

### Риски:
- ⚠️ Сложность реализации real-time обновлений для достижений
- ⚠️ Производительность при большом количестве данных в аналитике
- ⚠️ Миграция данных для новых фич

### Зависимости:
- Redis для сессий и rate limiting
- Socket.IO для уведомлений о достижениях
- Charting библиотеки для визуализации

### Следующие шаги:
1. Утвердить план с командой
2. Создать детальные task'и в issue tracker
3. Настроить CI/CD для тестов
4. Начать реализацию по приоритету

---

**Статус:** 📋 В планировании  
**Автор:** AI Assistant  
**Последнее обновление:** 25 ноября 2025
