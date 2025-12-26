# 🎵 Архитектура источников музыки

## ✅ АКТУАЛЬНАЯ СТРАТЕГИЯ (Декабрь 2025)

### 🎯 **iTunes RSS → Lmusic.kz (РЕКОМЕНДУЕТСЯ)**

**Концепция:** Используем iTunes для получения метаданных о популярных треках, затем находим полные версии на Lmusic.kz

#### Почему эта схема лучше?

✅ **iTunes RSS API:**
- Бесплатный публичный API (без регистрации)
- Актуальные чарты по всем странам мира
- Метаданные о популярных треках/альбомах
- Обновляется ежедневно
- ❌ НЕТ полных треков (только 30-сек preview)

✅ **Lmusic.kz:**
- Полные треки с прямыми ссылками
- Не требует авторизацию
- Быстрый поиск
- Стабильные MP3 URL

#### Использование:

```bash
# Импорт через CLI
docker exec errorparty_backend node /app/import-itunes-to-lmusic.js

# Импорт через API
POST /api/admin/music/itunes-to-lmusic/import-tracks
{
  "countries": ["us", "ru", "gb"],
  "limitPerCountry": 50
}
```

**Файлы:**
- `backend/import-itunes-to-lmusic.js` - главный скрипт
- `backend/src/modules/music/admin-music.controller.js` - API контроллеры
- `ITUNES_LMUSIC_QUICKSTART.md` - краткая справка

---

## 📊 Правильное использование источников

### iTunes/Apple Music API ✅ **ТОЛЬКО МЕТАДАННЫЕ**

**Назначение:** Источник информации о популярности и трендах

**Что берем:**
- ✅ Списки чартов (топ-100 по странам)
- ✅ Информацию о новых альбомах
- ✅ Метаданные треков (название, исполнитель, жанр)
- ✅ Обложки альбомов
- ✅ Позиции в чартах
- ✅ Рейтинг популярности

**Что НЕ берем:**
- ❌ Preview URL (30 сек) - НЕ ИМПОРТИРОВАТЬ!
- ❌ Прямые ссылки на треки
- ❌ Stream URL

**Workflow:**
```
iTunes API → получить метаданные
          ↓
   найти исполнителя + название
          ↓
   искать ПОЛНЫЙ трек на других источниках
          ↓
   VK Music / Lmusic.kz / Яндекс.Музыка
```

---

## 🎯 Источники для импорта МУЗЫКИ

### 1. VK Music API ⭐ **ПРИОРИТЕТ #1**

**Статус:** ✅ Работает

**Плюсы:**
- Полные треки (не preview)
- Огромная база (русская + зарубежная музыка)
- Стабильный API через Kate Mobile
- Поддержка поиска и топов

**Минусы:**
- Требует авторизацию (логин/пароль или токен)
- Нужен обход через vkaudiotoken

**Использование:**
```javascript
const vkMusic = require('./vk-music.service');
const tracks = await vkMusic.searchTracks('The Weeknd Blinding Lights', 5);
const popular = await vkMusic.getPopularTracks(100);
```

**Файлы:**
- `backend/src/services/vk-music.service.js`
- `backend/load-vk-full-music.js`

---

### 2. Lmusic.kz ⭐ **ПРИОРИТЕТ #2**

**Статус:** ✅ Работает

**Плюсы:**
- Полные треки с прямыми ссылками
- Не требует авторизацию
- Хороший поиск
- Быстрый API

**Минусы:**
- Казахстанский сервис (может быть недоступен из других регионов)
- Нестабильная база данных

**Использование:**
```javascript
const lmusic = require('./modules/music/lmusic-kz.service');
const tracks = await lmusic.searchTracks('Imagine Dragons', 10);
```

**Файлы:**
- `backend/src/modules/music/lmusic-kz.service.js`

---

### 3. Яндекс.Музыка API ⭐ **ПРИОРИТЕТ #3**

**Статус:** ⚠️ Требует настройку

**Плюсы:**
- Официальный API
- Качественные треки
- Хорошая база русской музыки
- Топ-чарты России

**Минусы:**
- Требует токен (OAuth)
- Ограниченная функциональность без токена
- Preview (30 сек) без подписки

**С токеном доступно:**
- ✅ Полные треки
- ✅ Скачивание
- ✅ Личные плейлисты

**Без токена доступно:**
- ✅ Топ-чарты
- ✅ Поиск
- ⚠️ Только preview (30 сек)

**Использование:**
```javascript
const yandexMusic = require('./yandex-music.service');
const tracks = await yandexMusic.getRussianTop100();
const search = await yandexMusic.searchTracks('Моргенштерн', 10);
```

