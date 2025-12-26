-- Проверяем треки из KissVK
SELECT COUNT(*) as kissvk_tracks FROM "Tracks" WHERE source = 'kissvk';
SELECT COUNT(*) as total_tracks FROM "Tracks";
