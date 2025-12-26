SELECT pt."playlistId", t.id, t.title, t."albumId" FROM "PlaylistTracks" pt LEFT JOIN "Tracks" t ON t.id = pt."trackId" WHERE pt."playlistId" = 171 LIMIT 5;

SELECT COUNT(*) as albumId_null_count FROM "Tracks" WHERE "albumId" IS NULL;

SELECT COUNT(*) as albumId_not_null_count FROM "Tracks" WHERE "albumId" IS NOT NULL;
