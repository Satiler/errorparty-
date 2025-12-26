-- Удаление треков с encrypted URL без рабочих источников из плейлистов

-- 1. Показать сколько таких треков
SELECT COUNT(*) as broken_tracks
FROM "Tracks"
WHERE "streamUrl" LIKE 'encrypted:%'
  AND ("filePath" IS NULL OR "filePath" = '')
  AND ("externalUrl" IS NULL OR "externalUrl" = '');

-- 2. Показать их в плейлистах
SELECT pt."playlistId", p.name as playlist_name, COUNT(*) as broken_count
FROM "PlaylistTracks" pt
JOIN "Tracks" t ON pt."trackId" = t.id
JOIN "Playlists" p ON pt."playlistId" = p.id
WHERE t."streamUrl" LIKE 'encrypted:%'
  AND (t."filePath" IS NULL OR t."filePath" = '')
  AND (t."externalUrl" IS NULL OR t."externalUrl" = '')
GROUP BY pt."playlistId", p.name
ORDER BY broken_count DESC;

-- 3. Удалить их из плейлистов
DELETE FROM "PlaylistTracks"
WHERE "trackId" IN (
  SELECT id FROM "Tracks"
  WHERE "streamUrl" LIKE 'encrypted:%'
    AND ("filePath" IS NULL OR "filePath" = '')
    AND ("externalUrl" IS NULL OR "externalUrl" = '')
);

-- 4. Показать результат
SELECT COUNT(*) as remaining_playlist_tracks FROM "PlaylistTracks";
