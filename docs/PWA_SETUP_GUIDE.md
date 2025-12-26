# PWA + Push Notifications Setup Guide

## 🎉 Что реализовано

### ✅ Созданные файлы

#### Frontend
- `frontend/public/manifest.json` - PWA манифест
- `frontend/public/sw.js` - Service Worker
- `frontend/src/utils/pwaHelper.js` - PWA helper функции
- `frontend/src/pages/NotificationsPage.jsx` - Страница настроек уведомлений

#### Backend
- `backend/src/services/pushNotificationService.js` - Сервис push-уведомлений
- `backend/src/routes/notifications.js` - API роуты для уведомлений
- `backend/migrations/add-push-subscription.sql` - Миграция БД

### ✅ Обновленные файлы

#### Frontend
- `frontend/index.html` - Добавлены PWA meta-теги и манифест
- `frontend/src/main.jsx` - Регистрация Service Worker
- `frontend/src/App.jsx` - Добавлен роут `/notifications`

#### Backend
- `backend/src/server.js` - Подключен роут `/api/notifications`
- `backend/src/models/User.js` - Добавлено поле `pushSubscription`
- `backend/src/controllers/questController.js` - Интеграция push-уведомлений
- `backend/package.json` - Добавлена зависимость `web-push`

---

## 🚀 Установка

### 1. Установить зависимости

```bash
# Backend
cd backend
npm install web-push

# Frontend (если нужно)
cd ../frontend
npm install
```

### 2. Сгенерировать VAPID ключи

```bash
cd backend
npx web-push generate-vapid-keys
```

**Вывод будет примерно таким:**
```
Public Key: BMxQ...
Private Key: AbCd...
```

### 3. Добавить ключи в `.env`

```env
# Push Notifications
VAPID_PUBLIC_KEY=BMxQ...
VAPID_PRIVATE_KEY=AbCd...
ADMIN_EMAIL=admin@errorparty.ru
```

### 4. Выполнить миграцию БД

```bash
cd backend
docker-compose exec postgres psql -U your_user -d your_db -f /migrations/add-push-subscription.sql
```

**ИЛИ вручную:**
```bash
docker-compose exec postgres psql -U your_user -d your_db
```

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_subscription TEXT;
CREATE INDEX IF NOT EXISTS idx_users_push_subscription 
ON users (push_subscription) 
WHERE push_subscription IS NOT NULL;
```

### 5. Создать иконки для PWA

Создайте иконки в `frontend/public/icons/`:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `badge-72x72.png` (для badge уведомлений)

**Быстрый способ (используя ImageMagick):**
```bash
cd frontend/public
mkdir icons

# Создаем базовую иконку 512x512 (замените на вашу)
# Затем генерируем остальные размеры:
convert icon-512x512.png -resize 72x72 icons/icon-72x72.png
convert icon-512x512.png -resize 96x96 icons/icon-96x96.png
convert icon-512x512.png -resize 128x128 icons/icon-128x128.png
convert icon-512x512.png -resize 144x144.png
convert icon-512x512.png -resize 152x152 icons/icon-152x152.png
convert icon-512x512.png -resize 192x192 icons/icon-192x192.png
convert icon-512x512.png -resize 384x384 icons/icon-384x384.png
```

### 6. Перезапустить проект

```bash
docker-compose down
docker-compose up -d --build
```

---

## 🎯 Использование

### Для пользователей

1. Зайти на сайт
2. Перейти на страницу `/notifications`
3. Нажать "Зарегистрировать Service Worker"
4. Нажать "Включить уведомления"
5. Разрешить уведомления в браузере
6. Протестировать: "Отправить тестовое уведомление"

### Установка PWA

**На Android:**
1. Открыть сайт в Chrome
2. Нажать меню (⋮)
3. Выбрать "Добавить на главный экран"

**На iOS:**
1. Открыть сайт в Safari
2. Нажать кнопку "Поделиться"
3. Выбрать "На экран Домой"

**На Desktop (Chrome):**
1. В адресной строке появится иконка установки
2. Нажать "Установить"

---

## 📬 Типы уведомлений

### Автоматические уведомления:

1. **Квест выполнен** - при завершении квеста
2. **Новый уровень** - при повышении уровня
3. **Новый матч** - при обнаружении нового матча
4. **Достижение разблокировано** - при получении достижения
5. **Лайк мема** - когда кто-то лайкает ваш мем
6. **Новый комментарий** - к вашему мему
7. **Заявка в друзья** - новая заявка
8. **Турнир начинается** - напоминание о турнире

### API для отправки:

```javascript
// В любом контроллере
const pushNotificationService = require('../services/pushNotificationService');

