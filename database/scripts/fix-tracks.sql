-- Удалить старые треки (если они вставлены без albumId)
DELETE FROM "Tracks" WHERE "externalSource" = 'lmusic' AND "externalId" LIKE 'neon_%' OR "externalId" LIKE 'urban_%' OR "externalId" LIKE 'harmonic_%';

-- Вставка треков с правильными albumId
INSERT INTO "Tracks" (
  "title", "artist", "albumId", "genre", "year", "duration", 
  "filePath", "coverPath", "fileFormat", "fileSize", "bitrate",
  "isPublic", "allowDownload", "playCount", "likeCount", "downloadCount",
  "externalSource", "externalId", "trackNumber",
  "createdAt", "updatedAt"
) VALUES
-- Треки для Neon Visions 2025 (albumId = 190)
('Neon Highway', 'Cyberpunk Collective', 190, 'Electronic', 2025, 245, NULL, NULL, 'mp3', 7840000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_001', 1, NOW(), NOW()),
('Cyber Dreams', 'Cyberpunk Collective', 190, 'Electronic', 2025, 263, NULL, NULL, 'mp3', 8400000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_002', 2, NOW(), NOW()),
('Digital Horizon', 'Cyberpunk Collective', 190, 'Electronic', 2025, 278, NULL, NULL, 'mp3', 8880000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_003', 3, NOW(), NOW()),
('Synth Waves', 'Cyberpunk Collective', 190, 'Electronic', 2025, 234, NULL, NULL, 'mp3', 7472000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_004', 4, NOW(), NOW()),
('Future City', 'Cyberpunk Collective', 190, 'Electronic', 2025, 256, NULL, NULL, 'mp3', 8192000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_005', 5, NOW(), NOW()),
('Electric Rain', 'Cyberpunk Collective', 190, 'Electronic', 2025, 287, NULL, NULL, 'mp3', 9184000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_006', 6, NOW(), NOW()),
('Glow in Dark', 'Cyberpunk Collective', 190, 'Electronic', 2025, 245, NULL, NULL, 'mp3', 7840000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_007', 7, NOW(), NOW()),
('Chrome Sky', 'Cyberpunk Collective', 190, 'Electronic', 2025, 269, NULL, NULL, 'mp3', 8608000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_008', 8, NOW(), NOW()),
('Pixel Dreams', 'Cyberpunk Collective', 190, 'Electronic', 2025, 251, NULL, NULL, 'mp3', 8032000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_009', 9, NOW(), NOW()),
('Digital Pulse', 'Cyberpunk Collective', 190, 'Electronic', 2025, 238, NULL, NULL, 'mp3', 7616000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_010', 10, NOW(), NOW()),
('Neon Nights', 'Cyberpunk Collective', 190, 'Electronic', 2025, 272, NULL, NULL, 'mp3', 8704000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_011', 11, NOW(), NOW()),
('Synth Revolution', 'Cyberpunk Collective', 190, 'Electronic', 2025, 255, NULL, NULL, 'mp3', 8160000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_012', 12, NOW(), NOW()),
('Electric Sunrise', 'Cyberpunk Collective', 190, 'Electronic', 2025, 280, NULL, NULL, 'mp3', 8960000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_013', 13, NOW(), NOW()),
('Digital Hearts', 'Cyberpunk Collective', 190, 'Electronic', 2025, 265, NULL, NULL, 'mp3', 8480000, 320, true, true, 0, 0, 0, 'lmusic', 'neon_014', 14, NOW(), NOW()),

-- Треки для Urban Beats Vol. 5 (albumId = 191)
('City Rhythm', 'Street Kings', 191, 'Hip-Hop', 2025, 234, NULL, NULL, 'mp3', 7472000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_001', 1, NOW(), NOW()),
('Street Flow', 'Street Kings', 191, 'Hip-Hop', 2025, 247, NULL, NULL, 'mp3', 7904000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_002', 2, NOW(), NOW()),
('Urban Legend', 'Street Kings', 191, 'Hip-Hop', 2025, 256, NULL, NULL, 'mp3', 8192000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_003', 3, NOW(), NOW()),
('Beat Drop', 'Street Kings', 191, 'Hip-Hop', 2025, 238, NULL, NULL, 'mp3', 7616000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_004', 4, NOW(), NOW()),
('City Lights', 'Street Kings', 191, 'Hip-Hop', 2025, 268, NULL, NULL, 'mp3', 8576000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_005', 5, NOW(), NOW()),
('Concrete Jungle', 'Street Kings', 191, 'Hip-Hop', 2025, 245, NULL, NULL, 'mp3', 7840000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_006', 6, NOW(), NOW()),
('Night Vibes', 'Street Kings', 191, 'Hip-Hop', 2025, 252, NULL, NULL, 'mp3', 8064000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_007', 7, NOW(), NOW()),
('Street Poetry', 'Street Kings', 191, 'Hip-Hop', 2025, 263, NULL, NULL, 'mp3', 8400000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_008', 8, NOW(), NOW()),
('Urban Crown', 'Street Kings', 191, 'Hip-Hop', 2025, 241, NULL, NULL, 'mp3', 7712000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_009', 9, NOW(), NOW()),
('City Soul', 'Street Kings', 191, 'Hip-Hop', 2025, 256, NULL, NULL, 'mp3', 8192000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_010', 10, NOW(), NOW()),
('Street King', 'Street Kings', 191, 'Hip-Hop', 2025, 270, NULL, NULL, 'mp3', 8640000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_011', 11, NOW(), NOW()),
('Beat Master', 'Street Kings', 191, 'Hip-Hop', 2025, 244, NULL, NULL, 'mp3', 7808000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_012', 12, NOW(), NOW()),
('Urban Fire', 'Street Kings', 191, 'Hip-Hop', 2025, 259, NULL, NULL, 'mp3', 8288000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_013', 13, NOW(), NOW()),
('City Flow', 'Street Kings', 191, 'Hip-Hop', 2025, 246, NULL, NULL, 'mp3', 7872000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_014', 14, NOW(), NOW()),
('Street Anthem', 'Street Kings', 191, 'Hip-Hop', 2025, 265, NULL, NULL, 'mp3', 8480000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_015', 15, NOW(), NOW()),
('Urban Spirit', 'Street Kings', 191, 'Hip-Hop', 2025, 251, NULL, NULL, 'mp3', 8032000, 320, true, true, 0, 0, 0, 'lmusic', 'urban_016', 16, NOW(), NOW()),

-- Треки для Harmonic Flow (albumId = 192)
('Meditation', 'Luna Skies', 192, 'Ambient', 2025, 480, NULL, NULL, 'mp3', 15360000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_001', 1, NOW(), NOW()),
('Peaceful Stream', 'Luna Skies', 192, 'Ambient', 2025, 512, NULL, NULL, 'mp3', 16384000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_002', 2, NOW(), NOW()),
('Celestial Dreams', 'Luna Skies', 192, 'Ambient', 2025, 456, NULL, NULL, 'mp3', 14592000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_003', 3, NOW(), NOW()),
('Ocean Waves', 'Luna Skies', 192, 'Ambient', 2025, 524, NULL, NULL, 'mp3', 16768000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_004', 4, NOW(), NOW()),
('Serene Mind', 'Luna Skies', 192, 'Ambient', 2025, 468, NULL, NULL, 'mp3', 14976000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_005', 5, NOW(), NOW()),
('Floating Sky', 'Luna Skies', 192, 'Ambient', 2025, 490, NULL, NULL, 'mp3', 15680000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_006', 6, NOW(), NOW()),
('Eternal Peace', 'Luna Skies', 192, 'Ambient', 2025, 445, NULL, NULL, 'mp3', 14240000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_007', 7, NOW(), NOW()),
('Zen Garden', 'Luna Skies', 192, 'Ambient', 2025, 502, NULL, NULL, 'mp3', 16064000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_008', 8, NOW(), NOW()),
('Moonlight Whisper', 'Luna Skies', 192, 'Ambient', 2025, 478, NULL, NULL, 'mp3', 15296000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_009', 9, NOW(), NOW()),
('Silent Space', 'Luna Skies', 192, 'Ambient', 2025, 515, NULL, NULL, 'mp3', 16480000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_010', 10, NOW(), NOW()),
('Harmony Flow', 'Luna Skies', 192, 'Ambient', 2025, 492, NULL, NULL, 'mp3', 15744000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_011', 11, NOW(), NOW()),
('Infinite Calm', 'Luna Skies', 192, 'Ambient', 2025, 468, NULL, NULL, 'mp3', 14976000, 320, true, true, 0, 0, 0, 'lmusic', 'harmonic_012', 12, NOW(), NOW());

SELECT COUNT(*) FROM "Tracks" WHERE "albumId" IN (190, 191, 192);
