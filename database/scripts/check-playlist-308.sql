-- Проверяем треки в плейлисте 308
SELECT 
    pt.position,
    t.title,
    t.artist,
    t."createdAt"
FROM "PlaylistTracks" pt
JOIN "Tracks" t ON t.id = pt."trackId"
WHERE pt."playlistId" = 308
ORDER BY pt.position
LIMIT 10;
