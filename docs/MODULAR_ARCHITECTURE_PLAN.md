# План модульной архитектуры проекта

## Текущая проблема
Монолитный `server.js` содержит всю логику инициализации, middleware, роуты и настройки.

## Целевая модульная структура

```
backend/src/
├── modules/                    # Функциональные модули (фичи)
│   ├── auth/                  # Аутентификация
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.routes.js
│   │   ├── auth.model.js
│   │   └── auth.middleware.js
│   ├── cs2/                   # CS2 игровые данные
│   │   ├── cs2.controller.js
│   │   ├── cs2.service.js
│   │   ├── cs2.routes.js
│   │   ├── cs2.model.js
│   │   └── submodules/
│   │       ├── stats/
│   │       ├── matches/
│   │       └── steam-history/
│   ├── quests/                # Система квестов
│   │   ├── quests.controller.js
│   │   ├── quests.service.js
│   │   ├── quests.routes.js
│   │   └── quests.model.js
│   ├── teamspeak/             # TeamSpeak интеграция
│   │   ├── teamspeak.controller.js
│   │   ├── teamspeak.service.js
│   │   └── teamspeak.routes.js
│   └── notifications/         # Push уведомления
│       ├── notifications.controller.js
│       ├── notifications.service.js
│       └── notifications.routes.js
├── core/                      # Ядро приложения
│   ├── app.js                # Express app конфигурация
│   ├── server.js             # HTTP server запуск
│   ├── database.js           # DB connection
│   └── socket.js             # Socket.IO setup
├── shared/                    # Общие компоненты
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   └── helpers.js
│   └── config/
│       ├── index.js
│       └── passport.js
└── index.js                   # Точка входа

```

## Преимущества модульной архитектуры

1. **Изоляция кода** - каждый модуль независим
2. **Легкое тестирование** - можно тестировать модули отдельно
3. **Масштабируемость** - легко добавлять новые модули
4. **Переиспользование** - общий код в shared/
5. **Микросервисы** - в будущем можно выделить модули в отдельные сервисы
6. **Командная работа** - разные разработчики работают над разными модулями

## План миграции

### Фаза 1: Создание структуры ядра
- [ ] Создать core/app.js - Express конфигурация
- [ ] Создать core/server.js - HTTP server
- [ ] Создать core/database.js - DB подключение
- [ ] Создать core/socket.js - Socket.IO

### Фаза 2: Вынос общих компонентов
- [ ] Переместить middleware в shared/middleware/
- [ ] Переместить utils в shared/utils/
- [ ] Переместить config в shared/config/

### Фаза 3: Создание модулей
- [ ] Модуль auth
- [ ] Модуль cs2
- [ ] Модуль quests
- [ ] Модуль teamspeak
- [ ] Модуль notifications

### Фаза 4: Автозагрузка модулей
- [ ] Создать module loader
- [ ] Регистрация роутов автоматически
- [ ] Инициализация модулей

## Структура модуля

Каждый модуль следует единому формату:

```javascript
// modules/example/index.js
module.exports = {
  name: 'example',
  routes: require('./example.routes'),
  services: require('./example.service'),
  initialize: async (app, io) => {
    // Инициализация модуля
  }
};
```

## Начинаем?

Хотите начать миграцию? Я создам структуру поэтапно.
