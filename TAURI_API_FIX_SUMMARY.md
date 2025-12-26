# Исправление API в Tauri приложении

## Проблема
Десктопное приложение ErrorParty запускалось, но не отображало данных (пустая страница "Доброе утро"). Причина: API запросы использовали относительные пути (`/api/...`), которые не работают в Tauri приложении.

## Решение
Создана система определения базового URL API в зависимости от окружения:
- **В Tauri** → `https://errorparty.ru/api` (полный URL)
- **В браузере** → `/api` (относительный путь, проксируется через Nginx)

## Изменённые файлы

### 1. Создан `apiConfig.js`
**Файл:** `frontend/src/utils/apiConfig.js`
- `getApiUrl()` - определяет базовый URL на основе `window.__TAURI__`
- `getApiEndpoint(path)` - строит полный URL для endpoint
- `isTauriApp()` - проверка запуска в Tauri
- `apiFetch(path, options)` - wrapper для fetch с автоматической подстановкой URL и токена

### 2. Обновлён `apiClient.js`
**Файл:** `frontend/src/utils/apiClient.js`
- Заменён статический `API_URL` на динамический `getApiUrl()`
- Добавлен console.log для отладки: `API URL: ... | Tauri: true/false`

### 3. Обновлён `pwaHelper.js`
**Файл:** `frontend/src/utils/pwaHelper.js`
- Импорт `getApiUrl()` из `apiConfig.js`

### 4. Обновлены компоненты (11 файлов)

#### Pages (8 файлов):
- `HomePage.jsx` - импорт `getApiUrl()`
- `PlaylistsPage.jsx` - импорт `getApiUrl()`
- `MusicHomePage.jsx` - импорт `getApiUrl()`
- `MemesPage.jsx` - импорт `getApiUrl()`
- `SettingsPage.jsx` - импорт `apiFetch()`, замена всех `fetch('/api/...)`
- `ProfilePage.jsx` - импорт `apiFetch()`, замена `fetch('/api/auth/profile')`
- `DashboardPage.jsx` - импорт `getApiUrl()`
- `AdminPage.jsx` - импорт `getApiUrl()`

#### Components (3 файла):
- `Navbar.jsx` - импорт `apiFetch()`, замена `fetch('/api/auth/verify')`
- `music/MusicSidebar.jsx` - импорт `getApiUrl()`
- `music/TrackRow.jsx` - импорт `getApiUrl()`
- `UploadAlbumModal.jsx` - импорт `getApiUrl()`
- `GlobalMusicPlayer.jsx` - импорт `getApiUrl()`

#### App.jsx
- импорт `getApiUrl()`

## Сборка и деплой

### 1. Пересборка Tauri приложения
```bash
npm run tauri:build:windows
```
**Результат:**
- ✅ Компиляция: 45.28s (Rust 468 packages)
- ✅ Frontend build: 3.37s (Vite)
- ✅ Установщик NSIS: `ErrorParty_1.0.0_x64-setup.exe` (3.80 MB)
- ✅ Установщик MSI: `ErrorParty_1.0.0_x64_en-US.msi`

### 2. Деплой на production
```powershell
# Копирование установщика
Copy-Item src-tauri\target\...\ErrorParty_1.0.0_x64-setup.exe -Destination frontend\public\downloads\windows\

# Пересборка Docker frontend
docker-compose build frontend
docker-compose up -d frontend
docker-compose restart nginx
```

**Время сборки Docker:** 36.9s

## Тестирование

### Проверка API конфигурации
1. Запустить приложение: `src-tauri\target\...\errorparty.exe`
2. Открыть DevTools (F12)
3. В консоли должно быть:
   ```
   API URL: https://errorparty.ru/api | Tauri: true
   ```

### Проверка загрузки данных
1. Перейти в раздел "Музыка"
2. Проверить загрузку плейлистов и треков
3. В Network DevTools запросы должны идти на `https://errorparty.ru/api/`

### Проверка функционала
- ✅ Воспроизведение треков
- ✅ Системный трей (Show/Hide/Quit)
- ✅ Переключение между разделами

## Технические детали

### Определение окружения
```javascript
const isTauri = window.__TAURI__ !== undefined;
```

### Пример использования
```javascript
// Старый код
const response = await fetch('/api/auth/profile', { ... });

// Новый код
import { apiFetch } from '../utils/apiConfig';
const response = await apiFetch('/auth/profile', { ... });
```

### Axios (через apiClient)
```javascript
// Автоматически использует правильный базовый URL
import apiClient from '../utils/apiClient';
const response = await apiClient.get('/music/playlists');
```

## Результат
✅ Десктопное приложение теперь **корректно работает** с данными от backend API
✅ Новый установщик развёрнут на https://errorparty.ru/downloads/windows/ErrorParty_1.0.0_x64-setup.exe
✅ Страница загрузки: https://errorparty.ru/download

## След. шаги (опционально)
- [ ] Code signing для устранения SmartScreen
- [ ] macOS installer
- [ ] Linux installers (.deb, .AppImage, .rpm)
- [ ] Auto-update функциональность
