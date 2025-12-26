-- Allow NULL userId for system/auto playlists
ALTER TABLE "Playlists" 
ALTER COLUMN "userId" DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN "Playlists"."userId" IS 'User ID - can be NULL for system/auto playlists';
