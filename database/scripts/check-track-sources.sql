-- Статистика по источникам треков
SELECT source, COUNT(*) as count FROM "Tracks" GROUP BY source ORDER BY count DESC;

-- Недавно добавленные треки
SELECT id, title, artist, source, "createdAt" FROM "Tracks" ORDER BY "createdAt" DESC LIMIT 10;
