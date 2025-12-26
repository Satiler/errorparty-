# 🎵 План интеграции KissVK и исправления структуры БД

## 📋 Текущая ситуация

### ✅ Что работает:
- 1119 треков в базе
- 99.8% треков имеют stream URL (HLS работает)
- Оптимизированный kissvk модуль готов (HTTP-only, без Puppeteer)
- API endpoints доступны

### ⚠️ Проблемы:
1. **Все треки импортированы вручную** (`source = 'manual'`)
2. **Нет данных об альбомах и плейлистах** (таблицы Albums/Playlists не используются)
3. **KissVK модуль не интегрирован** для автоматического импорта

---

## 🎯 ПЛАН ДЕЙСТВИЙ

### Этап 1: Проверка структуры БД (10 мин)

**Цель:** Понять текущую структуру таблиц и схему данных

**Действия:**
```bash
# 1. Проверить структуру Tracks
docker exec errorparty_postgres psql -U errorparty -d errorparty -c '\d "Tracks"'

# 2. Проверить наличие таблиц Albums/Playlists
docker exec errorparty_postgres psql -U errorparty -d errorparty -c '\dt'

# 3. Проверить связи между таблицами
docker exec errorparty_postgres psql -U errorparty -d errorparty -c "
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
"
```

**Ожидаемый результат:**
- Список колонок таблицы Tracks
- Подтверждение наличия Albums/Playlists
- Понимание связей (album_id, playlist_id и т.д.)

---

### Этап 2: Тестирование KissVK API (15 мин)

**Цель:** Убедиться что kissvk.service.js работает

**Действия:**

```bash
# 1. Тест получения превью треков
curl http://localhost/api/kissvk/preview

# 2. Тест поиска
curl "http://localhost/api/kissvk/search?q=Post+Malone"

# 3. Тест получения новых альбомов
curl http://localhost/api/kissvk/albums/new

# 4. Проверка статистики
curl http://localhost/api/kissvk/stats
```

**Создать тестовый скрипт:**
```javascript
// backend/test-kissvk-import.js
const kissVKService = require('./src/services/kissvk.service');

async function testImport() {
    try {
        // 1. Получить превью треков
        const preview = await kissVKService.getChartTracks(10);
        console.log(`✅ Получено ${preview.length} треков из чарта`);
        
        // 2. Попробовать расшифровать URL первого трека
        if (preview[0]) {
            const decrypted = await kissVKService.decryptTrackUrl(preview[0].encryptedUrl);
            console.log(`✅ URL расшифрован: ${decrypted.substring(0, 50)}...`);
        }
        
        return preview;
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

testImport();
```

**Запуск:**
```bash
docker cp backend/test-kissvk-import.js errorparty_backend:/app/
docker exec errorparty_backend node /app/test-kissvk-import.js
```

**Ожидаемый результат:**
- Список треков из kissvk.top
- Расшифрованные URL
- Подтверждение работы rate limiting и кеша

---

### Этап 3: Создание миграций для Albums/Playlists (20 мин)

**Цель:** Убедиться что таблицы Albums/Playlists имеют правильную структуру

**Проверить/создать миграцию:**

```sql
-- database/migrations/004-create-albums-playlists.sql

-- Таблица Albums (если не существует)
CREATE TABLE IF NOT EXISTS "Albums" (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    image_url TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    external_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица Playlists (если не существует)
CREATE TABLE IF NOT EXISTS "Playlists" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER,
    is_public BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица PlaylistTracks (связь многие-ко-многим)
CREATE TABLE IF NOT EXISTS "PlaylistTracks" (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES "Playlists"(id) ON DELETE CASCADE,
    track_id INTEGER REFERENCES "Tracks"(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Добавить album_id в Tracks (если нет)
ALTER TABLE "Tracks" 
ADD COLUMN IF NOT EXISTS album_id INTEGER REFERENCES "Albums"(id);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON "Tracks"(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_source ON "Tracks"(source);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON "PlaylistTracks"(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON "PlaylistTracks"(track_id);
```

