# Настройка интеграции с VK Music

## Получение VK Access Token

### Метод 1: Через официальное приложение Kate Mobile

1. Установите Kate Mobile на Android или используйте эмулятор
2. Авторизуйтесь в приложении
3. Используйте прокси-сниффер (Charles/Fiddler) для перехвата токена
4. Найдите запросы к api.vk.com и скопируйте `access_token`

### Метод 2: Через VK OAuth (простой способ)

1. Откройте в браузере:
```
https://oauth.vk.com/authorize?client_id=2274003&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=audio,offline&response_type=token&v=5.131
```

2. Авторизуйтесь и разрешите доступ
3. Вы будете перенаправлены на blank.html
4. В адресной строке будет URL вида:
```
https://oauth.vk.com/blank.html#access_token=YOUR_TOKEN_HERE&expires_in=0&user_id=123456
```

5. Скопируйте значение `access_token`

### Метод 3: Через VK Admin Panel

1. Создайте Standalone приложение в VK API: https://vk.com/apps?act=manage
2. Получите access_token через Implicit Flow
3. Укажите права доступа: audio, offline

## Настройка в проекте

### Через переменные окружения:

Создайте файл `.env` в папке `backend/`:

```env
VK_ACCESS_TOKEN=vk1.a.YOUR_TOKEN_HERE
```

### Через Docker Compose:

Добавьте в `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - VK_ACCESS_TOKEN=vk1.a.YOUR_TOKEN_HERE
```

### Проверка работы:

```bash
docker exec errorparty_backend node /app/test-vk-integration.js
```

## Ограничения VK API

- **Rate Limit**: 3 запроса в секунду
- **Токен**: Может иметь срок действия (используйте offline права)
- **Аудио**: Некоторые треки могут быть недоступны из-за региональных ограничений

## Возможности после настройки

✅ Поиск треков по названию/исполнителю
✅ Получение прямых ссылок на MP3 (до 320 kbps)
✅ Автоматическое заполнение альбомов треками
✅ Получение рекомендаций и популярных треков
✅ Скачивание музыки без ограничений

## Альтернативы (если VK недоступен)

Проект автоматически использует fallback на:
- Lmusic.kz (русская/казахская музыка)
- Musify.club (международная база)
