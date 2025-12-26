# 🐳 KissVK Lightweight - Docker Setup

## ✅ Преимущества для Docker

**KissVK Lightweight идеален для Docker контейнеров:**

- ✅ **НЕ требует Chromium/Puppeteer** (экономия ~500 MB в образе)
- ✅ **Минимальное использование CPU** (2-5% вместо 30-50%)
- ✅ **Минимальное использование RAM** (10-20 MB вместо 900 MB)
- ✅ **Не требует дисковое пространство** (stream proxy)
- ✅ **Быстрая работа** (1-2 сек вместо 5-10 сек)

---

## 🚀 Текущая конфигурация

В `docker-compose.yml` уже настроено:

```yaml
backend:
  environment:
    - AUTO_IMPORT_ENABLED=false          # ⚠️ Старый Puppeteer (высокая нагрузка)
    - LIGHTWEIGHT_IMPORT_ENABLED=true    # ✅ Новый HTTP-only (низкая нагрузка)
```

**Рекомендация:** Оставьте `LIGHTWEIGHT_IMPORT_ENABLED=true` для минимальной нагрузки!

---

## 📦 Оптимизация Dockerfile (опционально)

Если хотите полностью убрать Puppeteer из образа:

### До (с Puppeteer - 1.2 GB):
```dockerfile
RUN apk add --no-cache curl postgresql-client netcat-openbsd \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### После (без Puppeteer - 700 MB):
```dockerfile
RUN apk add --no-cache curl postgresql-client netcat-openbsd

# Puppeteer больше не нужен для KissVK Lightweight!
```

**Экономия:** ~500 MB в Docker образе!

---

## 🎯 Использование в Docker

### 1. Запуск контейнера

```bash
docker-compose up -d backend
```

### 2. Проверка работы

```bash
# Проверить что контейнер запущен
docker-compose ps

# Проверить логи
docker-compose logs -f backend

# Проверить API
curl http://localhost:3001/api/kissvk-light/stats
```

### 3. Использование API

```bash
# Превью треков
curl "http://localhost:3001/api/kissvk-light/preview?url=https://kissvk.top/&limit=5"

# Поиск
curl "http://localhost:3001/api/kissvk-light/search?q=Скриптонит&limit=3"

# Статистика
curl http://localhost:3001/api/kissvk-light/stats
```

---

## 📊 Мониторинг ресурсов

### Проверка использования ресурсов

```bash
# Общая статистика контейнера
docker stats errorparty_backend

# Детальная информация
docker stats errorparty_backend --no-stream
```

### Ожидаемые значения с KissVK Lightweight:

```
CONTAINER            CPU %     MEM USAGE / LIMIT    MEM %
errorparty_backend   2-5%      200 MB / 4 GB        5%
```

### С Puppeteer (старая система):

```
CONTAINER            CPU %     MEM USAGE / LIMIT    MEM %
errorparty_backend   30-50%    1.2 GB / 4 GB        30%
```

**Разница:** В 10 раз меньше нагрузка! 🎉

---

## 🔧 Конфигурация лимитов

В `docker-compose.yml` уже установлены разумные лимиты:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 4G
      reservations:
        cpus: '1.0'
        memory: 1G
```

С **KissVK Lightweight** можно снизить лимиты:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2.0'      # Было: 4.0
        memory: 2G       # Было: 4G
      reservations:
        cpus: '0.5'      # Было: 1.0
        memory: 512M     # Было: 1G
```

**Экономия:** Половина ресурсов для контейнера!

---

## 🌐 Проверка из контейнера

### Зайти в контейнер

```bash
docker exec -it errorparty_backend sh
```

### Внутри контейнера

```sh
# Проверить что сервис работает
curl http://localhost:3000/api/kissvk-light/stats

# Запустить тесты
node test-kissvk-lightweight.js

# Проверить использование памяти
ps aux | grep node

