/**
 * Фоновая задача для проактивного обновления устаревших URL
 * Запускается каждые 30 минут для предотвращения задержек при воспроизведении
 */

const { getInstance: getSmartCache } = require('../services/smart-cache.service');

/**
 * Обновить устаревшие URL в фоне
 */
async function refreshExpiredUrls() {
  console.log('[URL Refresh Job] Starting...');
  
  try {
    const smartCache = getSmartCache();
    const result = await smartCache.refreshExpiredUrls(50); // Обновить до 50 треков за раз
    
    console.log(`[URL Refresh Job] ✅ Completed: ${result.refreshed} URLs refreshed, ${result.failed} failed`);
    
    if (result.refreshed > 0) {
      console.log(`[URL Refresh Job] Updated tracks:`, result.updated.map(t => `${t.artist} - ${t.title}`));
    }
    
  } catch (error) {
    console.error('[URL Refresh Job] ❌ Error:', error.message);
  }
}

/**
 * Запустить задачу по расписанию
 */
function startJob() {
  // Запускать каждые 30 минут
  const INTERVAL = 30 * 60 * 1000; // 30 минут
  
  console.log('[URL Refresh Job] Starting periodic refresh (every 30 minutes)');
  
  // Первый запуск через 5 минут после старта
  setTimeout(() => {
    refreshExpiredUrls();
    
    // Затем каждые 30 минут
    setInterval(refreshExpiredUrls, INTERVAL);
  }, 5 * 60 * 1000); // 5 минут
}

module.exports = {
  refreshExpiredUrls,
  startJob
};
