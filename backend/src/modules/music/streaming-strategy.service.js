/**
 * Streaming Strategy Service
 * Интеллектуальная стратегия стриминга с автокешированием
 */

const musicSourceManager = require('./music-source-manager');
const localProvider = require('./providers/local-provider');
const { Track } = require('../../models');

class StreamingStrategy {
  constructor() {
    this.cacheThreshold = 50; // Кешировать треки с playCount > 50
  }

  /**
   * Получить URL для стриминга трека
   * @param {Object} track - Трек из БД
   * @param {Object} user - Пользователь (опционально)
   * @returns {Promise<Object>} { type: 'local'|'proxy', url: string }
   */
  async getStreamUrl(track, user = null) {
    console.log(`[StreamingStrategy] Getting stream URL for track ${track.id}: ${track.artist} - ${track.title}`);

    // 0. Проверка наличия хоть какого-то источника
    const hasStreamUrl = track.streamUrl && track.streamUrl.trim() !== '';
    const hasFilePath = track.filePath && track.filePath.trim() !== '';
    const hasExternalUrl = track.externalUrl && track.externalUrl.trim() !== '';
    
    if (!hasStreamUrl && !hasFilePath && !hasExternalUrl) {
      console.error(`[StreamingStrategy] Track ${track.id} has NO valid source at all`);
      // Пытаемся найти альтернативный источник
      console.log(`[StreamingStrategy] Attempting emergency track source refresh...`);
      try {
        const refreshed = await musicSourceManager.refreshTrackSource(track);
        if (refreshed && refreshed.streamUrl) {
          console.log(`[StreamingStrategy] Emergency refresh successful`);
          track.streamUrl = refreshed.streamUrl;
          // Продолжаем обработку с новым streamUrl
        } else {
          throw new Error('Track has no valid source and refresh failed');
        }
      } catch (err) {
        console.error(`[StreamingStrategy] Emergency refresh failed:`, err.message);
        await track.update({ isVerified: false, lastChecked: new Date() });
        throw new Error('Track unavailable - no valid source');
      }
    }

    // 1. Если трек локальный - отдаем напрямую
    if (track.filePath && !track.filePath.startsWith('http')) {
      const isAvailable = await localProvider.isAvailable(track);
      
      if (isAvailable) {
        console.log(`[StreamingStrategy] Using local file`);
        return {
          type: 'local',
          url: `/api/music/tracks/${track.id}/stream/local`,
          filePath: track.filePath
        };
      } else {
        console.log(`[StreamingStrategy] Local file not available, searching alternative...`);
        // Локальный файл недоступен - пытаемся найти альтернативу
      }
    }

    // 2. Если трек популярный и не локальный - скачать и кешировать
    // НО: Не кешируем HLS/m3u8 потоки (VK, KissVK) - они требуют прокси
    const isHlsStream = track.streamUrl && (track.streamUrl.includes('.m3u8') || track.streamUrl.includes('vkuseraudio'));
    const isKissVK = track.source === 'kissvk' || track.provider === 'kissvk';
    
    if (track.playCount >= this.cacheThreshold && !track.filePath && !isHlsStream && !isKissVK) {
      console.log(`[StreamingStrategy] Track is popular (${track.playCount} plays), attempting to cache...`);
      
      try {
        await this.downloadAndCache(track);
        
        // После скачивания обновляем объект
        await track.reload();
        
        return {
          type: 'local',
          url: `/api/music/tracks/${track.id}/stream/local`,
          filePath: track.filePath,
          cached: true
        };
      } catch (error) {
        console.error(`[StreamingStrategy] Failed to cache track ${track.id}:`, error.message);
        // Продолжаем к следующему шагу
      }
    }

    // 3. Если filePath - это внешний URL (http/https)
    console.log(`[StreamingStrategy] Checking filePath: ${track.filePath}, type: ${typeof track.filePath}`);
    if (track.filePath && track.filePath.startsWith('http')) {
      console.log(`[StreamingStrategy] Using filePath as external URL: ${track.filePath}`);
      return {
        type: 'proxy',
        url: `/api/music/tracks/${track.id}/stream/proxy`,
        externalUrl: track.filePath
      };
    }

    // 4. Если есть streamUrl - используем его (приоритет для внешних источников)
    if (track.streamUrl) {
      // Если URL зашифрован (encrypted:) - сначала нужно его расшифровать
      if (track.streamUrl.startsWith('encrypted:')) {
        console.log(`[StreamingStrategy] Track has encrypted URL, attempting to refresh...`);
        
        // Пытаемся обновить источник трека
        const refreshed = await musicSourceManager.refreshTrackSource(track);
        
        if (refreshed && refreshed.streamUrl && !refreshed.streamUrl.startsWith('encrypted:')) {
          console.log(`[StreamingStrategy] Successfully decrypted URL`);
          
          return {
            type: 'proxy',
            url: `/api/music/tracks/${track.id}/stream/proxy`,
            externalUrl: refreshed.streamUrl,
            refreshed: true
          };
        } else {
          console.log(`[StreamingStrategy] Failed to decrypt URL, track unavailable`);
          throw new Error('Track URL is encrypted and could not be decrypted');
        }
      }
      
      // Для VK URLs и KissVK - всегда используем прокси (они требуют специальных headers)
      const isVkUrl = track.streamUrl.includes('vkuseraudio') || track.streamUrl.includes('m3u8');
      const isKissVK = track.source === 'kissvk' || track.provider === 'kissvk';
      
      if (isVkUrl || isKissVK) {
        console.log(`[StreamingStrategy] Using VK/KissVK stream via proxy`);
        
        // Обновляем статус верификации без проверки доступности
        await track.update({
          isVerified: true,
          lastChecked: new Date()
        });
        
        return {
          type: 'proxy',
          url: `/api/music/tracks/${track.id}/stream/proxy`,
          externalUrl: track.streamUrl
        };
      }
      
      // Для других источников - проверяем доступность
      const isAvailable = await musicSourceManager.verifyTrack(track);
      
      if (isAvailable) {
        console.log(`[StreamingStrategy] Using external URL via proxy`);
        
        await track.update({
          isVerified: true,
          lastChecked: new Date()
        });
        
        return {
          type: 'proxy',
          url: `/api/music/tracks/${track.id}/stream/proxy`,
          externalUrl: track.streamUrl
        };
      } else {
        console.log(`[StreamingStrategy] External URL not available, searching alternative...`);
      }
    }

    // 5. Попытка найти альтернативный источник
    console.log(`[StreamingStrategy] Attempting to refresh track source...`);
    
    const refreshed = await musicSourceManager.refreshTrackSource(track);
    
    if (refreshed && refreshed.streamUrl) {
      console.log(`[StreamingStrategy] Track source refreshed successfully`);
      
      return {
        type: 'proxy',
        url: `/api/music/tracks/${track.id}/stream/proxy`,
        externalUrl: refreshed.streamUrl,
        refreshed: true
      };
    }

    // 6. Трек недоступен
    console.error(`[StreamingStrategy] Track ${track.id} is unavailable`);
    
    await track.update({
      isVerified: false,
      lastChecked: new Date()
    });
    
    throw new Error('Track unavailable from all sources');
  }

