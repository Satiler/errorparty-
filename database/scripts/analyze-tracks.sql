SELECT COUNT(*) as total_tracks FROM "Tracks";
SELECT COUNT(*) as total_playlists FROM "Playlists" WHERE type='editorial';
SELECT COUNT(*) as system_playlists FROM "Playlists" WHERE type='system';
SELECT provider, COUNT(*) as count FROM "Tracks" GROUP BY provider ORDER BY count DESC;
SELECT COUNT(*) as tracks_without_album FROM "Tracks" WHERE "albumId" IS NULL;
SELECT COUNT(*) as tracks_with_stream_url FROM "Tracks" WHERE "streamUrl" IS NOT NULL;
