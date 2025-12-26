-- Проверяем плейлисты и источники треков
SELECT 
    p.id,
    p.name,
    COUNT(pt."trackId") as track_count,
    COUNT(DISTINCT t.source) as source_types,
    STRING_AGG(DISTINCT t.source, ', ') as sources
FROM "Playlists" p
LEFT JOIN "PlaylistTracks" pt ON pt."playlistId" = p.id
LEFT JOIN "Tracks" t ON t.id = pt."trackId"
WHERE p.id IN (308,309,310,311,312,313,314,315,340,341)
GROUP BY p.id, p.name
ORDER BY p.id;