  /**
   * Скачать и закешировать трек
   * @param {Object} track - Трек из БД
   * @returns {Promise<boolean>}
   */
  async downloadAndCache(track) {
    if (!track.streamUrl) {
      throw new Error('No streamUrl available for caching');
    }

    console.log(`[StreamingStrategy] Downloading track ${track.id} for caching...`);

    try {
      await musicSourceManager.downloadAndCache(track.id, track.streamUrl);
      console.log(`[StreamingStrategy] Track ${track.id} cached successfully`);
      return true;
    } catch (error) {
      console.error(`[StreamingStrategy] Cache error:`, error.message);
      throw error;
    }
  }

  /**
   * Проверить нужно ли кешировать трек
   * @param {Object} track - Трек из БД
   * @returns {boolean}
   */
  shouldCache(track) {
    // Кешируем если:
    // - Трек популярный (playCount >= threshold)
    // - Трек не локальный
    // - Есть streamUrl
    return (
      track.playCount >= this.cacheThreshold &&
      (!track.filePath || track.filePath.startsWith('http')) &&
      track.streamUrl
    );
  }

  /**
   * Получить статистику стриминга
   * @returns {Promise<Object>}
   */
  async getStats() {
    const { Track } = require('../../models');
    const { Op } = require('sequelize');

    const [
      totalTracks,
      localTracks,
      externalTracks,
      verifiedTracks,
      popularTracks,
      cacheCandidates
    ] = await Promise.all([
      Track.count(),
      Track.count({
        where: {
          filePath: { [Op.ne]: null },
          filePath: { [Op.notLike]: 'http%' }
        }
      }),
      Track.count({
        where: {
          streamUrl: { [Op.ne]: null }
        }
      }),
      Track.count({
        where: { isVerified: true }
      }),
      Track.count({
        where: { playCount: { [Op.gte]: this.cacheThreshold } }
      }),
      Track.count({
        where: {
          playCount: { [Op.gte]: this.cacheThreshold },
          [Op.or]: [
            { filePath: null },
            { filePath: { [Op.like]: 'http%' } }
          ],
          streamUrl: { [Op.ne]: null }
        }
      })
    ]);

    const storageStats = await localProvider.getStorageStats();

    return {
      total: totalTracks,
      local: localTracks,
      external: externalTracks,
      verified: verifiedTracks,
      popular: popularTracks,
      cacheCandidates: cacheCandidates,
      cacheThreshold: this.cacheThreshold,
      storage: storageStats,
      cacheRatio: totalTracks > 0 ? ((localTracks / totalTracks) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Автоматическое кеширование популярных треков (запускается периодически)
   * @param {number} limit - Максимальное количество треков для кеширования
   * @returns {Promise<Object>}
   */
  async autoCache(limit = 10) {
    console.log(`[StreamingStrategy] Starting auto-cache for ${limit} tracks...`);

    const { Op } = require('sequelize');

    // Получаем кандидатов на кеширование
    const candidates = await Track.findAll({
      where: {
        playCount: { [Op.gte]: this.cacheThreshold },
        [Op.or]: [
          { filePath: null },
          { filePath: { [Op.like]: 'http%' } }
        ],
        streamUrl: { [Op.ne]: null },
        isVerified: { [Op.ne]: false } // Исключаем заведомо битые
      },
      order: [['playCount', 'DESC']],
      limit
    });

    const stats = {
      total: candidates.length,
      cached: 0,
      failed: 0
    };

    for (const track of candidates) {
      try {
        await this.downloadAndCache(track);
        stats.cached++;
        
        // Задержка между загрузками
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[StreamingStrategy] Failed to cache track ${track.id}:`, error.message);
        stats.failed++;
      }
    }

    console.log(`[StreamingStrategy] Auto-cache complete:`, stats);
    return stats;
  }
}

module.exports = new StreamingStrategy();
