/**
 * Steam Match History Parser Service
 * 
 * Parses CS2 match history from Steam Community pages
 * URL format: https://steamcommunity.com/id/{vanityUrl}/gcpd/730/?tab=matchhistorypremier
 * or: https://steamcommunity.com/profiles/{steamId64}/gcpd/730/?tab=matchhistorypremier
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { normalizeShareCode } = require('../utils/shareCodeDecoder');

class SteamMatchHistoryParser {
  
  /**
   * Fetch and parse match history from Steam Community page
   * @param {string} steamIdOrVanity - Steam ID64 or vanity URL name
   * @param {object} options - Options for parsing
   * @param {string} options.tab - Match type tab (matchhistorypremier, matchhistorycompetitive, etc.)
   * @param {number} options.maxMatches - Maximum number of matches to parse
   * @param {string} options.continueToken - Token for loading more matches
   * @returns {Promise<object>} Parsed match data
   */
  async parseMatchHistory(steamIdOrVanity, options = {}) {
    try {
      const {
        tab = 'matchhistorypremier',
        maxMatches = 50,
        continueToken = null
      } = options;

      // Determine if it's a vanity URL or Steam ID
      const isVanityUrl = isNaN(steamIdOrVanity);
      const profileUrl = isVanityUrl 
        ? `https://steamcommunity.com/id/${steamIdOrVanity}/gcpd/730/`
        : `https://steamcommunity.com/profiles/${steamIdOrVanity}/gcpd/730/`;

      console.log(`📊 Fetching match history from: ${profileUrl}`);

      // Build request parameters
      const params = {
        tab
      };

      // Only add ajax and continue_token if we want AJAX response
      if (continueToken) {
        params.ajax = 1;
        params.continue_token = continueToken;
      }

      // Fetch the page
      const response = await axios.get(profileUrl, {
        params,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 30000
      });

      // Check if we got JSON response (for AJAX requests)
      let html, nextContinueToken;
      if (response.data.html !== undefined) {
        html = response.data.html;
        nextContinueToken = response.data.continue_token;
      } else {
        html = response.data;
      }

      // Debug: log first 500 chars to see structure
      if (process.env.DEBUG_PARSER) {
        console.log('HTML preview:', typeof html === 'string' ? html.substring(0, 500) : 'Not a string');
      }

      // Parse HTML
      const $ = cheerio.load(html);
      const matches = [];

      // Debug: check what we found
      const tables = $('table.csgo_scoreboard_root').length;
      const rows = $('.csgo_scoreboard_root tbody tr').length;
      const allTables = $('table').length;
      const genericTables = $('table.generic_kv_table').length;
      
      console.log(`🔍 Debug: Found ${tables} csgo_scoreboard_root tables, ${rows} rows`);
      console.log(`🔍 Debug: Total tables: ${allTables}, generic_kv_table: ${genericTables}`);
      
      // Check for error messages
      const noDataMsg = $('#no_personal_data_stored_message').text().trim();
      const pageContent = $('#personaldata_elements_container').length;
      const errorMsg = $('.error_ctn').text().trim();
      
      console.log(`🔍 No data message: "${noDataMsg}"`);
      console.log(`🔍 Content container found: ${pageContent > 0}`);
      console.log(`🔍 Error message: "${errorMsg}"`);

      // Find all match rows
      const matchRows = $('.csgo_scoreboard_root tbody tr').toArray();
      
      let currentMatch = null;

      for (const row of matchRows) {
        const $row = $(row);
        
        // Check if this is a map info row (starts a new match)
        if ($row.find('.val_left').length > 0) {
          // Save previous match if exists
          if (currentMatch && currentMatch.players.length > 0) {
            matches.push(currentMatch);
            if (matches.length >= maxMatches) break;
          }

          // Start new match
          currentMatch = this.parseMatchHeader($, $row);
        } 
        // Check if this is a score separator row
        else if ($row.find('.csgo_scoreboard_score').length > 0) {
          if (currentMatch) {
            const scoreText = $row.find('.csgo_scoreboard_score').text().trim();
            const [teamAScore, teamBScore] = scoreText.split(':').map(s => parseInt(s.trim()));
            currentMatch.teamAScore = teamAScore;
            currentMatch.teamBScore = teamBScore;
          }
        }
        // Otherwise it's a player row
        else if ($row.find('.inner_name').length > 0) {
          if (currentMatch) {
            const player = this.parsePlayerRow($, $row);
            currentMatch.players.push(player);
          }
        }
      }

      // Add last match
      if (currentMatch && currentMatch.players.length > 0) {
        matches.push(currentMatch);
      }

      console.log(`✅ Parsed ${matches.length} matches`);

      return {
        matches,
        continueToken: nextContinueToken,
        hasMore: !!nextContinueToken
      };

    } catch (error) {
      console.error('Error parsing match history:', error.message);
      throw error;
    }
  }

  /**
   * Parse match header information
   */
  parseMatchHeader($, $row) {
    const $leftCell = $row.find('.val_left');
    const $innerLeft = $leftCell.find('.csgo_scoreboard_inner_left');
    
    // Get map image and name
    const mapImage = $leftCell.find('img').attr('src');
    const mapName = $innerLeft.find('tr').eq(0).find('td').text().trim();
    
    // Get date/time
    const dateText = $innerLeft.find('tr').eq(1).find('td').text().trim();
    
    // Get match details
    const details = {};
    $innerLeft.find('tr').each((i, tr) => {
      const text = $(tr).find('td').text().trim();
      if (text.includes('Ranked:')) {
        details.ranked = text.split(':')[1].trim() === 'Yes';
      } else if (text.includes('Wait Time:')) {
        details.waitTime = text.split(':')[1].trim();
      } else if (text.includes('Match Duration:')) {
        details.duration = text.split(':')[1].trim();
      }
    });

    return {
      mapName,
      mapImage,
      date: this.parseMatchDate(dateText),
      ranked: details.ranked,
      waitTime: details.waitTime,
      duration: details.duration,
      players: [],
      teamAScore: null,
      teamBScore: null
    };
  }

  /**
   * Parse player row information
   */
  parsePlayerRow($, $row) {
    const $nameCell = $row.find('.inner_name');
    
    // Get player info
    const $avatar = $nameCell.find('.playerAvatar a');
    const $nickname = $nameCell.find('.playerNickname a');
    
    const steamProfileUrl = $avatar.attr('href');
    const avatarUrl = $avatar.find('img').attr('src');
    const nickname = $nickname.text().trim();
    const miniprofile = $nickname.attr('data-miniprofile');
    
    // Extract Steam ID from profile URL
    const steamId = this.extractSteamIdFromUrl(steamProfileUrl);

    // Get stats
    const cells = $row.find('td');
    const ping = parseInt($(cells[1]).text().trim()) || 0;
    const kills = parseInt($(cells[2]).text().trim()) || 0;
    const assists = parseInt($(cells[3]).text().trim()) || 0;
    const deaths = parseInt($(cells[4]).text().trim()) || 0;
    const mvps = $(cells[5]).text().trim().replace(/[★\s]/g, '');
    const hsp = $(cells[6]).text().trim();
    const score = parseInt($(cells[7]).text().trim()) || 0;

    return {
      nickname,
      steamId,
      steamProfileUrl,
      avatarUrl,
      miniprofile,
      ping,
      kills,
      assists,
      deaths,
      mvps: mvps ? parseInt(mvps) : 0,
      headshotPercentage: hsp !== '&nbsp;' ? parseFloat(hsp.replace('%', '')) : null,
      score
    };
  }

  /**
   * Parse match date string to Date object
   */
  parseMatchDate(dateString) {
    // Format: "2025-11-09 22:14:17 GMT"
    try {
      const cleanDate = dateString.replace(' GMT', '');
      return new Date(cleanDate + ' UTC');
    } catch (error) {
      console.error('Error parsing date:', dateString);
      return null;
    }
  }

  /**
   * Extract Steam ID from profile URL
   */
  extractSteamIdFromUrl(url) {
    if (!url) return null;

    // Match /profiles/{steamId64}
    const profileMatch = url.match(/\/profiles\/(\d+)/);
    if (profileMatch) {
      return profileMatch[1];
    }

    // Match /id/{vanityUrl}
    const idMatch = url.match(/\/id\/([^/]+)/);
    if (idMatch) {
      return idMatch[1]; // Return vanity URL, will need to resolve later
    }

    return null;
  }

  /**
   * Determine if current user won the match
   * @param {object} match - Parsed match data
   * @param {string} currentUserSteamId - Current user's Steam ID
   * @returns {boolean|null} True if won, false if lost, null if unknown
   */
  determineMatchResult(match, currentUserSteamId) {
    const currentPlayer = match.players.find(p => 
      p.steamId === currentUserSteamId
    );

    if (!currentPlayer) {
      return null; // User not found in match
    }

    // Find player's position in the list
    const playerIndex = match.players.indexOf(currentPlayer);
    
    // First half of players is Team A, second half is Team B
    const isTeamA = playerIndex < match.players.length / 2;
    
    if (isTeamA) {
      return match.teamAScore > match.teamBScore;
    } else {
      return match.teamBScore > match.teamAScore;
    }
  }

  /**
   * Get match statistics for current user
   * @param {object} match - Parsed match data
   * @param {string} currentUserSteamId - Current user's Steam ID
   * @returns {object|null} User's stats from the match
   */
  getUserMatchStats(match, currentUserSteamId) {
    return match.players.find(p => 
      p.steamId === currentUserSteamId
    ) || null;
  }

  /**
   * Fetch all available match history (multiple pages)
   * @param {string} steamIdOrVanity - Steam ID64 or vanity URL name
   * @param {object} options - Options for parsing
   * @returns {Promise<Array>} Array of all parsed matches
   */
  async fetchAllMatchHistory(steamIdOrVanity, options = {}) {
    const {
      tab = 'matchhistorypremier',
      maxMatches = 100
    } = options;

    let allMatches = [];
    let continueToken = null;
    let hasMore = true;

    while (hasMore && allMatches.length < maxMatches) {
      const result = await this.parseMatchHistory(steamIdOrVanity, {
        tab,
        maxMatches: maxMatches - allMatches.length,
        continueToken
      });

      allMatches = allMatches.concat(result.matches);
      continueToken = result.continueToken;
      hasMore = result.hasMore;

      if (hasMore) {
        // Wait a bit before next request to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allMatches;
  }

  /**
   * Get available match types for a user
   * @returns {Array<object>} Array of match type tabs
   */
  getAvailableMatchTypes() {
    return [
      { id: 'matchhistorypremier', name: 'Premier Matches', description: 'Ranked Premier mode' },
      { id: 'matchhistorycompetitive', name: 'Competitive Matches', description: 'Standard competitive' },
      { id: 'matchhistorycompetitivepermap', name: 'Competitive Per Map', description: 'Map-specific competitive' },
      { id: 'matchhistoryscrimmage', name: 'Scrimmage Matches', description: 'Unranked scrimmage' },
      { id: 'matchhistorywingman', name: 'Wingman Matches', description: '2v2 Wingman mode' },
      { id: 'matchhistorycasual', name: 'Casual Matches', description: 'Casual mode' }
    ];
  }
}

module.exports = new SteamMatchHistoryParser();
