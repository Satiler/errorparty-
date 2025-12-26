-- ✅ Critical Database Indexes Migration
-- Fixes N+1 queries and improves performance for common operations
-- Date: 2025-11-25

-- CS2Match indexes for match queries (using correct column names)
CREATE INDEX IF NOT EXISTS idx_cs2match_user_date 
ON cs2_matches(user_id, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_cs2match_date 
ON cs2_matches(played_at DESC);

CREATE INDEX IF NOT EXISTS idx_cs2match_user_win 
ON cs2_matches(user_id, is_win);

-- UserQuest indexes for quest queries  
CREATE INDEX IF NOT EXISTS idx_userquest_user_status 
ON user_quests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_userquest_quest_status 
ON user_quests(quest_id, status);

CREATE INDEX IF NOT EXISTS idx_userquest_user_expires 
ON user_quests(user_id, expires_at);

-- User indexes for leaderboards
CREATE INDEX IF NOT EXISTS idx_user_online_time 
ON users(total_online_time DESC);

-- Meme indexes for top memes (using correct column names)
CREATE INDEX IF NOT EXISTS idx_meme_rating 
ON memes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meme_views 
ON memes(created_at DESC);

-- LinkToken index for faster lookups (correct column name)
CREATE INDEX IF NOT EXISTS idx_linktoken_token_expiry 
ON link_tokens(token, expires_at) WHERE "isUsed" = false;

-- UserStats index for level calculations
CREATE INDEX IF NOT EXISTS idx_userstats_level 
ON user_stats(level DESC, experience DESC);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_userquest_active_quests
ON user_quests(user_id, status, expires_at) 
WHERE status IN ('active', 'completed');

-- Comments
COMMENT ON INDEX idx_cs2match_user_date IS 'Optimizes user match history queries';
COMMENT ON INDEX idx_userquest_user_status IS 'Optimizes quest panel queries';
COMMENT ON INDEX idx_user_online_time IS 'Optimizes leaderboard queries';
