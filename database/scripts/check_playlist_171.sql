SELECT id, name, type, "coverPath" FROM "Playlists" WHERE id = 171;

SELECT COUNT(*) as track_count FROM "PlaylistTracks" WHERE "playlistId" = 171;

SELECT pt."playlistId", t.id, t.title, t."AlbumId" FROM "PlaylistTracks" pt LEFT JOIN "Tracks" t ON t.id = pt."trackId" WHERE pt."playlistId" = 171 LIMIT 3;

SELECT id, title, "coverUrl" FROM "Albums" LIMIT 5;