# Выйти
exit
```

---

## 📝 Docker Compose - Полная конфигурация

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: errorparty_backend
  restart: unless-stopped
  deploy:
    resources:
      limits:
        cpus: '2.0'          # Снижено благодаря Lightweight
        memory: 2G           # Снижено благодаря Lightweight
      reservations:
        cpus: '0.5'
        memory: 512M
  environment:
    # KissVK Configuration
    - AUTO_IMPORT_ENABLED=false          # ⚠️ Puppeteer disabled (high CPU)
    - LIGHTWEIGHT_IMPORT_ENABLED=true    # ✅ Lightweight enabled (low CPU)
    
    # Rate Limiting (опционально)
    - KISSVK_RATE_LIMIT_DELAY=1000       # 1 сек между запросами
    - KISSVK_MAX_CONCURRENT=2            # Макс 2 параллельных
    - KISSVK_CACHE_TTL=3600000           # Кеш 1 час (мс)
  volumes:
    - uploads:/app/uploads
  ports:
    - "3001:3000"
```

---

## 🔥 Горячая перезагрузка

### Обновить код без пересборки

```bash
# Перезапустить контейнер
docker-compose restart backend

# Или пересобрать образ
docker-compose build backend
docker-compose up -d backend
```

### Применить изменения в конфигурации

```bash
# Изменить docker-compose.yml
# Затем:
docker-compose up -d backend
```

---

## 🐛 Отладка в Docker

### Просмотр логов

```bash
# Последние 100 строк
docker-compose logs --tail=100 backend

# В реальном времени
docker-compose logs -f backend

# Только KissVK логи
docker-compose logs -f backend | grep "KissVK"
```

### Проверка сетевого доступа

```bash
# Из контейнера
docker exec -it errorparty_backend sh
curl https://kissvk.top/
exit

# Извне
curl http://localhost:3001/api/kissvk-light/stats
```

---

## 📈 Производительность в Docker

### KissVK Lightweight (рекомендуется)

```
✅ CPU: 2-5%
✅ RAM: 200-300 MB (весь backend)
✅ Disk I/O: Минимальный (только кеш)
✅ Network: ~100-500 KB/s (при стриминге)
✅ Startup: ~2 сек
```

### Puppeteer (старая система)

```
❌ CPU: 30-50%
❌ RAM: 1.2-1.5 GB (весь backend)
❌ Disk I/O: Высокий (скачивание файлов)
❌ Network: ~5-10 MB/s (при скачивании)
❌ Startup: ~10-15 сек (запуск браузеров)
```

---

## ⚙️ Переменные окружения

Добавьте в `.env` файл (опционально):

```env
# KissVK Lightweight Configuration
KISSVK_BASE_URL=https://kissvk.top
KISSVK_RATE_LIMIT_DELAY=1000
KISSVK_MAX_CONCURRENT=2
KISSVK_CACHE_TTL=3600000
KISSVK_REQUEST_TIMEOUT=15000

# Disable old Puppeteer scheduler
AUTO_IMPORT_ENABLED=false

# Enable new Lightweight scheduler
LIGHTWEIGHT_IMPORT_ENABLED=true
```

---

## 🚨 Важные замечания

### 1. Сеть внутри Docker

API доступен на порту **3000** внутри контейнера, но на **3001** снаружи:

```yaml
ports:
  - "3001:3000"  # хост:контейнер
```

Используйте:
- **Внутри контейнера:** `http://localhost:3000/api/kissvk-light/*`
- **Снаружи:** `http://localhost:3001/api/kissvk-light/*`

### 2. Volumes для кеша (опционально)

Если хотите сохранять кеш между перезапусками:

```yaml
backend:
  volumes:
    - uploads:/app/uploads
    - kissvk_cache:/app/cache  # Новый volume для кеша
```

### 3. Health Check

API автоматически проверяется через healthcheck:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

---

## 📚 Дополнительные ресурсы

1. **[Основная документация](KISSVK_LIGHTWEIGHT.md)** - полное описание
2. **[Быстрый старт](KISSVK_LIGHTWEIGHT_QUICKSTART.md)** - начать за 3 минуты
3. **[Примеры API](KISSVK_LIGHTWEIGHT_EXAMPLES.md)** - все примеры запросов
4. **[Docker Compose файл](../docker-compose.yml)** - конфигурация

---

## 🎉 Итог для Docker

**KissVK Lightweight** - идеальное решение для Docker:

✅ Минимальная нагрузка на CPU и RAM  
✅ Не требует Puppeteer/Chromium  
✅ Быстрый старт контейнера  
✅ Экономия дискового пространства  
✅ Простая масштабируемость  

**Рекомендация:** Используйте `/api/kissvk-light/*` в Docker окружении!

---

**Статус:** ✅ Готово к использованию в Docker  
**Версия:** 1.0.0  
**Дата:** 2025-12-12
