-- Add gsi_data column to store full GSI payload
-- This allows storing ALL data from Game State Integration including:
-- - All players stats (allplayers_match_stats)
-- - Weapon details (allplayers_weapons)
-- - Round-by-round data (map_round_wins)
-- - Bomb events, grenades, positions, etc.

ALTER TABLE cs2_matches 
ADD COLUMN IF NOT EXISTS gsi_data JSONB;

-- Update source enum to include 'gsi' and 'auto_sync'
-- Note: In PostgreSQL, altering ENUM requires creating new type
DO $$ 
BEGIN
  -- Check if enum needs updating
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'gsi' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_cs2_matches_source')
  ) THEN
    -- Add new enum values
    ALTER TYPE enum_cs2_matches_source ADD VALUE 'gsi';
    ALTER TYPE enum_cs2_matches_source ADD VALUE 'auto_sync';
  END IF;
END $$;

-- Create index for JSON queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_cs2_matches_gsi_data ON cs2_matches USING GIN (gsi_data);

-- Add comment
COMMENT ON COLUMN cs2_matches.gsi_data IS 'Full Game State Integration payload with all players, weapons, rounds, etc';
