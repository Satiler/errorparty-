-- Add popularity and source columns to Tracks table for automated music system

-- Add popularity column (0-100 rating)
ALTER TABLE "Tracks" 
ADD COLUMN IF NOT EXISTS "popularity" INTEGER DEFAULT 50;

-- Add source column (track origin)
ALTER TABLE "Tracks" 
ADD COLUMN IF NOT EXISTS "source" VARCHAR(100) DEFAULT 'manual';

-- Add comments
COMMENT ON COLUMN "Tracks"."popularity" IS 'Track popularity rating (0-100)';
COMMENT ON COLUMN "Tracks"."source" IS 'Track import source (kissvk, yandex-chart, itunes-chart, billboard-chart, manual)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_tracks_popularity" ON "Tracks" ("popularity" DESC);
CREATE INDEX IF NOT EXISTS "idx_tracks_source" ON "Tracks" ("source");
