const axios = require('axios');

/**
 * Get Dota 2 global leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const url = 'https://api.opendota.com/api/proPlayers';
    const response = await axios.get(url);
    
    // Get top 100 players sorted by MMR
    const players = response.data
      .filter(p => p.mmr_estimate && p.mmr_estimate.estimate)
      .sort((a, b) => (b.mmr_estimate?.estimate || 0) - (a.mmr_estimate?.estimate || 0))
      .slice(0, 100)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name || player.personaname || 'Unknown',
        avatar: player.avatarfull,
        team_name: player.team_name,
        mmr: player.mmr_estimate?.estimate || 0,
        rank_tier: 80, // Most pro players are Immortal
        wins: Math.floor(Math.random() * 1000) + 500, // Mock data
        losses: Math.floor(Math.random() * 800) + 300, // Mock data
        country: player.country_code || 'Unknown'
      }));

    res.json({
      success: true,
      players
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
};

/**
 * Get global hero statistics
 */
const getHeroStats = async (req, res) => {
  try {
    const url = 'https://api.opendota.com/api/heroStats';
    const response = await axios.get(url);
    
    const heroes = response.data.map(hero => ({
      hero_id: hero.id,
      name: hero.localized_name,
      picks: hero['1_pick'] || 0,
      wins: hero['1_win'] || 0,
      pro_pick: hero.pro_pick || 0,
      pro_win: hero.pro_win || 0,
      pro_ban: hero.pro_ban || 0,
      attack_type: hero.attack_type,
      roles: hero.roles || [],
      legs: hero.legs
    }));

    // Sort by pick rate
    heroes.sort((a, b) => b.picks - a.picks);

    res.json({
      success: true,
      heroes
    });
  } catch (error) {
    console.error('Hero stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hero stats' });
  }
};

/**
 * Search players by name or Steam ID
 */
const searchPlayers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    // Search in OpenDota
    const url = `https://api.opendota.com/api/search?q=${encodeURIComponent(q)}`;
    const response = await axios.get(url);
    
    const players = response.data.slice(0, 20).map((player, index) => ({
      rank: index + 1,
      name: player.personaname || 'Unknown',
      avatar: player.avatarfull,
      steam_id: player.account_id,
      similarity: player.similarity
    }));

    res.json({
      success: true,
      players
    });
  } catch (error) {
    console.error('Search players error:', error);
    res.status(500).json({ success: false, error: 'Failed to search players' });
  }
};

/**
 * Get recent public matches
 */
const getRecentMatches = async (req, res) => {
  try {
    const url = 'https://api.opendota.com/api/publicMatches';
    const response = await axios.get(url);
    
    const matches = response.data.slice(0, 100).map(match => ({
      match_id: match.match_id,
      duration: match.duration,
      start_time: match.start_time,
      radiant_team: match.radiant_team,
      dire_team: match.dire_team,
      radiant_win: match.radiant_win,
      game_mode: match.game_mode,
      avg_mmr: match.avg_mmr,
      avg_rank_tier: match.avg_rank_tier,
      radiant_score: match.radiant_score,
      dire_score: match.dire_score
    }));
    
    res.json({
      success: true,
      matches
    });
  } catch (error) {
    console.error('Recent matches error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent matches' });
  }
};

/**
 * Get live games
 */
const getLiveGames = async (req, res) => {
  try {
    const url = 'https://api.opendota.com/api/live';
    const response = await axios.get(url);
    
    res.json({
      success: true,
      games: response.data.slice(0, 20)
    });
  } catch (error) {
    console.error('Live games error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch live games' });
  }
};

module.exports = {
  getLeaderboard,
  getHeroStats,
  searchPlayers,
  getRecentMatches,
  getLiveGames
};
