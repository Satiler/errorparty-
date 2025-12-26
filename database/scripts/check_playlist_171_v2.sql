SELECT pt."playlistId", t.id, t.title, t."albumId" FROM "PlaylistTracks" pt LEFT JOIN "Tracks" t ON t.id = pt."trackId" WHERE pt."playlistId" = 171 LIMIT 3;

SELECT a.id, a.title, a."coverUrl" FROM "Albums" a WHERE a.id IS NOT NULL LIMIT 3;
