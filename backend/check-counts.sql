-- Проверка структуры БД
SELECT 'Tracks' as table_name, COUNT(*) as count FROM "Tracks"
UNION ALL
SELECT 'Albums', COUNT(*) FROM "Albums"
UNION ALL  
SELECT 'Playlists', COUNT(*) FROM "Playlists";
