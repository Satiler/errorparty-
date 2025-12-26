-- Добавление поля updatedAt в таблицу TrackLikes
-- Миграция для исправления лайков треков

ALTER TABLE "TrackLikes"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Обновляем существующие записи
UPDATE "TrackLikes" 
SET "updatedAt" = "createdAt" 
WHERE "updatedAt" IS NULL;

COMMENT ON COLUMN "TrackLikes"."updatedAt" IS 'Дата последнего обновления лайка';
