-- CS2 Advanced Statistics Migration
-- Creates tables for weapon statistics and player performance

-- CS2 Weapon Statistics Table
CREATE TABLE IF NOT EXISTS cs2_weapon_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES cs2_matches(id) ON DELETE CASCADE,
  
  -- Weapon information
  weapon_name VARCHAR(100) NOT NULL,
  weapon_type VARCHAR(20) NOT NULL CHECK (weapon_type IN ('rifle', 'pistol', 'smg', 'sniper', 'shotgun', 'heavy', 'grenade', 'knife', 'equipment')),
  
  -- Kill statistics
  kills INTEGER NOT NULL DEFAULT 0,
  headshots INTEGER NOT NULL DEFAULT 0,
  wallbang_kills INTEGER NOT NULL DEFAULT 0,
  airshot_kills INTEGER NOT NULL DEFAULT 0,
  blind_kills INTEGER NOT NULL DEFAULT 0,
  
  -- Damage statistics
  total_damage INTEGER NOT NULL DEFAULT 0,
  
  -- Accuracy statistics
  shots_hit INTEGER NOT NULL DEFAULT 0,
  shots_fired INTEGER NOT NULL DEFAULT 0,
  accuracy FLOAT,
  headshot_percentage FLOAT,
  
  -- Additional metrics
  deaths INTEGER NOT NULL DEFAULT 0,
  first_kills INTEGER NOT NULL DEFAULT 0,
  multi_kills INTEGER NOT NULL DEFAULT 0,
  time_used INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for weapon stats
CREATE INDEX idx_weapon_stats_user_weapon ON cs2_weapon_stats(user_id, weapon_name);
CREATE INDEX idx_weapon_stats_user_type ON cs2_weapon_stats(user_id, weapon_type);
CREATE INDEX idx_weapon_stats_match ON cs2_weapon_stats(match_id);

-- CS2 Player Performance Table
CREATE TABLE IF NOT EXISTS cs2_player_performance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Overall statistics
  total_matches INTEGER NOT NULL DEFAULT 0,
  matches_won INTEGER NOT NULL DEFAULT 0,
  matches_lost INTEGER NOT NULL DEFAULT 0,
  winrate FLOAT,
  
  -- KDA statistics
  total_kills INTEGER NOT NULL DEFAULT 0,
  total_deaths INTEGER NOT NULL DEFAULT 0,
  total_assists INTEGER NOT NULL DEFAULT 0,
  kd_ratio FLOAT,
  ad_ratio FLOAT,
  ka_ratio FLOAT,
  
  -- Damage statistics
  total_damage INTEGER NOT NULL DEFAULT 0,
  average_damage_per_round FLOAT,
  average_damage_per_match FLOAT,
  
  -- Headshot statistics
  total_headshots INTEGER NOT NULL DEFAULT 0,
  headshot_percentage FLOAT,
  
  -- Round statistics
  total_rounds INTEGER NOT NULL DEFAULT 0,
  rounds_won INTEGER NOT NULL DEFAULT 0,
  total_mvps INTEGER NOT NULL DEFAULT 0,
  
  -- Multi-kill statistics
  total_3kills INTEGER NOT NULL DEFAULT 0,
  total_4kills INTEGER NOT NULL DEFAULT 0,
  total_5kills INTEGER NOT NULL DEFAULT 0,
  
  -- Clutch statistics
  total_clutches INTEGER NOT NULL DEFAULT 0,
  clutches_won INTEGER NOT NULL DEFAULT 0,
  clutch_success_rate FLOAT,
  
  -- Entry statistics
  total_entry_attempts INTEGER NOT NULL DEFAULT 0,
  total_entry_kills INTEGER NOT NULL DEFAULT 0,
  entry_success_rate FLOAT,
  
  -- Utility statistics
  total_flash_assists INTEGER NOT NULL DEFAULT 0,
  total_utility_damage INTEGER NOT NULL DEFAULT 0,
  
  -- Economy statistics
  total_money_earned BIGINT NOT NULL DEFAULT 0,
  average_money_per_round FLOAT,
  
  -- Rating systems
  hltv_rating FLOAT,
  impact_rating FLOAT,
  consistency_score FLOAT,
  
  -- Recent form (last 10 matches)
  recent_winrate FLOAT,
  recent_kd FLOAT,
  recent_adr FLOAT,
  
  -- Playtime
  total_playtime_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Peak performance
  best_kills_in_match INTEGER,
  best_adr_in_match FLOAT,
  longest_win_streak INTEGER NOT NULL DEFAULT 0,
  current_win_streak INTEGER NOT NULL DEFAULT 0,
  
  -- Last updated
  last_match_date TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for player performance
CREATE UNIQUE INDEX idx_player_performance_user ON cs2_player_performance(user_id);
CREATE INDEX idx_player_performance_rating ON cs2_player_performance(hltv_rating);
CREATE INDEX idx_player_performance_winrate ON cs2_player_performance(winrate);
CREATE INDEX idx_player_performance_kd ON cs2_player_performance(kd_ratio);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cs2_weapon_stats_updated_at BEFORE UPDATE ON cs2_weapon_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs2_player_performance_updated_at BEFORE UPDATE ON cs2_player_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE cs2_weapon_stats IS 'Detailed weapon usage statistics per player and match';
COMMENT ON TABLE cs2_player_performance IS 'Aggregated player performance metrics and ratings';
COMMENT ON COLUMN cs2_player_performance.hltv_rating IS 'HLTV 2.0 Rating calculation';
COMMENT ON COLUMN cs2_player_performance.impact_rating IS 'Impact score based on clutches, entries, and MVPs';