**Файлы:**
- `backend/src/modules/music/yandex-music.service.js`
- `backend/src/services/yandex-music-python.service.js`

---

### 4. Musify.club ⚠️

**Статус:** ⚠️ Нестабильно

**Проблемы:**
- Не всегда находит stream URL
- API может быть недоступен
- Требует парсинг HTML

**Использовать:** Только как запасной вариант

**Файл:** `backend/src/services/musify.service.js`

---

## 🏗️ Правильная архитектура импорта

### Шаг 1: Получить метаданные популярных треков

```javascript
// iTunes - узнать ЧТО популярно
const itunesService = require('./lastfm.service');
const chartTracks = await itunesService.getGlobalTop100();

// Результат: список { title, artist, genre, position, image }
// БЕЗ streamUrl!
```

### Шаг 2: Найти полные треки на реальных источниках

```javascript
for (const chartTrack of chartTracks) {
  const query = `${chartTrack.artist} ${chartTrack.title}`;
  
  // Пробуем источники по приоритету
  let foundTrack = null;
  
  // 1. VK Music (лучший источник)
  foundTrack = await vkMusic.searchTracks(query, 1);
  
  // 2. Lmusic.kz (запасной)
  if (!foundTrack || !foundTrack.streamUrl) {
    foundTrack = await lmusic.searchTracks(query, 1);
  }
  
  // 3. Яндекс.Музыка (для русских треков)
  if (!foundTrack || !foundTrack.streamUrl) {
    foundTrack = await yandexMusic.searchTracks(query, 1);
  }
  
  // 4. Только если нашли ПОЛНЫЙ трек - импортируем
  if (foundTrack && foundTrack.streamUrl && !foundTrack.streamUrl.includes('preview')) {
    await Track.create({
      title: foundTrack.title,
      artist: foundTrack.artist,
      streamUrl: foundTrack.streamUrl, // ПОЛНЫЙ трек!
      coverUrl: chartTrack.image, // обложка из iTunes
      genre: chartTrack.genre, // жанр из iTunes
      chartPosition: chartTrack.position, // позиция из iTunes
      popularityScore: (100 - chartTrack.position) * 100,
      importSource: foundTrack.source // vk, lmusic, yandex
    });
  }
}
```

---

## 📋 Обновленные сервисы

### Нужно переделать:

1. **`music-discovery.service.js`**
   - ✅ iTunes только для метаданных
   - ✅ Поиск на VK/Lmusic/Yandex
   - ❌ Убрать импорт preview URL

2. **`smart-discovery.service.js`**
   - ✅ iTunes для топов и чартов
   - ✅ VK/Lmusic для реальных треков
   - ❌ Не импортировать preview

3. **Все скрипты `import-*.js`**
   - ✅ Использовать iTunes как справочник
   - ✅ Искать треки на VK/Lmusic/Yandex
   - ❌ Не сохранять preview URL

---

## 🎯 План миграции

### Этап 1: Обновить сервисы ✅
- [x] Создать документацию
- [ ] Обновить `music-discovery.service.js`
- [ ] Обновить `smart-discovery.service.js`
- [ ] Создать единый `music-import.service.js`

### Этап 2: Удалить preview треки из БД
```sql
-- Удалить все треки с preview URL
DELETE FROM Tracks 
WHERE streamUrl LIKE '%preview%' 
   OR streamUrl LIKE '%itunes://%'
   OR duration <= 30;
```

### Этап 3: Переимпортировать с правильных источников
```bash
# Новый скрипт: import-from-charts.js
node backend/import-from-charts.js
```

---

## ✅ Новый скрипт импорта

Создать `backend/import-from-charts.js`:

