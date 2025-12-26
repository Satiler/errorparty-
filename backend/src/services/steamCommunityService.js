const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Steam Community Service
 * Авторизация и получение данных со страниц Steam Community
 */
class SteamCommunityService {
  /**
   * Получить список demo URL с страницы match history
   * @param {string} steamId - Steam ID пользователя
   * @param {string} authToken - Auth Token для авторизации
   * @returns {Array} - Массив объектов с demo URLs и match info
   */
  async getMatchHistoryDemos(steamId, authToken) {
    try {
      console.log(`🔐 Fetching match history from Steam Community for ${steamId}...`);
      
      // Формируем URL
      const url = `https://steamcommunity.com/profiles/${steamId}/gcpd/730/?tab=matchhistorycompetitive`;
      
      // Создаем cookie для авторизации
      // Формат: steamLoginSecure=76561198306468078||<token>
      const sessionCookie = `steamLoginSecure=${steamId}||${authToken}`;
      
      // Запрос к Steam Community
      const response = await axios.get(url, {
        headers: {
          'Cookie': sessionCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        timeout: 30000
      });
      
      const html = response.data;
      
      // Парсим HTML с помощью cheerio
      const $ = cheerio.load(html);
      
      // Ищем demo URLs в HTML
      // CS2 использует формат: http://replay{N}.valve.net/730/match730_{matchid}_{outcomeid}_{token}.dem.bz2
      // или просто: http://replay{N}.valve.net/730/{matchid}_{outcomeid}_{token}.dem.bz2
      const demoPattern = /http:\/\/replay(\d+)\.valve\.net\/730\/(match730_)?(\d+)_(\d+)_(\d+)\.dem\.bz2/g;
      const demos = [];
      
      let match;
      while ((match = demoPattern.exec(html)) !== null) {
        const cluster = parseInt(match[1]);
        const matchId = match[3];
        const outcomeId = match[4];
        const token = match[5];
        const fullUrl = match[0];
        
        demos.push({
          url: fullUrl,
          cluster: cluster,
          demoFile: `${matchId}_${outcomeId}_${token}`,
          matchId: matchId,
          outcomeId: outcomeId,
          token: token
        });
      }
      
      console.log(`✅ Found ${demos.length} demo URLs from Steam Community`);
      
      return demos;
      
    } catch (error) {
      console.error('Error fetching Steam Community match history:', error.message);
      
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Authentication failed. Auth token may be invalid or expired.');
      }
      
      throw error;
    }
  }
  
  /**
   * Скачать demo файл по URL
   * @param {string} url - URL demo файла
   * @param {number} matchId - ID матча
   * @returns {Buffer} - Содержимое demo файла
   */
  async downloadDemoByUrl(url, matchId) {
    try {
      console.log(`📥 Downloading demo from URL: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 180000, // 3 minutes
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted % 25 === 0) {
              console.log(`  📊 Match ${matchId}: ${percentCompleted}%`);
            }
          }
        }
      });
      
      console.log(`✅ Demo downloaded: ${Math.round(response.data.length / 1024 / 1024)}MB`);
      
      return response.data;
      
    } catch (error) {
      console.error(`Error downloading demo from ${url}:`, error.message);
      throw error;
    }
  }
}

module.exports = new SteamCommunityService();
