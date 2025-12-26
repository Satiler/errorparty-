# Модульная Архитектура Backend

## Структура проекта

```
backend/src/
├── core/                      # Ядро приложения
│   ├── app.js                # Express конфигурация
│   ├── server.js             # HTTP server & запуск
│   ├── database.js           # Database connection
│   ├── socket.js             # Socket.IO setup
│   └── moduleLoader.js       # Автозагрузчик модулей
├── shared/                    # Общие компоненты
│   ├── middleware/           # Middleware (auth, rate limiting, etc)
│   ├── utils/                # Утилиты
│   └── config/               # Конфигурация (passport, etc)
├── modules/                   # Функциональные модули
│   ├── auth/                 # Аутентификация
│   │   ├── index.js          # Конфигурация модуля
│   │   ├── auth.routes.js    # Роуты
│   │   └── auth.service.js   # Бизнес-логика
│   ├── cs2/                  # CS2 функционал
│   ├── quests/               # Квесты
│   └── ...                   # Другие модули
├── models/                    # Database models (Sequelize)
├── services/                  # External services (Steam, TeamSpeak)
└── index.js                   # Точка входа
```

## Как работает

### 1. Запуск (index.js)
```javascript
const { startServer } = require('./core/server');
startServer();
```

### 2. Инициализация (core/server.js)
- Подключение к БД
- Создание Express app
- Инициализация Socket.IO
- **Автозагрузка модулей**
- Запуск сервера

### 3. Модули автоматически загружаются

`moduleLoader.js` сканирует папку `modules/` и загружает каждый модуль.

## Создание нового модуля

### Шаг 1: Создать папку
```bash
mkdir src/modules/mymodule
```

### Шаг 2: Создать index.js

```javascript
// modules/mymodule/index.js
module.exports = {
  name: 'mymodule',              // Имя модуля
  routePrefix: '/api/mymodule',  // Префикс для роутов
  routes: require('./mymodule.routes'),
  services: require('./mymodule.service'),
  
  // Опционально: инициализация
  async initialize(app, io) {
    console.log('  ✓ My Module initialized');
    
    // Настройка Socket.IO событий
    if (io) {
      io.on('connection', (socket) => {
        socket.on('mymodule:event', (data) => {
          // Обработка события
        });
      });
    }
  }
};
```

### Шаг 3: Создать routes

```javascript
// modules/mymodule/mymodule.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./mymodule.controller');
const { authenticateToken } = require('../../shared/middleware/auth');

router.get('/', controller.getAll);
router.get('/:id', authenticateToken, controller.getById);
router.post('/', authenticateToken, controller.create);

module.exports = router;
```

### Шаг 4: Создать service

```javascript
// modules/mymodule/mymodule.service.js
const { MyModel } = require('../../models');

class MyModuleService {
  async getAll() {
    return await MyModel.findAll();
  }
  
  async getById(id) {
    return await MyModel.findByPk(id);
  }
  
  async create(data) {
    return await MyModel.create(data);
  }
}

module.exports = new MyModuleService();
```

### Шаг 5: Создать controller

```javascript
// modules/mymodule/mymodule.controller.js
const service = require('./mymodule.service');

exports.getAll = async (req, res) => {
  try {
    const items = await service.getAll();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const item = await service.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = exports;
```

## Запуск

### Разработка
```bash
npm run dev
```

### Продакшн
```bash
npm start
```

### С новой точкой входа
Обновите `package.json`:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

## Миграция существующего кода

### Поэтапно:

1. **Создать модуль** (например, `auth`)
2. **Переместить код** из `routes/auth.js` → `modules/auth/auth.routes.js`
3. **Переместить логику** из `controllers/authController.js` → `modules/auth/auth.controller.js`
4. **Создать сервис** `modules/auth/auth.service.js` для бизнес-логики
5. **Удалить старые файлы** после проверки

## Преимущества

✅ **Изоляция** - каждый модуль независим  
✅ **Масштабируемость** - легко добавлять новые модули  
✅ **Тестирование** - модули тестируются отдельно  
✅ **Переиспользование** - общий код в `shared/`  
✅ **Микросервисы** - в будущем можно выделить модуль в отдельный сервис  
✅ **Командная работа** - разные разработчики → разные модули

## Доступ к модулям из кода

```javascript
const moduleLoader = require('./core/moduleLoader');

// Получить модуль
const authModule = moduleLoader.getModule('auth');

// Использовать сервис модуля
const user = await authModule.services.getUserBySteamId('12345');

// Получить все модули
const modules = moduleLoader.getModules();
```

## Socket.IO в модулях

```javascript
module.exports = {
  name: 'chat',
  async initialize(app, io) {
    // Namespace для модуля
    const chatIO = io.of('/chat');
    
    chatIO.on('connection', (socket) => {
      console.log('Chat client connected');
      
      socket.on('message', (data) => {
        chatIO.emit('message', data);
      });
    });
  }
};
```

## Middleware в модулях

```javascript
// modules/admin/admin.middleware.js
exports.requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ success: false, error: 'Admin access required' });
};

// modules/admin/admin.routes.js
const { requireAdmin } = require('./admin.middleware');
router.get('/dashboard', requireAdmin, controller.getDashboard);
```

## Environment Variables

Модули могут использовать свои переменные окружения:

```javascript
// modules/telegram/index.js
async initialize(app, io) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️ Telegram bot disabled (no token)');
    return;
  }
  
  // Initialize telegram bot
  this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
}
```

## Следующие шаги

1. ✅ Создана базовая структура
2. ✅ Создан модуль `auth` как пример
3. 🔄 Мигрировать остальные модули:
   - [ ] cs2
   - [ ] quests
   - [ ] teamspeak
   - [ ] notifications
   - [ ] user
4. 🔄 Обновить старые импорты
5. 🔄 Тестирование
6. 🔄 Удалить старый `server.js`

## Запуск нового сервера

**Временно** старый `server.js` остается. Для запуска нового:

```bash
# Новый модульный сервер
node src/index.js

# Старый монолитный (если нужен откат)
node src/server.js
```

После полной миграции обновите `package.json` на новую точку входа.