```javascript
/**
 * Правильный импорт из чартов
 * iTunes - ТОЛЬКО метаданные
 * VK/Lmusic/Yandex - реальные треки
 */

const itunesService = require('./src/services/lastfm.service');
const vkMusic = require('./src/services/vk-music.service');
const lmusic = require('./src/modules/music/lmusic-kz.service');
const yandexMusic = require('./src/modules/music/yandex-music.service');
const { Track } = require('./src/models');

async function importFromCharts() {
  console.log('🎵 Импорт из чартов (правильная архитектура)\n');
  
  // 1. Получаем метаданные из iTunes
  const charts = await itunesService.getGlobalTop100();
  console.log(`📊 iTunes charts: ${charts.length} треков\n`);
  
  let imported = 0;
  let notFound = 0;
  
  for (const chartTrack of charts) {
    console.log(`[${chartTrack.position}] ${chartTrack.artist} - ${chartTrack.title}`);
    
    // Проверяем, нет ли уже
    const exists = await Track.findOne({
      where: {
        artist: chartTrack.artist,
        title: chartTrack.title
      }
    });
    
    if (exists) {
      console.log('  ⏭️  Уже в базе\n');
      continue;
    }
    
    // 2. Ищем ПОЛНЫЙ трек
    const query = `${chartTrack.artist} ${chartTrack.title}`;
    let foundTrack = null;
    
    // Приоритет 1: VK Music
    try {
      const vkResults = await vkMusic.searchTracks(query, 1);
      if (vkResults.length > 0 && vkResults[0].streamUrl) {
        foundTrack = { ...vkResults[0], source: 'vk-music' };
        console.log('  ✅ VK Music');
      }
    } catch (err) {
      console.log('  ⚠️  VK недоступен');
    }
    
    // Приоритет 2: Lmusic.kz
    if (!foundTrack) {
      try {
        const lmusicResults = await lmusic.searchTracks(query, 1);
        if (lmusicResults.length > 0 && lmusicResults[0].streamUrl) {
          foundTrack = { ...lmusicResults[0], source: 'lmusic-kz' };
          console.log('  ✅ Lmusic.kz');
        }
      } catch (err) {
        console.log('  ⚠️  Lmusic недоступен');
      }
    }
    
    // Приоритет 3: Яндекс.Музыка
    if (!foundTrack) {
      try {
        const yandexResults = await yandexMusic.searchTracks(query, 1);
        if (yandexResults.length > 0 && yandexResults[0].streamUrl) {
          foundTrack = { ...yandexResults[0], source: 'yandex-music' };
          console.log('  ✅ Яндекс.Музыка');
        }
      } catch (err) {
        console.log('  ⚠️  Яндекс недоступен');
      }
    }
    
    // 3. Импортируем если нашли
    if (foundTrack && foundTrack.streamUrl) {
      await Track.create({
        title: foundTrack.title,
        artist: foundTrack.artist,
        streamUrl: foundTrack.streamUrl,
        coverUrl: chartTrack.image, // из iTunes
        genre: chartTrack.genre, // из iTunes
        chartPosition: chartTrack.position, // из iTunes
        popularityScore: (100 - chartTrack.position) * 100,
        importSource: foundTrack.source,
        duration: foundTrack.duration || 180
      });
      
      console.log(`  💾 Импортирован (${foundTrack.source})\n`);
      imported++;
    } else {
      console.log('  ❌ Не найден ни на одном источнике\n');
      notFound++;
    }
    
    // Задержка
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n✅ Импортировано: ${imported}`);
  console.log(`❌ Не найдено: ${notFound}`);
}

importFromCharts().then(() => process.exit(0));
```

---

## 📊 Итоговая схема

```
┌─────────────────────────────────────────────────┐
│          iTunes/Apple Music API                 │
│  (ТОЛЬКО справочник популярности)               │
│                                                 │
│  ✓ Топ-100 чартов                              │
│  ✓ Новые альбомы                               │
│  ✓ Метаданные (название, исполнитель, жанр)    │
│  ✓ Обложки                                     │
│  ✗ Preview URL НЕ ИСПОЛЬЗОВАТЬ!                │
└──────────────┬──────────────────────────────────┘
               │
               ↓
      Получаем список ЧТО популярно
               │
               ↓
┌──────────────┴──────────────────────────────────┐
│                                                 │
│  Ищем полные треки на реальных источниках:     │
│                                                 │
│  1️⃣  VK Music API (приоритет #1)                │
│     ✓ Полные треки                             │
│     ✓ Огромная база                            │
│                                                 │
│  2️⃣  Lmusic.kz (приоритет #2)                   │
│     ✓ Прямые ссылки                            │
│     ✓ Не требует авторизацию                   │
│                                                 │
│  3️⃣  Яндекс.Музыка (приоритет #3)               │
│     ✓ Русская музыка                           │
│     ⚠️  Требует токен для полных треков         │
│                                                 │
└─────────────────────────────────────────────────┘
               │
               ↓
      Импортируем ПОЛНЫЕ треки в БД
```

---

## 🚀 Запуск

### 1. Очистить preview треки
```bash
docker exec errorparty_backend node /app/cleanup-preview-tracks.js
```

### 2. Импортировать правильно
```bash
docker exec errorparty_backend node /app/import-from-charts.js
```

### 3. Проверить статистику
```bash
docker exec errorparty_backend node /app/check-music-stats.js
```
