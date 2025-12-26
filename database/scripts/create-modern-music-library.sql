-- ======================================
-- СОВРЕМЕННАЯ МУЗЫКАЛЬНАЯ БИБЛИОТЕКА 2025
-- Адаптация под стиль lmusic.kz
-- ======================================

-- Удаляем старые данные (опционально)
-- DELETE FROM "PlaylistTracks" WHERE "playlistId" IN (SELECT id FROM "Playlists" WHERE type = 'editorial');
-- DELETE FROM "Playlists" WHERE type = 'editorial';

-- ============ ЖАНРОВЫЕ ПОДБОРКИ ============

-- Поп хиты 2025
INSERT INTO "Playlists" (
  "name", "description", "userId", "type", "isPublic", 
  "coverPath", "likeCount", "subscriberCount",
  "tags", "metadata", 
  "createdAt", "updatedAt"
) VALUES 
(
  'ТОП 100 ПОП 2025', 
  'Самые горячие поп-хиты этого года',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['поп', 'топ', 'хиты', '2025'],
  '{"featured": true, "priority": 1, "color": "#FF1744", "icon": "🔥"}'::jsonb,
  NOW(), NOW()
),
(
  'Русский Поп', 
  'Лучшее из русской поп-музыки',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['поп', 'русская музыка', 'хиты'],
  '{"featured": true, "priority": 2, "color": "#FF6D00", "icon": "🎤"}'::jsonb,
  NOW(), NOW()
),

-- Электронная музыка
(
  'Electronic Vibes', 
  'Лучшая электронная музыка для вечеринок',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['электроника', 'dance', 'party'],
  '{"featured": true, "priority": 3, "color": "#651FFF", "icon": "⚡"}'::jsonb,
  NOW(), NOW()
),
(
  'Synthwave Dreams', 
  'Ретро-синтезаторы и неоновые огни',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['synthwave', 'ретро', 'электроника'],
  '{"featured": false, "priority": 4, "color": "#D500F9", "icon": "🌆"}'::jsonb,
  NOW(), NOW()
),

-- Хип-хоп и рэп
(
  'Hip-Hop Nation', 
  'Актуальный хип-хоп и рэп со всего мира',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['хип-хоп', 'рэп', 'urban'],
  '{"featured": true, "priority": 5, "color": "#FFC400", "icon": "🎧"}'::jsonb,
  NOW(), NOW()
),
(
  'Русский Рэп', 
  'Лучшее из русского рэпа',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['рэп', 'русская музыка', 'хип-хоп'],
  '{"featured": false, "priority": 6, "color": "#FF6F00", "icon": "🔊"}'::jsonb,
  NOW(), NOW()
),

-- Рок и метал
(
  'Rock Legends', 
  'Классический и современный рок',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['рок', 'классика', 'гитара'],
  '{"featured": true, "priority": 7, "color": "#D32F2F", "icon": "🎸"}'::jsonb,
  NOW(), NOW()
),
(
  'Metal Thunder', 
  'Тяжелая музыка для настоящих металлистов',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['метал', 'хэви', 'рок'],
  '{"featured": false, "priority": 8, "color": "#000000", "icon": "🤘"}'::jsonb,
  NOW(), NOW()
),

-- Джаз и соул
(
  'Jazz & Chill', 
  'Расслабляющий джаз для вечера',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['джаз', 'релакс', 'вечер'],
  '{"featured": true, "priority": 9, "color": "#5E35B1", "icon": "🎷"}'::jsonb,
  NOW(), NOW()
),
(
  'Soul Sessions', 
  'Глубокий соул и R&B',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['соул', 'r&b', 'вокал'],
  '{"featured": false, "priority": 10, "color": "#6A1B9A", "icon": "💜"}'::jsonb,
  NOW(), NOW()
),

-- Настроение и активности
(
  'Утренняя Энергия', 
  'Бодрая музыка для отличного начала дня',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['утро', 'энергия', 'мотивация'],
  '{"featured": true, "priority": 11, "color": "#FDD835", "icon": "☀️"}'::jsonb,
  NOW(), NOW()
),
(
  'Вечерний Чилл', 
  'Спокойная музыка для расслабления',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['вечер', 'релакс', 'чилл'],
  '{"featured": true, "priority": 12, "color": "#1976D2", "icon": "🌙"}'::jsonb,
  NOW(), NOW()
),
(
  'Тренировка', 
  'Мощные треки для спорта и фитнеса',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['спорт', 'фитнес', 'мотивация'],
  '{"featured": false, "priority": 13, "color": "#00C853", "icon": "💪"}'::jsonb,
  NOW(), NOW()
),
(
  'Работа и Фокус', 
  'Инструментальная музыка для концентрации',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['работа', 'концентрация', 'фокус'],
  '{"featured": true, "priority": 14, "color": "#00897B", "icon": "💼"}'::jsonb,
  NOW(), NOW()
),
(
  'Романтика', 
  'Лучшие треки для романтического вечера',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['романтика', 'любовь', 'вечер'],
  '{"featured": false, "priority": 15, "color": "#EC407A", "icon": "❤️"}'::jsonb,
  NOW(), NOW()
),
(
  'Дорога', 
  'Музыка для путешествий и поездок',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['дорога', 'путешествия', 'драйв'],
  '{"featured": false, "priority": 16, "color": "#FF5722", "icon": "🚗"}'::jsonb,
  NOW(), NOW()
),

