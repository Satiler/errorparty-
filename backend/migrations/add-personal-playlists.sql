-- Добавление колонок для личных плейлистов
ALTER TABLE "Playlists" ADD COLUMN IF NOT EXISTS "isPersonal" BOOLEAN DEFAULT false;
ALTER TABLE "Playlists" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN DEFAULT false;

-- Добавление индексов
CREATE INDEX IF NOT EXISTS idx_playlists_personal ON "Playlists"("isPersonal");
CREATE INDEX IF NOT EXISTS idx_playlists_system ON "Playlists"("isSystem");

SELECT 'Migration completed successfully' as status;