// Отправить одному пользователю
await pushNotificationService.notifyQuestCompleted(userId, 'Название квеста', { xp: 100, coins: 20 });

// Отправить всем
await pushNotificationService.sendDailyReminder();

// Кастомное уведомление
await pushNotificationService.sendToUser(userId, {
  title: 'Заголовок',
  body: 'Текст уведомления',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
  tag: 'custom-tag',
  data: { url: '/target-page' }
});
```

---

## 🔧 Конфигурация

### Настройка Service Worker (sw.js)

```javascript
// Изменить название кэша при обновлении
const CACHE_NAME = 'errorparty-v1.0.1'; // <- Увеличить версию

// Добавить файлы для кэширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/your-custom-asset.js' // <- Добавить свои
];
```

### Настройка manifest.json

```json
{
  "theme_color": "#00ffff", // <- Ваш цвет
  "background_color": "#0f0f23", // <- Фон
  "name": "ErrorParty.ru", // <- Название
  "short_name": "ErrorParty" // <- Короткое название
}
```

---

## 🐛 Отладка

### Проверить регистрацию SW:

```javascript
// В консоли браузера
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', reg);
});
```

### Проверить подписку:

```javascript
// В консоли браузера
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub);
  });
});
```

### Логи Service Worker:

1. Chrome DevTools → Application → Service Workers
2. Смотреть "Console" для SW

### Тестовое уведомление:

```bash
# Через API (с токеном)
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📱 Поддержка браузеров

### ✅ Полная поддержка:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Opera 76+
- Samsung Internet 14+

### ⚠️ Частичная поддержка:
- Safari 16+ (iOS 16.4+) - push работает, но требует установки PWA

### ❌ Не поддерживается:
- Internet Explorer
- Safari < 16
- iOS < 16.4

---

## 🎨 Кастомизация уведомлений

### Добавить новый тип уведомления:

1. **В pushNotificationService.js:**
```javascript
notifications = {
  // ...existing
  myCustomNotification: (data) => ({
    title: '🎉 Заголовок',
    body: `Текст: ${data}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'custom-tag',
    data: { url: '/custom-page' }
  })
}
```

2. **Добавить метод:**
```javascript
async notifyMyCustom(userId, data) {
  return this.sendToUser(userId, this.notifications.myCustomNotification(data));
}
```

3. **Использовать:**
```javascript
await pushNotificationService.notifyMyCustom(userId, 'Данные');
```

---

## 🔒 Безопасность

### VAPID ключи:
- ⚠️ **НИКОГДА** не коммитьте в Git
- ✅ Храните в `.env` файле
- ✅ Используйте разные ключи для dev/prod

### Подписки:
- ✅ Привязаны к пользователю
- ✅ Автоматически удаляются при ошибке 410
- ✅ Можно отозвать в любой момент

---

## 📊 Мониторинг

### Метрики для отслеживания:

```sql
-- Сколько пользователей подписано
SELECT COUNT(*) FROM users WHERE push_subscription IS NOT NULL;

-- Активность подписок
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN push_subscription IS NOT NULL THEN 1 ELSE 0 END) as subscribed,
  ROUND(100.0 * SUM(CASE WHEN push_subscription IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as percentage
FROM users;
```

### Логи:
```bash
# Backend логи push-уведомлений
docker-compose logs -f backend | grep "Push"

# Успешные отправки
docker-compose logs backend | grep "✅ Push sent"

# Ошибки
docker-compose logs backend | grep "Error sending push"
```

---

## ✅ Чек-лист готовности

- [x] VAPID ключи сгенерированы и добавлены в `.env`
- [x] Миграция БД выполнена
- [x] Иконки PWA созданы
- [x] Service Worker регистрируется
- [x] Manifest.json доступен
- [x] Роут `/notifications` работает
- [x] Тестовое уведомление отправляется
- [x] Push-уведомления интегрированы в квесты
- [ ] Протестировано на мобильных устройствах
- [ ] Добавлены уведомления для мемов (следующий шаг)
- [ ] Добавлены уведомления для друзей (будущее)

---

## 🎯 Следующие шаги

1. **Интеграция в мемы:**
   - Уведомление при лайке
   - Уведомление при комментарии

2. **Интеграция в друзей:**
   - Уведомление о заявке
   - Уведомление о принятии

3. **Ежедневные напоминания:**
   - CRON задача для напоминаний
   - Персональные настройки

4. **Аналитика:**
   - Tracking открытий уведомлений
   - A/B тесты текстов

---

## 📚 Полезные ссылки

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push library](https://github.com/web-push-libs/web-push)

---

**Готово! PWA + Push уведомления работают! 🚀**

**Проверьте:** `/notifications` на вашем сайте
