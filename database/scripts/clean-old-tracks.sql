-- Очистка старых треков и подготовка к загрузке новых
-- Удаляем все треки, кроме тех, что связаны с современными альбомами 2025

-- Удаляем связи плейлист-трек для старых треков
DELETE FROM "PlaylistTracks" WHERE "trackId" NOT IN (
  SELECT id FROM "Tracks" WHERE "albumId" IN (
    SELECT id FROM "Albums" WHERE "releaseYear" >= 2025
  )
);

-- Удаляем старые треки (оставляем только треки из альбомов 2025+)
DELETE FROM "Tracks" WHERE id NOT IN (
  SELECT id FROM "Tracks" WHERE "albumId" IN (
    SELECT id FROM "Albums" WHERE "releaseYear" >= 2025
  )
);

-- Проверка результатов
SELECT COUNT(*) as total_tracks FROM "Tracks";
SELECT COUNT(*) as total_albums FROM "Albums";
SELECT COUNT(*) as total_playlists FROM "Playlists";
SELECT COUNT(*) as playlist_tracks FROM "PlaylistTracks";

-- Показать оставшиеся треки по жанрам
SELECT genre, COUNT(*) as count 
FROM "Tracks" 
GROUP BY genre 
ORDER BY count DESC;
