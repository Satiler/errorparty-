# Инструкция по исправлению лайков треков

## Проблема
Лайки треков не работают из-за:
1. Отсутствия поля `updatedAt` в таблице `TrackLikes`
2. Скрытой кнопки лайка (показывается только при наведении)
3. Треки не получают информацию о том, лайкнуты ли они текущим пользователем
4. Возможно отсутствующая таблица в БД

## Исправления

### 1. Модель TrackLike (✅ Исправлено)
Файл: `backend/src/models/TrackLike.js`
- Изменено `updatedAt: false` на `updatedAt: 'updatedAt'`

### 2. Компонент TrackRow (✅ Исправлено)
Файл: `frontend/src/components/music/TrackRow.jsx`
- Лайкнутые треки теперь показывают зеленое сердечко всегда
- Не лайкнутые треки показывают кнопку при наведении
- Добавлена проверка наличия токена перед показом кнопки

### 3. Контроллер getTracks (✅ Исправлено)
Файл: `backend/src/modules/music/music.controller.js`
- Добавлена проверка лайков текущего пользователя
- Каждый трек теперь имеет поле `isFavorite`

### 4. Роут /api/music/tracks (✅ Исправлено)
Файл: `backend/src/modules/music/music.routes.js`
- Добавлен middleware `optionalAuth` для проверки авторизации без требования токена
- Если пользователь авторизован, треки получат информацию о лайках

### 5. Миграция базы данных (✅ Создана)
Файлы:
- `backend/migrations/add-track-likes-updated-at.sql` - Миграция для добавления поля
- `backend/check-track-likes.sql` - Проверка состояния таблицы

## Как применить исправления

### Шаг 1: Обновить базу данных
```bash
# Подключитесь к PostgreSQL
psql -U postgres -d errorparty

# Выполните миграцию
\i backend/migrations/add-track-likes-updated-at.sql

# Проверьте результат
\i backend/check-track-likes.sql
```

### Шаг 2: Перезапустить backend
```bash
cd backend
npm install  # На случай, если нужно
node src/server.js
```

### Шаг 3: Пересобрать frontend (если нужно)
```bash
cd frontend
npm run build
```

### Шаг 4: Протестировать
```bash
# Установите TEST_TOKEN в .env файл
# Получите токен через логин или из браузера (localStorage.getItem('token'))

# Запустите тест
cd backend
node test-track-likes.js
```

## Как проверить вручную

### В браузере (DevTools Console):
```javascript
// 1. Проверьте наличие токена
console.log('Token:', localStorage.getItem('token'));

// 2. Лайкнуть трек (замените 1 на ID трека)
fetch('/api/music/tracks/1/like', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log);

// 3. Получить избранные
fetch('/api/music/favorites', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(console.log);

// 4. Убрать лайк
fetch('/api/music/tracks/1/like', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(console.log);
```

### В базе данных:
```sql
-- Проверить таблицу
SELECT * FROM "TrackLikes" LIMIT 10;

-- Проверить лайки конкретного пользователя
SELECT tl.*, u.username, t.title 
FROM "TrackLikes" tl
JOIN users u ON tl."userId" = u.id
JOIN "Tracks" t ON tl."trackId" = t.id
WHERE u.id = 1;  -- замените на ID пользователя
```

## Возможные ошибки

### Ошибка: "column "updatedAt" does not exist"
**Решение:** Выполните миграцию `add-track-likes-updated-at.sql`

### Ошибка: "relation "TrackLikes" does not exist"
**Решение:** Выполните полную миграцию `add-music-module.sql`

### Ошибка: "Access token required"
**Решение:** Убедитесь, что пользователь авторизован и токен сохранен в localStorage

### Кнопка лайка не видна
**Решение:** 
- Наведите мышь на строку трека
- Убедитесь, что пользователь авторизован
- Лайкнутые треки показывают зеленое сердечко всегда

## Структура таблицы TrackLikes

```sql
CREATE TABLE "TrackLikes" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "trackId" INTEGER NOT NULL REFERENCES "Tracks"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "trackId")
);
```

## API endpoints

- `POST /api/music/tracks/:id/like` - Лайкнуть трек (требует auth)
- `DELETE /api/music/tracks/:id/like` - Убрать лайк (требует auth)
- `GET /api/music/favorites` - Получить избранные треки (требует auth)

## Проверка работы

1. ✅ Откройте страницу с музыкой
2. ✅ Войдите в систему
3. ✅ Наведите на трек - должна появиться кнопка сердечка
4. ✅ Нажмите на сердечко - оно должно стать зеленым и заполненным
5. ✅ Перезагрузите страницу - сердечко должно остаться зеленым
6. ✅ Откройте "Избранное" - трек должен быть там
7. ✅ Нажмите на зеленое сердечко снова - оно должно стать пустым
8. ✅ Трек должен исчезнуть из избранного