**Применить миграцию:**
```bash
docker cp database/migrations/004-create-albums-playlists.sql errorparty_backend:/app/
docker exec errorparty_postgres psql -U errorparty -d errorparty -f /app/004-create-albums-playlists.sql
```

---

### Этап 4: Обновление kissvk.controller.js для работы с БД (30 мин)

**Цель:** Добавить функцию импорта треков в БД через kissvk

**Текущий контроллер:** `backend/src/controllers/kissvk.controller.js`

**Добавить метод importToDatabase:**

```javascript
// В kissvk.controller.js

const Track = require('../models/Track'); // Sequelize модель
const Album = require('../models/Album');

async function importToDatabase(req, res) {
    try {
        const { trackIds, createAlbum } = req.body;
        
        // 1. Получить треки из kissvk
        const tracks = await kissVKService.getChartTracks(50);
        
        // 2. Создать альбом (если требуется)
        let albumId = null;
        if (createAlbum) {
            const album = await Album.create({
                title: `KissVK Chart - ${new Date().toISOString().split('T')[0]}`,
                artist: 'Various Artists',
                source: 'kissvk',
                image_url: tracks[0]?.imageUrl || null
            });
            albumId = album.id;
        }
        
        // 3. Импортировать треки
        const imported = [];
        for (const track of tracks.slice(0, trackIds?.length || 10)) {
            // Проверить существование
            const existing = await Track.findOne({
                where: { title: track.title, artist: track.artist }
            });
            
            if (!existing) {
                // Расшифровать URL
                const streamUrl = await kissVKService.decryptTrackUrl(track.encryptedUrl);
                
                // Создать трек
                const newTrack = await Track.create({
                    title: track.title,
                    artist: track.artist,
                    duration: track.duration,
                    stream_url: streamUrl,
                    source: 'kissvk',
                    album_id: albumId,
                    image_url: track.imageUrl
                });
                
                imported.push(newTrack);
            }
        }
        
        res.json({
            success: true,
            imported: imported.length,
            albumId,
            tracks: imported.map(t => ({
                id: t.id,
                title: t.title,
                artist: t.artist
            }))
        });
        
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
}
```

**Обновить routes:**
```javascript
// В kissvk.routes.js
router.post('/import-to-db', importToDatabase);
```

---

### Этап 5: Создание автоматического импорта (20 мин)

**Цель:** Настроить ежедневный автоимпорт топ-треков из kissvk

**Создать планировщик:**

```javascript
// backend/src/schedulers/kissvk-auto-import.scheduler.js

const cron = require('node-cron');
const kissVKService = require('../services/kissvk.service');
const Track = require('../models/Track');
const Album = require('../models/Album');

// Запуск каждый день в 3:00
const scheduleAutoImport = () => {
    cron.schedule('0 3 * * *', async () => {
        console.log('🎵 Starting KissVK auto-import...');
        
        try {
            // 1. Получить топ-50 треков
            const tracks = await kissVKService.getChartTracks(50);
            
            // 2. Создать альбом для этого импорта
            const album = await Album.create({
                title: `KissVK Top 50 - ${new Date().toLocaleDateString('ru-RU')}`,
                artist: 'Various Artists',
                source: 'kissvk',
                image_url: tracks[0]?.imageUrl
            });
            
            // 3. Импортировать треки
            let imported = 0;
            for (const track of tracks) {
                // Проверить дубликаты
                const exists = await Track.findOne({
                    where: { 
                        title: track.title, 
                        artist: track.artist,
                        source: 'kissvk'
                    }
                });
                
                if (!exists) {
                    const streamUrl = await kissVKService.decryptTrackUrl(track.encryptedUrl);
                    
                    await Track.create({
                        title: track.title,
                        artist: track.artist,
                        duration: track.duration,
                        stream_url: streamUrl,
                        source: 'kissvk',
                        album_id: album.id
                    });
                    
                    imported++;
                    
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            console.log(`✅ KissVK import completed: ${imported} new tracks`);
            
        } catch (error) {
            console.error('❌ KissVK auto-import failed:', error);
        }
    });
    
    console.log('⏰ KissVK auto-import scheduled (daily at 3:00 AM)');
};

module.exports = { scheduleAutoImport };
```

