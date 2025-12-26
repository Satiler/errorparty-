-- Миграция: Добавление полей для внешних источников музыки
-- Дата: 2025-12-01

-- Добавляем поля для URL внешних треков
ALTER TABLE "Tracks" ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR(500);
ALTER TABLE "Tracks" ADD COLUMN IF NOT EXISTS "streamUrl" VARCHAR(500);
ALTER TABLE "Tracks" ADD COLUMN IF NOT EXISTS "coverUrl" VARCHAR(500);

-- Комментарии
COMMENT ON COLUMN "Tracks"."fileUrl" IS 'Прямая ссылка на аудио файл (для внешних источников)';
COMMENT ON COLUMN "Tracks"."streamUrl" IS 'URL для стриминга (может отличаться от fileUrl)';
COMMENT ON COLUMN "Tracks"."coverUrl" IS 'URL обложки (для внешних источников)';

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS "idx_tracks_external_source" ON "Tracks"("externalSource") WHERE "externalSource" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_tracks_file_url" ON "Tracks"("fileUrl") WHERE "fileUrl" IS NOT NULL;

-- Проверка
SELECT 
  COUNT(*) as total_tracks,
  COUNT("fileUrl") as with_file_url,
  COUNT("streamUrl") as with_stream_url,
  COUNT("externalSource") as external_tracks
FROM "Tracks";
