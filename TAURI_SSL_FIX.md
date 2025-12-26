# Решение проблемы SSL в Tauri приложении

## Проблема
При запуске Tauri приложения появлялась ошибка:
```
Ваше подключение не является закрытым
net::ERR_CERT_COMMON_NAME_INVALID
Сертификат безопасности выдан errorparty.ru, но запрос к tauri.localhost
```

## Причина
1. **Tauri использует `tauri://localhost`** для загрузки фронтенда
2. **Ресурсы загружались с `https://errorparty.ru`** (изображения, аудио)
3. **Браузер видел несоответствие** между доменом приложения и доменом ресурсов
4. **SSL сертификат для errorparty.ru** не валиден для `tauri.localhost`

## Решение

### 1. Обновлён CSP (Content Security Policy)
**Файл:** `src-tauri/tauri.conf.json`

**Было:**
```json
"csp": "default-src 'self'; connect-src 'self' https://errorparty.ru..."
```

**Стало:**
```json
"csp": "default-src 'self' tauri://localhost; 
        connect-src 'self' tauri://localhost https://errorparty.ru wss://errorparty.ru; 
        img-src 'self' tauri://localhost data: https://errorparty.ru https://media.steampowered.com; 
        media-src 'self' tauri://localhost https://errorparty.ru blob:; 
        script-src 'self' tauri://localhost 'unsafe-inline' 'unsafe-eval'"
```

**Изменения:**
- Добавлен `tauri://localhost` во все директивы
- Добавлен `wss://errorparty.ru` для WebSocket
- Добавлен `https://media.steampowered.com` для Steam аватаров
- Добавлен `'unsafe-eval'` для HLS.js (требуется для работы)
- Явно указан `url: "tauri://localhost"` в конфиге окна

### 2. Создан resourceHelper.js
**Файл:** `frontend/src/utils/resourceHelper.js`

Функции для корректной загрузки ресурсов:
```javascript
// Конвертирует относительные URL в абсолютные для Tauri
export const getResourceUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  if (isTauriApp()) {
    return `https://errorparty.ru${url}`;
  }
  return url;
};

// Для изображений
export const getImageUrl = (source) => { ... }

// Для аудио
export const getAudioUrl = (track) => { ... }
```

### 3. Обновлён MusicPlayerContext
**Файл:** `frontend/src/contexts/MusicPlayerContext.jsx`

**Было:**
```javascript
const streamUrl = `/api/music/tracks/${track.id}/stream`;
```

**Стало:**
```javascript
import { getApiEndpoint } from '../utils/apiConfig';
const streamUrl = getApiEndpoint(`/music/tracks/${track.id}/stream`);
// В Tauri: https://errorparty.ru/api/music/tracks/123/stream
// В браузере: /api/music/tracks/123/stream
```

### 4. Обновлён GlobalMusicPlayer
**Файл:** `frontend/src/components/GlobalMusicPlayer.jsx`

**Было:**
```jsx
<img src={currentTrack.coverUrl} />
<img src={track.coverUrl} />
```

**Стало:**
```jsx
import { getImageUrl } from '../utils/resourceHelper';
<img src={getImageUrl(currentTrack.coverUrl)} />
<img src={getImageUrl(track.coverUrl)} />
```

## Что происходит теперь

### В Tauri приложении:
1. **Приложение загружается** с `tauri://localhost`
2. **API запросы идут** на `https://errorparty.ru/api/...`
3. **Изображения загружаются** с `https://errorparty.ru/uploads/...`
4. **Аудио стримится** с `https://errorparty.ru/api/music/tracks/.../stream`
5. **CSP разрешает** все эти источники

### В браузере:
1. **Приложение загружается** с `http://localhost:5173` (dev) или `/` (prod)
2. **API запросы идут** на `/api/...` (проксируются Nginx)
3. **Изображения загружаются** относительно домена
4. **Всё работает как раньше**

## Технические детали

### Определение окружения
```javascript
// apiConfig.js
const isTauri = window.__TAURI__ !== undefined;
```

### Схема URL в разных средах

| Ресурс | Браузер | Tauri |
|--------|---------|-------|
| API | `/api/music/playlists` | `https://errorparty.ru/api/music/playlists` |
| Изображения | `/uploads/covers/song.jpg` | `https://errorparty.ru/uploads/covers/song.jpg` |
| Аудио стрим | `/api/music/tracks/1/stream` | `https://errorparty.ru/api/music/tracks/1/stream` |
| Приложение | `/` | `tauri://localhost` |

### HLS.js конфигурация
```javascript
hlsRef.current = new Hls({
  xhrSetup: (xhr, url) => {
    xhr.withCredentials = false; // Отключено для cross-origin
    xhr.timeout = 10000;
  },
  // ... остальные настройки
});
```

## Результат
✅ Нет ошибок SSL сертификата
✅ Ресурсы загружаются корректно
✅ Аудио воспроизводится
✅ Изображения отображаются
✅ API запросы работают

## Тестирование

### 1. Проверка загрузки ресурсов
1. Запустить приложение
2. F12 → Console должно быть:
   - `API URL: https://errorparty.ru/api | Tauri: true`
   - Нет ошибок `ERR_CERT_COMMON_NAME_INVALID`

### 2. Проверка Network
1. F12 → Network
2. Фильтр: `errorparty.ru`
3. Должны быть запросы:
   - `https://errorparty.ru/api/music/playlists` (200 OK)
   - `https://errorparty.ru/api/music/tracks/.../stream` (200 OK)
   - `https://errorparty.ru/uploads/...` (200 OK)

### 3. Проверка воспроизведения
1. Перейти в "Музыка"
2. Выбрать трек
3. Нажать Play
4. Аудио должно воспроизводиться без ошибок

## След. шаги (если нужны)
- [ ] Добавить обработку ошибок загрузки ресурсов
- [ ] Кэширование изображений
- [ ] Offline режим
- [ ] Service Worker для кэширования
