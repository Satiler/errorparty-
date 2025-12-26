-- Скрипт проверки и исправления таблицы TrackLikes

-- 1. Проверяем существование таблицы
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'TrackLikes'
) AS table_exists;

-- 2. Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'TrackLikes'
ORDER BY ordinal_position;

-- 3. Добавляем поле updatedAt, если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'TrackLikes' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "TrackLikes"
    ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    
    -- Обновляем существующие записи
    UPDATE "TrackLikes" 
    SET "updatedAt" = "createdAt";
    
    RAISE NOTICE 'Column updatedAt added to TrackLikes';
  ELSE
    RAISE NOTICE 'Column updatedAt already exists';
  END IF;
END $$;

-- 4. Проверяем индексы
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'TrackLikes';

-- 5. Проверяем внешние ключи
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'TrackLikes';

-- 6. Показываем статистику
SELECT 
  COUNT(*) as total_likes,
  COUNT(DISTINCT "userId") as unique_users,
  COUNT(DISTINCT "trackId") as unique_tracks
FROM "TrackLikes";

-- 7. Показываем последние лайки
SELECT 
  tl.id,
  tl."userId",
  tl."trackId",
  u.username,
  t.title as track_title,
  tl."createdAt",
  tl."updatedAt"
FROM "TrackLikes" tl
LEFT JOIN users u ON tl."userId" = u.id
LEFT JOIN "Tracks" t ON tl."trackId" = t.id
ORDER BY tl."createdAt" DESC
LIMIT 10;
