# Инструкция по запуску проекта ErrorParty.ru

## 🚀 Быстрый старт

### 1. Копирование переменных окружения

Скопируйте файл с примером переменных окружения:

```powershell
Copy-Item .env.example .env
```

Отредактируйте `.env` файл и укажите свои настройки (особенно пароли для БД и TeamSpeak).

### 2. Запуск через Docker Compose

Запустите все сервисы одной командой:

```powershell
docker-compose up -d
```

Это запустит:
- PostgreSQL базу данных (порт 5432)
- Redis (порт 6379)
- Backend API (порт 3000)
- Frontend React приложение (порт 5173)
- Nginx reverse proxy (порт 80)

### 3. Проверка статуса

Проверьте, что все контейнеры запущены:

```powershell
docker-compose ps
```

Просмотр логов:

```powershell
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

### 4. Доступ к приложению

Откройте браузер:

- **Frontend:** http://localhost
- **Backend API:** http://localhost/api
- **API Health:** http://localhost/api/health

---

## 🛠 Разработка

### Локальная разработка БЕЗ Docker

#### Backend:

```powershell
cd backend
npm install
npm run dev
```

Backend будет доступен на http://localhost:3000

#### Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Frontend будет доступен на http://localhost:5173

---

## 📦 Установка зависимостей

Если вы работаете локально (не в Docker), установите зависимости:

```powershell
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## 🗄 База данных

### Создание таблиц (миграции)

После первого запуска нужно создать таблицы в БД:

```powershell
docker-compose exec backend npm run migrate
```

Или локально:

```powershell
cd backend
npm run migrate
```

---

## 🔧 Полезные команды

### Остановка всех контейнеров:

```powershell
docker-compose down
```

### Полная очистка (включая volumes):

```powershell
docker-compose down -v
```

### Пересборка контейнеров:

```powershell
docker-compose up -d --build
```

### Перезапуск конкретного сервиса:

```powershell
docker-compose restart backend
```

### Вход в контейнер:

```powershell
# Backend
docker-compose exec backend sh

# PostgreSQL
docker-compose exec postgres psql -U errorparty -d errorparty
```

---

## 📝 Структура проекта

```
errorparty.ru/
├── backend/               # Node.js API
│   ├── src/
│   │   ├── server.js     # Главный файл сервера
│   │   ├── routes/       # API маршруты
│   │   ├── controllers/  # Контроллеры
│   │   ├── models/       # Модели БД
│   │   └── services/     # Бизнес-логика
│   ├── Dockerfile
│   └── package.json
│
├── frontend/              # React приложение
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   ├── pages/        # Страницы
│   │   ├── App.jsx       # Главный компонент
│   │   └── main.jsx      # Точка входа
│   ├── Dockerfile
│   └── package.json
│
├── docker/
│   └── nginx/            # Nginx конфигурация
│
├── docker-compose.yml    # Docker Compose конфигурация
├── .env.example          # Пример переменных окружения
└── README.md
```

---

## 🐛 Решение проблем

### Порты заняты

Если порт 80 или другие порты заняты:

1. Измените порты в `docker-compose.yml`
2. Или остановите конфликтующие приложения

### Ошибки при сборке

Очистите Docker cache:

```powershell
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### База данных не подключается

Проверьте, что PostgreSQL контейнер запущен:

```powershell
docker-compose ps postgres
```

Проверьте логи:

```powershell
docker-compose logs postgres
```

### Frontend не обновляется

В режиме разработки с Docker может не работать hot reload. 
Для разработки лучше запускать frontend локально:

```powershell
cd frontend
npm run dev
```

---

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

## 🎯 Следующие шаги

1. ✅ Базовая структура создана
2. ✅ Docker конфигурация готова
3. ✅ Frontend и Backend работают
4. ⏳ Подключение TeamSpeak ServerQuery API
5. ⏳ Настройка базы данных
6. ⏳ Добавление функционала (мемы, статистика, и т.д.)

Удачи в разработке! 🚀
