-- Migration: Add CS2 Auto-Sync Support
-- Created: 2025-11-22
-- Description: Adds tables and fields for CS2 automatic match synchronization

-- 1. Add CS2 authentication token fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cs2_auth_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS cs2_token_linked_at TIMESTAMP;

COMMENT ON COLUMN users.cs2_auth_token IS 'CS2 Authentication Token for accessing match history';
COMMENT ON COLUMN users.cs2_token_linked_at IS 'When CS2 token was linked';

-- 2. Add auto_sync source to cs2_matches
-- First, check if the type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cs2_match_source') THEN
        CREATE TYPE cs2_match_source AS ENUM ('steam_api', 'manual', 'faceit', 'demo_parser', 'share_code', 'auto_sync');
    ELSE
        -- Add new value if type exists
        ALTER TYPE cs2_match_source ADD VALUE IF NOT EXISTS 'auto_sync';
    END IF;
END$$;

-- Update the column to use the enum (if not already)
-- ALTER TABLE cs2_matches 
-- ALTER COLUMN source TYPE cs2_match_source USING source::cs2_match_source;

-- 3. Create cs2_demos table
CREATE TABLE IF NOT EXISTS cs2_demos (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES cs2_matches(id) ON DELETE CASCADE,
    share_code VARCHAR(255) NOT NULL,
    demo_url VARCHAR(500),
    cluster INTEGER,
    file_path VARCHAR(500),
    file_size INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'downloading', 'downloaded', 'parsing', 'parsed', 'failed', 'expired')),
    downloaded_at TIMESTAMP,
    parsed_at TIMESTAMP,
    parse_error TEXT,
    parsed_data JSONB,
    map_name VARCHAR(100),
    duration INTEGER,
    tick_rate INTEGER,
    server_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Comments for cs2_demos table
COMMENT ON TABLE cs2_demos IS 'CS2 demo files and their parsing status';
COMMENT ON COLUMN cs2_demos.match_id IS 'Reference to cs2_matches';
COMMENT ON COLUMN cs2_demos.share_code IS 'CS2 match share code';
COMMENT ON COLUMN cs2_demos.demo_url IS 'URL to demo file on Valve servers';
COMMENT ON COLUMN cs2_demos.cluster IS 'Replay cluster number (0-255)';
COMMENT ON COLUMN cs2_demos.file_path IS 'Local file path if demo was downloaded';
COMMENT ON COLUMN cs2_demos.file_size IS 'Demo file size in bytes';
COMMENT ON COLUMN cs2_demos.status IS 'Demo processing status';
COMMENT ON COLUMN cs2_demos.parsed_data IS 'Full parsed statistics from demo file (JSON)';
COMMENT ON COLUMN cs2_demos.duration IS 'Match duration in seconds';
COMMENT ON COLUMN cs2_demos.tick_rate IS 'Demo tick rate';

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_cs2_demos_match_id ON cs2_demos(match_id);
CREATE INDEX IF NOT EXISTS idx_cs2_demos_share_code ON cs2_demos(share_code);
CREATE INDEX IF NOT EXISTS idx_cs2_demos_status ON cs2_demos(status);
CREATE INDEX IF NOT EXISTS idx_cs2_demos_created_at ON cs2_demos(created_at);

CREATE INDEX IF NOT EXISTS idx_users_cs2_auth_token ON users(cs2_auth_token) WHERE cs2_auth_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cs2_matches_source ON cs2_matches(source);
CREATE INDEX IF NOT EXISTS idx_cs2_matches_user_created ON cs2_matches(user_id, created_at DESC);

-- 5. Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_cs2_demos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cs2_demos_updated_at ON cs2_demos;
CREATE TRIGGER trigger_update_cs2_demos_updated_at
    BEFORE UPDATE ON cs2_demos
    FOR EACH ROW
    EXECUTE FUNCTION update_cs2_demos_updated_at();

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON cs2_demos TO errorparty;
GRANT USAGE, SELECT ON SEQUENCE cs2_demos_id_seq TO errorparty;

-- Migration complete
SELECT 'CS2 Auto-Sync migration completed successfully!' as status;
