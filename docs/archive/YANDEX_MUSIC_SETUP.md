# Установка Yandex Music API для Python

## Инструкция

### 1. Установить yandex-music библиотеку в контейнер:

```bash
docker exec errorparty_backend pip3 install yandex-music
```

### 2. Получить токен Яндекс.Музыка

#### Способ 1: Через браузер (рекомендуется)

1. Откройте https://oauth.yandex.ru/
2. Нажмите "Зарегистрировать приложение"
3. Заполните:
   - Название: "Music App"
   - Платформы: Web-сервисы
   - Redirect URI: https://oauth.yandex.ru/verification_code
4. Права доступа: выберите все для Яндекс.Музыка
5. Получите Client ID
6. Перейдите по ссылке:
   ```
   https://oauth.yandex.ru/authorize?response_type=token&client_id=YOUR_CLIENT_ID
   ```
7. Скопируйте токен из URL после авторизации

#### Способ 2: Через готовое приложение

Используйте токен от уже существующего приложения:
```bash
# Токен из Yandex Music Desktop App
# Находится в DevTools -> Application -> Local Storage
```

#### Способ 3: Программно (Python)

```python
from yandex_music import Client

# Получить токен по логину/паролю (устарело, может не работать)
# Yandex изменил API, теперь требуется OAuth

# Работа без токена (ограниченная функциональность)
client = Client()
client.init()
```

### 3. Добавить токен в .env

```env
# Яндекс.Музыка
YANDEX_MUSIC_TOKEN=your_token_here
```

### 4. Перезапустить контейнер

```bash
docker-compose restart backend
```

## Тестирование

### Проверить установку:

```bash
docker exec errorparty_backend python3 -c "import yandex_music; print(yandex_music.__version__)"
```

### Получить чарт:

```bash
docker exec errorparty_backend python3 /app/scripts/yandex_music_api.py chart
```

### Поиск:

```bash
docker exec errorparty_backend python3 /app/scripts/yandex_music_api.py search "Imagine Dragons" 5
```

## Альтернатива: Работа без токена

Без токена доступны:
- ✅ Топ-чарты (chart)
- ✅ Поиск треков
- ✅ Информация о треках
- ❌ Скачивание (только 30 секунд preview)
- ❌ Личные плейлисты
- ❌ История прослушивания

Для базового импорта чартов токен НЕ обязателен!

## Использование из Node.js

```javascript
const yandexMusic = require('./src/services/yandex-music-python.service');

// Получить топ-100
const chart = await yandexMusic.getRussianTop100();

// Поиск
const tracks = await yandexMusic.searchTracks('Imagine Dragons', 10);

// Получить URL (требует токен)
const url = await yandexMusic.getTrackUrl('12345:67890');
```

## Документация

Полная документация: https://yandex-music.readthedocs.io/

## Troubleshooting

### ModuleNotFoundError: No module named 'yandex_music'
```bash
docker exec errorparty_backend pip3 install yandex-music
```

### JSONDecodeError
Проверьте, что Python скрипт выполняется корректно:
```bash
docker exec errorparty_backend python3 /app/scripts/yandex_music_api.py chart
```

### Ошибки авторизации
- Проверьте токен в .env
- Токены имеют срок действия
- Получите новый токен
