SELECT genre, COUNT(*) as count 
FROM "Tracks" 
GROUP BY genre 
ORDER BY count DESC;
