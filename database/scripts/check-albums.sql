SELECT 
  a.id, 
  a.title, 
  a.artist, 
  a."coverUrl" as album_cover,
  (SELECT COUNT(*) FROM "Tracks" WHERE "albumId" = a.id) as track_count,
  (SELECT COUNT(*) FROM "Tracks" WHERE "albumId" = a.id AND "coverUrl" IS NOT NULL) as tracks_with_covers
FROM "Albums" a 
WHERE a."coverUrl" IS NULL
ORDER BY a.id DESC 
LIMIT 10;
