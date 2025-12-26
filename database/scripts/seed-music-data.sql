-- Вставка альбомов 2025 года
INSERT INTO "Albums" (
  "title", "artist", "releaseYear", "genre", "description", 
  "coverPath", "totalTracks", "likeCount", 
  "createdAt", "updatedAt"
) VALUES 
-- Новые альбомы 2025
(
  'Neon Visions 2025', 'Cyberpunk Collective', 2025, 'Electronic', 'Футуристический микс электроники и синтвейва', NULL, 14, 0, NOW(), NOW()
),
(
  'Urban Beats Vol. 5', 'Street Kings', 2025, 'Hip-Hop', 'Актуальный хип-хоп 2025 года с современными битами', NULL, 16, 0, NOW(), NOW()
),
(
  'Harmonic Flow', 'Luna Skies', 2025, 'Ambient', 'Атмосферная музыка для медитации и релаксации', NULL, 12, 0, NOW(), NOW()
),
(
  'Electric Sunset', 'Retrowave Echo', 2025, 'Synthwave', 'Волнующие синтезаторные мелодии под закат', NULL, 11, 0, NOW(), NOW()
),
(
  'Steel Horizon', 'Metal Rising', 2025, 'Metal', 'Интенсивный метал с агрессивными гитарными риффами', NULL, 10, 0, NOW(), NOW()
),
(
  'Soul Connection', 'Jazz & Soul United', 2025, 'Soul/Jazz', 'Глубокий соул и современный джаз в одном альбоме', NULL, 13, 0, NOW(), NOW()
),
(
  'Summer Vibes 2025', 'Tropical Paradise', 2025, 'Reggae/Pop', 'Летние хиты в стиле регги и поп', NULL, 15, 0, NOW(), NOW()
),
(
  'Digital Dreams', 'Synthpop Masters', 2025, 'Synthpop', 'Популярный синтпоп для современного слушателя', NULL, 12, 0, NOW(), NOW()
),
(
  'Indie Discovery', 'Underground Artists', 2025, 'Indie Rock', 'Независимый рок от талантливых молодых музыкантов', NULL, 14, 0, NOW(), NOW()
),
(
  'World Fusion 2025', 'Global Rhythms', 2025, 'World Music', 'Слияние музыкальных традиций разных стран', NULL, 16, 0, NOW(), NOW()
),
-- Классические альбомы для сравнения
(
  'Electric Dreams', 'Synthwave Warriors', 2023, 'Synthwave', 'Путешествие в неоновое будущее с электронными ритмами', NULL, 10, 0, NOW(), NOW()
),
(
  'Midnight Jazz', 'The Blue Notes', 2022, 'Jazz', 'Классический джаз для вечерних прогулок', NULL, 12, 0, NOW(), NOW()
),
(
  'Rock Revolution', 'Thunder Strike', 2021, 'Rock', 'Мощные гитарные риффы и энергичные барабаны', NULL, 8, 0, NOW(), NOW()
);

