UPDATE "Playlists" SET image = NULL WHERE image LIKE 'gradient://%';
SELECT id, name, image FROM "Playlists" WHERE type IN ('editorial', 'chart', 'new') ORDER BY id DESC LIMIT 5;
