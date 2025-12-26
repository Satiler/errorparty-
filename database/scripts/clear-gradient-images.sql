-- Удаляем градиентные обложки, чтобы заменить их на реальные изображения
UPDATE "Playlists" 
SET image = NULL 
WHERE image LIKE 'gradient://%';
