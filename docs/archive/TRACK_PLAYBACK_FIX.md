# Исправление проблем с воспроизведением треков

## Проблема
Плейлисты на главной странице не воспроизводились с ошибкой:
```
NotSupportedError: Failed to load because no supported source was found
```

## Причина
Треки в базе данных имели пустые или некорректные `streamUrl`, `filePath` и `externalUrl`, что приводило к невозможности воспроизведения.

## Внесённые исправления

### 1. Backend - Фильтрация невалидных треков

#### `music.controller.js`
- **`getPlaylist()`** - добавлена фильтрация треков без валидных источников
- **`getTracks()`** - добавлена фильтрация треков без валидных источников
- **`getTrack()`** - добавлена проверка наличия валидного источника с возвратом 404
- **`proxyExternalStream()`** - добавлена валидация URL перед проксированием

**Что проверяется:**
```javascript
const hasStreamUrl = track.streamUrl && track.streamUrl.trim() !== '';
const hasFilePath = track.filePath && track.filePath.trim() !== '';
const hasExternalUrl = track.externalUrl && track.externalUrl.trim() !== '';

if (!hasStreamUrl && !hasFilePath && !hasExternalUrl) {
  // Трек пропускается или возвращается ошибка
}
```

**Логирование:**
- Выводятся предупреждения для треков без источников
- Показывается сколько треков было отфильтровано
- Логируется информация о плейлистах

#### `streaming-strategy.service.js`
- Добавлена проверка наличия хоть какого-то источника в начале `getStreamUrl()`
- При отсутствии источников делается попытка emergency refresh через `musicSourceManager`
- Если refresh не удался - выбрасывается информативная ошибка

### 2. Frontend - Улучшенная обработка ошибок

#### `MusicPlayerContext.jsx`
- Улучшена обработка ошибок воспроизведения
- Добавлено детальное логирование проблемных треков
- Добавлена проверка наличия треков в очереди перед автопропуском
- Добавлена задержка 300мс перед попыткой воспроизведения следующего трека
- Расширен список обрабатываемых ошибок: `NotSupportedError`, `AbortError`, `NetworkError`

#### `MusicHomePage.jsx`
- Добавлено логирование загрузки плейлистов
- Добавлено предупреждение пользователю если плейлист пуст после фильтрации

### 3. Утилита для очистки БД

#### `check-invalid-tracks.js`
Новая утилита для поиска и удаления треков без валидных источников:

```bash
# Только проверка
node backend/check-invalid-tracks.js

# Удаление из плейлистов
node backend/check-invalid-tracks.js --remove

# Удаление из плейлистов и БД
node backend/check-invalid-tracks.js --remove --delete
```

**Функции:**
- Находит треки без streamUrl, filePath и externalUrl
- Показывает примеры невалидных треков
- Показывает затронутые плейлисты
- Опционально удаляет треки из плейлистов
- Опционально удаляет треки из базы данных

## Результат

После внесения изменений:

1. ✅ Треки без валидных источников автоматически фильтруются
2. ✅ Пользователь видит информативные сообщения
3. ✅ Плеер автоматически пропускает проблемные треки
4. ✅ Backend логирует проблемы для дальнейшего анализа
5. ✅ Можно легко найти и очистить невалидные треки из БД

## Рекомендации

1. **Запустить проверку БД:**
   ```bash
   cd backend
   node check-invalid-tracks.js
   ```

2. **Если найдены невалидные треки:**
   ```bash
   # Удалить из плейлистов но оставить в БД (для возможности восстановления)
   node check-invalid-tracks.js --remove
   
   # Или полностью удалить
   node check-invalid-tracks.js --remove --delete
   ```

3. **Настроить периодическую проверку:**
   - Добавить в cron job проверку невалидных треков
   - Настроить автоматическое обновление источников через `musicSourceManager`

4. **Мониторинг:**
   - Проверять логи backend на предупреждения о треках без источников
   - Следить за метриками skip rate треков

## Технические детали

### Порядок проверки источников в streaming-strategy

1. Локальный файл (`filePath` без http)
2. Популярные треки (автокеширование при `playCount >= 50`)
3. External URL в `filePath`
4. Encrypted URL (с попыткой расшифровки)
5. External URL в `streamUrl`
6. Emergency refresh через `musicSourceManager`
7. Ошибка "Track unavailable from all sources"

### API Responses

**404 для треков без источников:**
```json
{
  "success": false,
  "error": "Track source unavailable",
  "message": "This track has no valid audio source"
}
```

**404 для stream endpoint:**
```json
{
  "success": false,
  "error": "Track unavailable",
  "message": "Track has no valid source and refresh failed"
}
```
