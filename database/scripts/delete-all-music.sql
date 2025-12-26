-- Удаление всех музыкальных данных
TRUNCATE TABLE "PlaylistTracks" CASCADE;
TRUNCATE TABLE "TrackLikes" CASCADE;
TRUNCATE TABLE "AlbumTracks" CASCADE;
TRUNCATE TABLE "Tracks" CASCADE;
TRUNCATE TABLE "Playlists" CASCADE;
TRUNCATE TABLE "Albums" CASCADE;

-- Проверка результатов
SELECT 'Треков осталось: ' || COUNT(*) FROM "Tracks";
SELECT 'Плейлистов осталось: ' || COUNT(*) FROM "Playlists";
SELECT 'Альбомов осталось: ' || COUNT(*) FROM "Albums";