-- Вставка треков для альбомов 2025
INSERT INTO "Tracks" (
  "title", "artist", "album", "genre", "year", "duration", 
  "filePath", "coverPath", "fileFormat", "fileSize", "bitrate",
  "isPublic", "allowDownload", "playCount", "likeCount", "downloadCount",
  "externalSource", "externalId",
  "createdAt", "updatedAt"
) VALUES
-- Треки для Neon Visions 2025 (14 треков)
('Neon Highway', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 245, NULL, NULL, 'mp3', 7840000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_001', NOW(), NOW()),
('Cyber Dreams', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 263, NULL, NULL, 'mp3', 8400000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_002', NOW(), NOW()),
('Digital Horizon', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 278, NULL, NULL, 'mp3', 8880000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_003', NOW(), NOW()),
('Synth Waves', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 234, NULL, NULL, 'mp3', 7472000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_004', NOW(), NOW()),
('Future City', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 256, NULL, NULL, 'mp3', 8192000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_005', NOW(), NOW()),
('Electric Rain', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 287, NULL, NULL, 'mp3', 9184000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_006', NOW(), NOW()),
('Glow in Dark', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 245, NULL, NULL, 'mp3', 7840000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_007', NOW(), NOW()),
('Chrome Sky', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 269, NULL, NULL, 'mp3', 8608000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_008', NOW(), NOW()),
('Pixel Dreams', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 251, NULL, NULL, 'mp3', 8032000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_009', NOW(), NOW()),
('Digital Pulse', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 238, NULL, NULL, 'mp3', 7616000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_010', NOW(), NOW()),
('Neon Nights', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 272, NULL, NULL, 'mp3', 8704000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_011', NOW(), NOW()),
('Synth Revolution', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 255, NULL, NULL, 'mp3', 8160000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_012', NOW(), NOW()),
('Electric Sunrise', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 280, NULL, NULL, 'mp3', 8960000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_013', NOW(), NOW()),
('Digital Hearts', 'Cyberpunk Collective', 'Neon Visions 2025', 'Electronic', 2025, 265, NULL, NULL, 'mp3', 8480000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_014', NOW(), NOW()),

-- Треки для Urban Beats Vol. 5 (16 треков)
('City Rhythm', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 234, NULL, NULL, 'mp3', 7472000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_001', NOW(), NOW()),
('Street Flow', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 247, NULL, NULL, 'mp3', 7904000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_002', NOW(), NOW()),
('Urban Legend', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 256, NULL, NULL, 'mp3', 8192000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_003', NOW(), NOW()),
('Beat Drop', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 238, NULL, NULL, 'mp3', 7616000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_004', NOW(), NOW()),
('City Lights', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 268, NULL, NULL, 'mp3', 8576000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_005', NOW(), NOW()),
('Concrete Jungle', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 245, NULL, NULL, 'mp3', 7840000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_006', NOW(), NOW()),
('Night Vibes', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 252, NULL, NULL, 'mp3', 8064000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_007', NOW(), NOW()),
('Street Poetry', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 263, NULL, NULL, 'mp3', 8400000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_008', NOW(), NOW()),
('Urban Crown', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 241, NULL, NULL, 'mp3', 7712000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_009', NOW(), NOW()),
('City Soul', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 256, NULL, NULL, 'mp3', 8192000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_010', NOW(), NOW()),
('Street King', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 270, NULL, NULL, 'mp3', 8640000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_011', NOW(), NOW()),
('Beat Master', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 244, NULL, NULL, 'mp3', 7808000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_012', NOW(), NOW()),
('Urban Fire', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 259, NULL, NULL, 'mp3', 8288000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_013', NOW(), NOW()),
('City Flow', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 246, NULL, NULL, 'mp3', 7872000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_014', NOW(), NOW()),
('Street Anthem', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 265, NULL, NULL, 'mp3', 8480000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_015', NOW(), NOW()),
('Urban Spirit', 'Street Kings', 'Urban Beats Vol. 5', 'Hip-Hop', 2025, 251, NULL, NULL, 'mp3', 8032000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_016', NOW(), NOW()),

-- Треки для Harmonic Flow (12 треков)
('Meditation', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 480, NULL, NULL, 'mp3', 15360000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_001', NOW(), NOW()),
('Peaceful Stream', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 512, NULL, NULL, 'mp3', 16384000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_002', NOW(), NOW()),
('Celestial Dreams', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 456, NULL, NULL, 'mp3', 14592000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_003', NOW(), NOW()),
('Ocean Waves', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 524, NULL, NULL, 'mp3', 16768000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_004', NOW(), NOW()),
('Serene Mind', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 468, NULL, NULL, 'mp3', 14976000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_005', NOW(), NOW()),
('Floating Sky', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 490, NULL, NULL, 'mp3', 15680000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_006', NOW(), NOW()),
('Eternal Peace', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 445, NULL, NULL, 'mp3', 14240000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_007', NOW(), NOW()),
('Zen Garden', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 502, NULL, NULL, 'mp3', 16064000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_008', NOW(), NOW()),
('Moonlight Whisper', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 478, NULL, NULL, 'mp3', 15296000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_009', NOW(), NOW()),
('Silent Space', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 515, NULL, NULL, 'mp3', 16480000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_010', NOW(), NOW()),
('Harmony Flow', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 492, NULL, NULL, 'mp3', 15744000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_011', NOW(), NOW()),
('Infinite Calm', 'Luna Skies', 'Harmonic Flow', 'Ambient', 2025, 468, NULL, NULL, 'mp3', 14976000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_012', NOW(), NOW());

-- Вставка редакторских подборок
INSERT INTO "Playlists" (
  "name", "description", "userId", "type", "isPublic", 
  "coverPath", "likeCount", "subscriberCount",
  "tags", "metadata", 
  "createdAt", "updatedAt"
) VALUES 
(
  'Лучшее за неделю', 
  'Самые популярные треки последних семи дней',
  2,
  'editorial',
  true,
  NULL,
  0,
  0,
  ARRAY['хиты', 'популярное', 'неделя'],
  '{"featured": true, "priority": 1}'::jsonb,
  NOW(),
  NOW()
),
(
  'Вечерний чилл', 
  'Спокойная музыка для расслабления после рабочего дня',
  2,
  'editorial',
  true,
  NULL,
  0,
  0,
  ARRAY['чилл', 'релакс', 'вечер'],
  '{"featured": true, "priority": 2}'::jsonb,
  NOW(),
  NOW()
),
(
  'Энергичный старт', 
  'Бодрая музыка для начала дня',
  2,
  'editorial',
  true,
  NULL,
  0,
  0,
  ARRAY['энергия', 'утро', 'мотивация'],
  '{"featured": true, "priority": 3}'::jsonb,
  NOW(),
  NOW()
),
(
  'Фокус на работе', 
  'Инструментальная музыка для концентрации',
  2,
  'editorial',
  true,
  NULL,
  0,
  0,
  ARRAY['работа', 'концентрация', 'фокус'],
  '{"featured": true, "priority": 4}'::jsonb,
  NOW(),
  NOW()
);

-- Проверка результатов
SELECT 'Albums created:' as info, COUNT(*) as count FROM "Albums";
SELECT 'Playlists created:' as info, COUNT(*) as count FROM "Playlists";