**Подключить в backend/src/index.js:**
```javascript
const { scheduleAutoImport } = require('./schedulers/kissvk-auto-import.scheduler');

// После инициализации модулей
scheduleAutoImport();
```

---

### Этап 6: Создание UI для импорта (опционально, 40 мин)

**Создать страницу администратора:**

```javascript
// frontend/src/pages/admin/KissVKImport.jsx

import { useState } from 'react';
import axios from 'axios';

function KissVKImport() {
    const [preview, setPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const loadPreview = async () => {
        setLoading(true);
        const { data } = await axios.get('/api/kissvk/preview');
        setPreview(data.tracks);
        setLoading(false);
    };
    
    const importTracks = async (count) => {
        setLoading(true);
        const { data } = await axios.post('/api/kissvk/import-to-db', {
            trackIds: preview.slice(0, count).map(t => t.id),
            createAlbum: true
        });
        alert(`Импортировано ${data.imported} треков`);
        setLoading(false);
    };
    
    return (
        <div className="kissvk-import">
            <h1>🎵 Импорт из KissVK</h1>
            
            <button onClick={loadPreview} disabled={loading}>
                Загрузить превью
            </button>
            
            {preview.length > 0 && (
                <>
                    <h2>Доступно: {preview.length} треков</h2>
                    <div className="tracks-list">
                        {preview.map((track, i) => (
                            <div key={i} className="track-item">
                                {track.artist} - {track.title}
                            </div>
                        ))}
                    </div>
                    
                    <button onClick={() => importTracks(10)}>
                        Импортировать топ-10
                    </button>
                    <button onClick={() => importTracks(50)}>
                        Импортировать топ-50
                    </button>
                </>
            )}
        </div>
    );
}

export default KissVKImport;
```

---

## 🚀 Порядок выполнения

### Быстрый старт (1 час):
1. ✅ Проверить структуру БД (Этап 1)
2. ✅ Протестировать kissvk API (Этап 2)
3. ✅ Создать миграции Albums/Playlists (Этап 3)
4. ✅ Добавить функцию импорта в контроллер (Этап 4)

### Расширенная интеграция (2 часа):
5. ✅ Настроить автоматический импорт (Этап 5)
6. ⏸️ Создать UI для администратора (Этап 6 - опционально)

---

## ✅ Критерии успеха

После выполнения плана:
- [ ] Треки из kissvk успешно импортируются в БД
- [ ] `source = 'kissvk'` появляется в статистике
- [ ] Альбомы создаются автоматически
- [ ] Ежедневный автоимпорт работает
- [ ] Нет дубликатов треков
- [ ] Rate limiting работает (не банит IP)
- [ ] Кеш работает (повторные запросы быстрые)

---

## 🔍 Тестирование

```bash
# 1. Запустить тестовый импорт
curl -X POST http://localhost/api/kissvk/import-to-db \
  -H "Content-Type: application/json" \
  -d '{"trackIds": [], "createAlbum": true}'

# 2. Проверить результат
docker exec errorparty_backend node /app/analyze-music.js

# 3. Должно быть:
# - kissvk > 0 в статистике
# - Альбомы созданы
# - Новые треки в БД
```

---

## 📝 Примечания

- **Rate Limiting**: kissvk.service.js уже имеет задержку 1 сек между запросами
- **Кеширование**: URL кешируются на 1 час
- **Дубликаты**: Проверять по `title + artist + source`
- **Ошибки**: Логировать все ошибки декодирования URL

---

## 🔗 Связанные файлы

- `backend/src/services/kissvk.service.js` - Основной сервис
- `backend/src/controllers/kissvk.controller.js` - API контроллер
- `backend/src/modules/music/kissvk.routes.js` - Маршруты
- `backend/src/utils/vk-audio-decoder-v3.js` - Декодер URL
- `docs/KISSVK_OPTIMIZED_README.md` - Документация по API

---

**Автор:** GitHub Copilot  
**Дата:** 23.12.2025  
**Статус:** Ready for implementation