-- Тематические
(
  'Party Mix 2025', 
  'Танцевальные хиты для вечеринок',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['party', 'танцы', 'клуб'],
  '{"featured": true, "priority": 17, "color": "#E91E63", "icon": "🎉"}'::jsonb,
  NOW(), NOW()
),
(
  'Ночной Город', 
  'Атмосферная музыка ночного города',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['ночь', 'город', 'атмосфера'],
  '{"featured": false, "priority": 18, "color": "#9C27B0", "icon": "🌃"}'::jsonb,
  NOW(), NOW()
),
(
  'Акустика', 
  'Живой звук и акустические версии',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['акустика', 'живой звук', 'гитара'],
  '{"featured": false, "priority": 19, "color": "#8D6E63", "icon": "🎼"}'::jsonb,
  NOW(), NOW()
),
(
  'Инди Открытия', 
  'Независимая музыка от талантливых артистов',
  2, 'editorial', true, NULL, 0, 0,
  ARRAY['инди', 'альтернатива', 'новое'],
  '{"featured": false, "priority": 20, "color": "#00ACC1", "icon": "🎨"}'::jsonb,
  NOW(), NOW()
);

-- ============ ДОБАВЛЯЕМ ТРЕКИ В ПЛЕЙЛИСТЫ ============

-- Функция для заполнения плейлистов треками по жанрам
DO $$
DECLARE
  playlist_record RECORD;
  track_record RECORD;
  position_counter INT;
BEGIN
  -- ТОП 100 ПОП 2025
  SELECT id INTO playlist_record FROM "Playlists" WHERE name = 'ТОП 100 ПОП 2025' LIMIT 1;
  IF FOUND THEN
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE genre ILIKE '%pop%' AND "isPublic" = true 
      ORDER BY RANDOM() LIMIT 30
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END IF;

  -- Electronic Vibes
  SELECT id INTO playlist_record FROM "Playlists" WHERE name = 'Electronic Vibes' LIMIT 1;
  IF FOUND THEN
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE genre ILIKE '%electronic%' AND "isPublic" = true 
      ORDER BY RANDOM() LIMIT 25
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END IF;

  -- Synthwave Dreams
  SELECT id INTO playlist_record FROM "Playlists" WHERE name = 'Synthwave Dreams' LIMIT 1;
  IF FOUND THEN
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE genre ILIKE '%synthwave%' AND "isPublic" = true 
      ORDER BY RANDOM() LIMIT 25
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END IF;

  -- Hip-Hop Nation
  SELECT id INTO playlist_record FROM "Playlists" WHERE name = 'Hip-Hop Nation' LIMIT 1;
  IF FOUND THEN
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE genre ILIKE '%hip-hop%' AND "isPublic" = true 
      ORDER BY RANDOM() LIMIT 25
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END IF;

  -- Rock Legends
  SELECT id INTO playlist_record FROM "Playlists" WHERE name = 'Rock Legends' LIMIT 1;
  IF FOUND THEN
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE genre ILIKE '%rock%' AND "isPublic" = true 
      ORDER BY RANDOM() LIMIT 25
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END IF;

  -- Jazz & Chill
  SELECT id INTO playlist_record FROM "Playlists" WHERE name = 'Jazz & Chill' LIMIT 1;
  IF FOUND THEN
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE (genre ILIKE '%jazz%' OR genre ILIKE '%soul%') AND "isPublic" = true 
      ORDER BY RANDOM() LIMIT 25
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END IF;

  -- Ambient для остальных плейлистов
  FOR playlist_record IN 
    SELECT id FROM "Playlists" 
    WHERE name IN ('Утренняя Энергия', 'Вечерний Чилл', 'Работа и Фокус')
  LOOP
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE genre ILIKE '%ambient%' AND "isPublic" = true 
      ORDER BY RANDOM() LIMIT 20
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END LOOP;

  -- Заполняем остальные плейлисты случайными треками
  FOR playlist_record IN 
    SELECT id FROM "Playlists" 
    WHERE type = 'editorial' 
    AND id NOT IN (SELECT DISTINCT "playlistId" FROM "PlaylistTracks")
  LOOP
    position_counter := 1;
    FOR track_record IN 
      SELECT id FROM "Tracks" 
      WHERE "isPublic" = true 
      ORDER BY RANDOM() LIMIT 20
    LOOP
      INSERT INTO "PlaylistTracks" ("playlistId", "trackId", "position", "addedBy", "createdAt", "updatedAt")
      VALUES (playlist_record.id, track_record.id, position_counter, 2, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      position_counter := position_counter + 1;
    END LOOP;
  END LOOP;

END $$;

-- ============ СТАТИСТИКА ============

SELECT 
  'Создано плейлистов' as info, 
  COUNT(*) as count 
FROM "Playlists" 
WHERE type = 'editorial';

SELECT 
  p.name as "Плейлист",
  COUNT(pt."trackId") as "Треков"
FROM "Playlists" p
LEFT JOIN "PlaylistTracks" pt ON p.id = pt."playlistId"
WHERE p.type = 'editorial'
GROUP BY p.id, p.name
ORDER BY p.name;

SELECT 'Всего треков в БД' as info, COUNT(*) as count FROM "Tracks";
SELECT 'Всего альбомов в БД' as info, COUNT(*) as count FROM "Albums";
SELECT 'Всего плейлистов в БД' as info, COUNT(*) as count FROM "Playlists";
