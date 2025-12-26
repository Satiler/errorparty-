-- Добавить треки для оставшихся альбомов 2025

-- Треки для Soul Connection (albumId = 195)
INSERT INTO "Tracks" (
  "title", "artist", "albumId", "genre", "year", "duration", 
  "filePath", "coverPath", "fileFormat", "fileSize", "bitrate",
  "isPublic", "allowDownload", "playCount", "likeCount", "downloadCount",
  "externalSource", "externalId", "trackNumber",
  "createdAt", "updatedAt"
) VALUES
('Soulful Morning', 'Jazz & Soul United', 195, 'Soul', 2025, 312, NULL, NULL, 'mp3', 9984000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_001', 1, NOW(), NOW()),
('Midnight Jazz', 'Jazz & Soul United', 195, 'Jazz', 2025, 298, NULL, NULL, 'mp3', 9536000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_002', 2, NOW(), NOW()),
('Soul Connection', 'Jazz & Soul United', 195, 'Soul', 2025, 334, NULL, NULL, 'mp3', 10688000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_003', 3, NOW(), NOW()),
('Smooth Vibes', 'Jazz & Soul United', 195, 'Soul', 2025, 287, NULL, NULL, 'mp3', 9184000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_004', 4, NOW(), NOW()),
('Blue Note', 'Jazz & Soul United', 195, 'Jazz', 2025, 345, NULL, NULL, 'mp3', 11040000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_005', 5, NOW(), NOW()),
('Urban Soul', 'Jazz & Soul United', 195, 'Soul', 2025, 301, NULL, NULL, 'mp3', 9632000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_006', 6, NOW(), NOW()),
('Jazz Fusion', 'Jazz & Soul United', 195, 'Jazz', 2025, 356, NULL, NULL, 'mp3', 11392000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_007', 7, NOW(), NOW()),
('Velvet Touch', 'Jazz & Soul United', 195, 'Soul', 2025, 289, NULL, NULL, 'mp3', 9248000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_008', 8, NOW(), NOW()),
('Saxophone Dreams', 'Jazz & Soul United', 195, 'Jazz', 2025, 378, NULL, NULL, 'mp3', 12096000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_009', 9, NOW(), NOW()),
('Soul Brother', 'Jazz & Soul United', 195, 'Soul', 2025, 294, NULL, NULL, 'mp3', 9408000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_010', 10, NOW(), NOW()),
('Night Session', 'Jazz & Soul United', 195, 'Jazz', 2025, 367, NULL, NULL, 'mp3', 11744000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_011', 11, NOW(), NOW()),
('Groove Master', 'Jazz & Soul United', 195, 'Soul', 2025, 308, NULL, NULL, 'mp3', 9856000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_012', 12, NOW(), NOW()),
('Inner Peace', 'Jazz & Soul United', 195, 'Jazz', 2025, 342, NULL, NULL, 'mp3', 10944000, 320, true, true, 0, 0, 0, 'lmusic', 'soul_013', 13, NOW(), NOW());

-- Треки для Electric Sunset (albumId = 193)
INSERT INTO "Tracks" (
  "title", "artist", "albumId", "genre", "year", "duration", 
  "filePath", "coverPath", "fileFormat", "fileSize", "bitrate",
  "isPublic", "allowDownload", "playCount", "likeCount", "downloadCount",
  "externalSource", "externalId", "trackNumber",
  "createdAt", "updatedAt"
) VALUES
('Sunset Drive', 'Retrowave Echo', 193, 'Synthwave', 2025, 265, NULL, NULL, 'mp3', 8480000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_001', 1, NOW(), NOW()),
('Neon Coast', 'Retrowave Echo', 193, 'Synthwave', 2025, 278, NULL, NULL, 'mp3', 8896000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_002', 2, NOW(), NOW()),
('Electric Dreams', 'Retrowave Echo', 193, 'Synthwave', 2025, 245, NULL, NULL, 'mp3', 7840000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_003', 3, NOW(), NOW()),
('Retrograde', 'Retrowave Echo', 193, 'Synthwave', 2025, 289, NULL, NULL, 'mp3', 9248000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_004', 4, NOW(), NOW()),
('Ocean Wave', 'Retrowave Echo', 193, 'Synthwave', 2025, 256, NULL, NULL, 'mp3', 8192000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_005', 5, NOW(), NOW()),
('Miami Nights', 'Retrowave Echo', 193, 'Synthwave', 2025, 272, NULL, NULL, 'mp3', 8704000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_006', 6, NOW(), NOW()),
('Starlight Highway', 'Retrowave Echo', 193, 'Synthwave', 2025, 267, NULL, NULL, 'mp3', 8544000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_007', 7, NOW(), NOW()),
('Electric Love', 'Retrowave Echo', 193, 'Synthwave', 2025, 254, NULL, NULL, 'mp3', 8128000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_008', 8, NOW(), NOW()),
('Sunset Boulevard', 'Retrowave Echo', 193, 'Synthwave', 2025, 281, NULL, NULL, 'mp3', 8992000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_009', 9, NOW(), NOW()),
('Neon Paradise', 'Retrowave Echo', 193, 'Synthwave', 2025, 249, NULL, NULL, 'mp3', 7968000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_010', 10, NOW(), NOW()),
('Electric Sunset', 'Retrowave Echo', 193, 'Synthwave', 2025, 293, NULL, NULL, 'mp3', 9376000, 320, true, true, 0, 0, 0, 'lmusic', 'sunset_011', 11, NOW(), NOW());

SELECT COUNT(*) as "Soul Connection tracks" FROM "Tracks" WHERE "albumId" = 195;
SELECT COUNT(*) as "Electric Sunset tracks" FROM "Tracks" WHERE "albumId" = 193;
