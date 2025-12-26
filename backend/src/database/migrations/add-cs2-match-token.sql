-- Add CS2 Match Token column to users table
-- Match Token is the Share Code of the last competitive match
-- Used as anchor for syncing match history via GetNextMatchSharingCode API

ALTER TABLE users ADD COLUMN IF NOT EXISTS cs2_match_token VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cs2_match_token_linked_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_cs2_match_token ON users(cs2_match_token) WHERE cs2_match_token IS NOT NULL;
