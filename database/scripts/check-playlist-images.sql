-- Проверяем обложки плейлистов
SELECT 
    id, 
    name, 
    image, 
    "coverPath",
    type
FROM "Playlists" 
WHERE "isPublic" = true 
ORDER BY id 
LIMIT 20;
