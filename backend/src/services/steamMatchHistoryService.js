/**
 * Steam Match History Service
 * 
 * This service works with authenticated Steam sessions.
 * Since we cannot access Steam Community pages without user's session cookies,
 * we provide endpoints that the frontend can call while user is authenticated.
 * 
 * The frontend (React app) will make requests to Steam Community from the browser
 * where the user is already logged in, then send the HTML to our backend for parsing.
 */

const cheerio = require('cheerio');

class SteamMatchHistoryService {
  
  /**
   * Parse match history HTML (sent from frontend where user is authenticated)
   * @param {string} html - HTML content from Steam Community page
   * @param {string} userSteamId - User's Steam ID for result determination
   * @returns {object} Parsed match data
   */
  parseMatchHistoryHTML(html, userSteamId) {
    try {
      const $ = cheerio.load(html);
      const matches = [];
      
      // Find all match tables
      const matchTables = $('table.generic_kv_table.csgo_scoreboard_root');
      
      if (matchTables.length === 0) {
        return {
          success: false,
          matches: [],
          error: 'No match data found. Make sure you are viewing your own profile and have match history.'
        };
      }

      matchTables.each((tableIndex, table) => {
        const $table = $(table);
        const rows = $table.find('tbody tr').toArray();
        
        let currentMatch = null;

        for (const row of rows) {
          const $row = $(row);
          
          // Check if this is a map info row (starts a new match)
          if ($row.find('.val_left').length > 0) {
            // Save previous match if exists
            if (currentMatch && currentMatch.players.length > 0) {
              matches.push(currentMatch);
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
      });

      // Enrich matches with user data
      const enrichedMatches = matches.map(match => {
        const userStats = this.getUserMatchStats(match, userSteamId);
        const won = this.determineMatchResult(match, userSteamId);

        return {
          ...match,
          userStats,
          result: won === true ? 'win' : won === false ? 'loss' : 'unknown'
        };
      });

      return {
        success: true,
        matches: enrichedMatches,
        count: enrichedMatches.length
      };

    } catch (error) {
      console.error('Error parsing match history HTML:', error);
      return {
        success: false,
        matches: [],
        error: error.message
      };
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
    
    // Get player info - try both structures
    let $avatar = $nameCell.find('.playerAvatar');
    let $nickname = $nameCell.find('.playerNickname');
    
    // playerAvatar and playerNickname are themselves <a> tags
    const steamProfileUrl = $avatar.attr('href') || $nickname.attr('href');
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
    
    // Parse MVPs (can be ★★★ or numbers)
    const mvpsText = $(cells[5]).text().trim();
    let mvps = 0;
    if (mvpsText.includes('★')) {
      mvps = (mvpsText.match(/★/g) || []).length;
    } else {
      mvps = parseInt(mvpsText) || 0;
    }
    
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
      mvps,
      headshotPercentage: hsp !== '&nbsp;' && hsp && hsp !== '' ? parseFloat(hsp.replace('%', '')) : null,
      score
    };
  }

  /**
   * Parse match date string to Date object
   */
  parseMatchDate(dateString) {
    try {
      const cleanDate = dateString.replace(' GMT', '').replace(' UTC', '');
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

    const profileMatch = url.match(/\/profiles\/(\d+)/);
    if (profileMatch) {
      return profileMatch[1];
    }

    const idMatch = url.match(/\/id\/([^/]+)/);
    if (idMatch) {
      return idMatch[1];
    }

    return null;
  }

  /**
   * Get match statistics for current user
   */
  getUserMatchStats(match, currentUserSteamId) {
    return match.players.find(p => 
      p.steamId === currentUserSteamId
    ) || null;
  }

  /**
   * Determine if current user won the match
   */
  determineMatchResult(match, currentUserSteamId) {
    const currentPlayer = match.players.find(p => 
      p.steamId === currentUserSteamId
    );

    if (!currentPlayer) {
      return null;
    }

    const playerIndex = match.players.indexOf(currentPlayer);
    const isTeamA = playerIndex < match.players.length / 2;
    
    if (isTeamA) {
      return match.teamAScore > match.teamBScore;
    } else {
      return match.teamBScore > match.teamAScore;
    }
  }

  /**
   * Get available match types
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

module.exports = new SteamMatchHistoryService();
