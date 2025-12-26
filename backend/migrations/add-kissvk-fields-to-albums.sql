-- Миграция для добавления полей KissVK в таблицу Albums
-- Дата: 2025-12-04

-- Добавляем новые поля если их еще нет
ALTER TABLE "Albums" 
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "providerAlbumId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "uploadedBy" INTEGER;

-- Добавляем комментарии к полям
COMMENT ON COLUMN "Albums"."source" IS 'Источник альбома (kissvk.top, jamendo.com и т.д.)';
COMMENT ON COLUMN "Albums"."provider" IS 'Провайдер: local, kissvk, jamendo, vk, etc.';
COMMENT ON COLUMN "Albums"."providerAlbumId" IS 'ID альбома у провайдера';
COMMENT ON COLUMN "Albums"."uploadedBy" IS 'Пользователь, загрузивший альбом';

-- Обновляем комментарии для deprecated полей
COMMENT ON COLUMN "Albums"."externalId" IS 'DEPRECATED: ID из внешнего источника (использовать providerAlbumId)';
COMMENT ON COLUMN "Albums"."sourceType" IS 'DEPRECATED: Тип источника (использовать provider)';

-- Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS "idx_albums_provider" ON "Albums"("provider");
CREATE INDEX IF NOT EXISTS "idx_albums_provider_album_id" ON "Albums"("providerAlbumId");
CREATE INDEX IF NOT EXISTS "idx_albums_uploaded_by" ON "Albums"("uploadedBy");

-- Выводим информацию о выполнении
DO $$
BEGIN
    RAISE NOTICE 'Миграция успешно выполнена: добавлены поля для KissVK интеграции в таблицу Albums';
END $$;
