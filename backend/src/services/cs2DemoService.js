const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { decodeMatchShareCode } = require('csgo-sharecode');

/**
 * Декодирует Share Code в Match ID, Outcome ID, Token
 * Использует официальную библиотеку csgo-sharecode
 */
function decodeShareCode(shareCode) {
  try {
    const decoded = decodeMatchShareCode(shareCode);
    return {
      matchId: decoded.matchId.toString(),
      outcomeId: decoded.reservationId.toString(),
      tokenId: decoded.tvPort
    };
  } catch (error) {
    throw new Error(`Invalid share code: ${error.message}`);
  }
}

/**
 * Получает информацию о матче через Steam API
 */
async function getMatchInfo(authCode, shareCode) {
  try {
    const decoded = decodeShareCode(shareCode);
    console.log(`📊 Decoded share code: Match=${decoded.matchId}, Outcome=${decoded.outcomeId}, Token=${decoded.tokenId}`);
    
    // Steam API endpoint для получения информации о матче
    const response = await axios.get('https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1/', {
      params: {
        key: process.env.STEAM_API_KEY,
        steamid: authCode,
        steamidkey: authCode,
        knowncode: shareCode
      },
      timeout: 10000
    });
    
    console.log('📡 Steam API response:', JSON.stringify(response.data, null, 2));
    
    return {
      ...decoded,
      apiResponse: response.data
    };
  } catch (error) {
    console.error('❌ Error getting match info:', error.message);
    throw error;
  }
}

/**
 * Пытается скачать demo файл
 * CS2 demo файлы доступны через replay servers
 */
async function downloadDemo(matchId, outcomeId, tokenId, downloadPath) {
  try {
    // Пробуем разные возможные URL для demo
    const possibleUrls = [
      `http://replay${tokenId % 256}.valve.net/730/${matchId}_${outcomeId}.dem.bz2`,
      `http://replay${tokenId % 256}.valve.net/730/${matchId}.dem.bz2`,
      `https://replay${tokenId % 256}.valve.net/730/${matchId}_${outcomeId}.dem.bz2`
    ];
    
    console.log(`🔍 Trying to download demo from ${possibleUrls.length} possible URLs...`);
    
    for (const url of possibleUrls) {
      try {
        console.log(`📥 Attempting: ${url}`);
        
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'arraybuffer',
          timeout: 60000, // 60 секунд
          headers: {
            'User-Agent': 'Valve/Steam HTTP Client 1.0'
          }
        });
        
        // Сохраняем файл
        await fs.writeFile(downloadPath, response.data);
        
        const stats = await fs.stat(downloadPath);
        console.log(`✅ Demo downloaded successfully: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        return {
          success: true,
          path: downloadPath,
          size: stats.size,
          url: url
        };
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        continue;
      }
    }
    
    throw new Error('Demo not available from any replay server');
  } catch (error) {
    console.error('❌ Error downloading demo:', error.message);
    throw error;
  }
}

/**
 * Основная функция: получает demo файл по Share Code
 */
async function fetchDemoByShareCode(authCode, shareCode) {
  try {
    console.log(`🎯 Fetching demo for share code: ${shareCode}`);
    
    // Декодируем Share Code
    const decoded = decodeShareCode(shareCode);
    console.log(`📊 Match ID: ${decoded.matchId}, Outcome ID: ${decoded.outcomeId}, Token: ${decoded.tokenId}`);
    
    // Путь для сохранения
    const demoDir = path.join(__dirname, '../../demos');
    await fs.mkdir(demoDir, { recursive: true });
    
    const fileName = `${decoded.matchId}_${decoded.outcomeId}.dem.bz2`;
    const downloadPath = path.join(demoDir, fileName);
    
    // Проверяем, не скачан ли уже файл
    try {
      await fs.access(downloadPath);
      console.log(`✅ Demo already exists: ${downloadPath}`);
      const stats = await fs.stat(downloadPath);
      return {
        success: true,
        path: downloadPath,
        size: stats.size,
        cached: true
      };
    } catch {
      // Файл не существует, скачиваем
    }
    
    // Скачиваем demo
    const result = await downloadDemo(decoded.matchId, decoded.outcomeId, decoded.tokenId, downloadPath);
    
    return result;
  } catch (error) {
    console.error('❌ Error in fetchDemoByShareCode:', error.message);
    throw error;
  }
}

module.exports = {
  decodeShareCode,
  getMatchInfo,
  downloadDemo,
  fetchDemoByShareCode
};
