# ProfilePage Improvements - Changelog

## Дата: 21.11.2025

### Новые возможности

#### 1. Редактирование профиля (Bio)
- Добавлена колонка `bio` в таблицу `users` (TEXT, nullable)
- Создан модальный компонент `EditProfileModal` для редактирования биографии
- Ограничение: максимум 500 символов
- API endpoint: `PUT /api/user/profile`
- Валидация на фронтенде и бэкенде

#### 2. Вкладка "Достижения"
- Новая вкладка в ProfilePage с отображением всех достижений пользователя
- Группировка по категориям: Dota 2, CS2, Общие
- Визуализация редкости достижений (common/rare/epic/legendary)
- Статистика: общее количество, по категориям, по редкости
- Компонент: `AchievementsSection.jsx`
- API endpoint: `GET /api/user/:userId/achievements`

#### 3. График активности
- Отображение времени в голосовых каналах за период (7 или 30 дней)
- График на базе Chart.js (Line chart)
- Переключение между периодами: 7 дней / 30 дней
- Статистика: общее время, среднее время/день, количество подключений
- Компонент: `ActivityGraph.jsx`
- API endpoint: `GET /api/user/:userId/activity?days=7`

### Новые модели

#### UserActivity
```javascript
{
  id: INTEGER (PK),
  userId: INTEGER (FK -> users.id),
  date: DATEONLY,
  voiceTime: INTEGER (seconds),
  connections: INTEGER
}
```

Индексы:
- UNIQUE(userId, date)
- INDEX on date

### Новые API endpoints

#### 1. Обновление профиля
```
PUT /api/user/profile
Authorization: Bearer <token>
Body: { bio: "string" }

Response: {
  success: true,
  message: "Профиль успешно обновлен",
  user: { id, username, bio }
}
```

#### 2. Получение достижений
```
GET /api/user/:userId/achievements

Response: {
  success: true,
  achievements: {
    dota2: [...],
    cs2: [...],
    general: [...]
  },
  stats: {
    total: number,
    byCategory: { dota2, cs2, general },
    byRarity: { common, rare, epic, legendary }
  }
}
```

#### 3. Получение активности
```
GET /api/user/:userId/activity?days=7

Response: {
  success: true,
  activity: [
    { date: "2025-11-21", voiceTime: 5, connections: 2 },
    ...
  ],
  totalVoiceTime: number (seconds),
  totalConnections: number
}
```

### Файлы изменены

**Backend:**
- `/backend/src/models/User.js` - добавлено поле bio
- `/backend/src/models/UserActivity.js` - создана новая модель
- `/backend/src/models/index.js` - экспорт UserActivity
- `/backend/src/controllers/userController.js` - добавлены 3 новых endpoint'а
- `/backend/src/routes/user.js` - добавлены роуты для новых endpoint'ов

**Frontend:**
- `/frontend/src/pages/ProfilePage.jsx` - добавлены вкладка достижений, секция bio, график активности
- `/frontend/src/components/EditProfileModal.jsx` - модальное окно редактирования профиля
- `/frontend/src/components/AchievementsSection.jsx` - секция отображения достижений
- `/frontend/src/components/ActivityGraph.jsx` - график активности

### Миграции

```sql
-- Добавление колонки bio
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Создание таблицы user_activity
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  voice_time INTEGER NOT NULL DEFAULT 0,
  connections INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(date);
```

### Тестовые данные

Созданы тестовые данные активности за последние 30 дней для всех пользователей:
- Случайное время в голосе: 0-8 часов/день
- Случайные подключения: 0-5/день

### UI/UX улучшения

1. **Bio секция**: Кнопка "Редактировать" открывает модальное окно
2. **График активности**: Адаптивный дизайн, hover эффекты, детальные подсказки
3. **Достижения**: Карточки с эффектом hover, цветовая кодировка по редкости
4. **Вкладки**: Добавлена новая вкладка "Достижения" между "Игры" и "Настройки"

### Зависимости

Все необходимые зависимости уже установлены:
- Chart.js 4.4.1 ✅
- Framer Motion 10.16.16 ✅
- react-icons 5.0.1 ✅

### Статус

✅ Все 8 задач улучшения сайта завершены
✅ Backend миграции выполнены
✅ Тестовые данные созданы
✅ Frontend собран
✅ Контейнеры перезапущены
✅ Нет ошибок в логах
