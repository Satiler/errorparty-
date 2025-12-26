-- Проверка названий плейлистов
SELECT id, name, metadata->>'icon' as icon 
FROM "Playlists" 
ORDER BY name;
