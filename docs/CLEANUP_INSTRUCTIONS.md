# 🗑️ Удаление устаревших файлов KissVK

## Файлы для удаления

После оптимизации модуля музыки следующие файлы больше не используются и могут быть безопасно удалены:

### Устаревшие сервисы
```powershell
Remove-Item "backend\src\services\kissvk-lightweight.service.js"
Remove-Item "backend\src\services\kissvk-puppeteer.service.js"
```

**Причина:** Объединены в единый оптимизированный `kissvk.service.js`

### Устаревшие контроллеры
```powershell
Remove-Item "backend\src\controllers\kissvk-import.controller.js"
Remove-Item "backend\src\controllers\kissvk-stream-proxy.controller.js"
```

**Причина:** Заменены на минимальный `kissvk.controller.js`

### Устаревшие роуты
```powershell
Remove-Item "backend\src\routes\kissvk-import.routes.js"
Remove-Item "backend\src\routes\kissvk-lightweight.routes.js"
Remove-Item "backend\src\routes\kissvk.routes.js" # Если существует дубликат
```

**Причина:** Объединены в `backend\src\modules\music\kissvk.routes.js`

### Устаревшие планировщики
```powershell
Remove-Item "backend\src\schedulers\lightweight-music-import.scheduler.js"
Remove-Item "backend\src\schedulers\music-auto-import.scheduler.js"
Remove-Item "backend\src\schedulers\kissvk-auto.scheduler.js"
```

**Причина:** Автоматические импорты отключены в новой версии

### Дополнительные роуты (если есть)
```powershell
Remove-Item "backend\src\modules\music\music-ai.routes.js" # AI функции
Remove-Item "backend\src\modules\music\auto-import.routes.js" # Автоимпорт
```

**Причина:** Не используются в минимальной версии

### Старые тестовые файлы
```powershell
# В корне backend/
Remove-Item "backend\test-kissvk-auto.js"
Remove-Item "backend\test-kissvk-lightweight.js"
Remove-Item "backend\test-kissvk-decode-real.js"
Remove-Item "backend\trigger-kissvk-import.js"
```

**Причина:** Заменены на `test-kissvk-optimized.js`

## ⚠️ НЕ удалять!

Следующие файлы необходимы для работы:

✅ `backend\src\services\kissvk.service.js` - Основной сервис  
✅ `backend\src\controllers\kissvk.controller.js` - Основной контроллер  
✅ `backend\src\modules\music\kissvk.routes.js` - Роуты  
✅ `backend\src\utils\vk-audio-decoder-v3.js` - Декодер  
✅ `backend\src\modules\music\index.js` - Инициализация модуля  

## Команда для удаления всех устаревших файлов

```powershell
# PowerShell скрипт для удаления всех устаревших файлов

# Устаревшие сервисы
Remove-Item "backend\src\services\kissvk-lightweight.service.js" -ErrorAction SilentlyContinue
Remove-Item "backend\src\services\kissvk-puppeteer.service.js" -ErrorAction SilentlyContinue

# Устаревшие контроллеры
Remove-Item "backend\src\controllers\kissvk-import.controller.js" -ErrorAction SilentlyContinue
Remove-Item "backend\src\controllers\kissvk-stream-proxy.controller.js" -ErrorAction SilentlyContinue

# Устаревшие роуты
Remove-Item "backend\src\routes\kissvk-import.routes.js" -ErrorAction SilentlyContinue
Remove-Item "backend\src\routes\kissvk-lightweight.routes.js" -ErrorAction SilentlyContinue

# Устаревшие планировщики
Remove-Item "backend\src\schedulers\lightweight-music-import.scheduler.js" -ErrorAction SilentlyContinue
Remove-Item "backend\src\schedulers\music-auto-import.scheduler.js" -ErrorAction SilentlyContinue
Remove-Item "backend\src\schedulers\kissvk-auto.scheduler.js" -ErrorAction SilentlyContinue

# Старые тесты
Remove-Item "backend\test-kissvk-auto.js" -ErrorAction SilentlyContinue
Remove-Item "backend\test-kissvk-lightweight.js" -ErrorAction SilentlyContinue
Remove-Item "backend\test-kissvk-decode-real.js" -ErrorAction SilentlyContinue
Remove-Item "backend\trigger-kissvk-import.js" -ErrorAction SilentlyContinue

Write-Host "✅ Устаревшие файлы удалены!" -ForegroundColor Green
```

## Проверка

После удаления проверьте, что сервер запускается без ошибок:

```powershell
cd backend
npm start
```

И запустите тест:

```powershell
node ..\test-kissvk-optimized.js
```

## Размер экономии

Примерный размер удаляемых файлов:
- `kissvk-puppeteer.service.js` (~40KB)
- `kissvk-lightweight.service.js` (~18KB)
- Контроллеры (~25KB)
- Планировщики (~20KB)
- Тесты (~10KB)

**Общая экономия:** ~113KB кода + упрощение архитектуры
