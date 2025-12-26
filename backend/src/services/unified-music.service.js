/**
 * Unified Music Service
 * Единый интерфейс для работы с множественными источниками музыки
 * Поддержка: KissVK, Hitmo, Musify, PromoDJ и других
 */

const { getInstance: getKissVK } = require('./kissvk.service');
const { getInstance: getMultiDecoder } = require('../utils/multi-decoder');
const { getInstance: getDownloadManager } = require('./download-manager.service');
const HitmoService = require('./hitmo.service');
const MusifyService = require('./musify.service');
const PromodjService = require('./promodj.service');

class UnifiedMusicService {
  constructor() {
    // Инициализация сервисов
    this.services = {
      kissvk: getKissVK(),
      hitmo: new HitmoService(),
      musify: new MusifyService(),
      promodj: new PromodjService()
    };

    this.decoder = getMultiDecoder();
    this.downloadManager = getDownloadManager();

    // Приоритеты источников (можно настроить)
    this.sourcePriority = ['kissvk', 'musify', 'hitmo', 'promodj'];

    // Статистика
    this.stats = {
      searches: 0,
      downloads: 0,
      successful: 0,
      failed: 0,
      bySource: {}
    };
  }

  /**
   * Универсальный поиск по всем источникам
   */
  async searchAllSources(query, options = {}) {
    const {
      limit = 20,
      sources = this.sourcePriority,
      includeStreamUrl = true,
      downloadTracks = false
    } = options;

    this.stats.searches++;

    console.log(`[UnifiedMusic] 🔍 Searching across ${sources.length} sources: "${query}"`);

    const results = {
      query,
      sources: [],
      totalTracks: 0,
      timestamp: new Date()
    };

    // Параллельный поиск по всем источникам
    const searchPromises = sources.map(async (sourceName) => {
      try {
        const service = this.services[sourceName];
        if (!service) {
          return { source: sourceName, tracks: [], error: 'Service not found' };
        }

        let tracks = [];

        // Поиск в зависимости от источника
        if (sourceName === 'kissvk') {
          const result = await service.searchTracks(query, limit);
          tracks = result.success ? result.tracks : [];
        } else {
          tracks = await service.searchTracks(query, limit);
        }

        // Декодирование URL для треков
        if (includeStreamUrl && tracks.length > 0) {
          tracks = await this.decodeTrackUrls(tracks, sourceName);
        }

        // Опционально: загрузка треков
        if (downloadTracks && tracks.length > 0) {
          tracks = await this.downloadTracks(tracks);
        }

        this.updateStats(sourceName, tracks.length, true);

        return {
          source: sourceName,
          tracks,
          count: tracks.length,
          success: true
        };

      } catch (error) {
        console.error(`[UnifiedMusic] Error searching ${sourceName}:`, error.message);
        this.updateStats(sourceName, 0, false);
        
        return {
          source: sourceName,
          tracks: [],
          count: 0,
          error: error.message,
          success: false
        };
      }
    });

    const sourceResults = await Promise.all(searchPromises);
    
    // Агрегация результатов
    results.sources = sourceResults;
    results.totalTracks = sourceResults.reduce((sum, sr) => sum + sr.count, 0);

    // Объединение и дедупликация треков
    results.allTracks = this.mergeAndDeduplicate(sourceResults);

    console.log(`[UnifiedMusic] ✓ Found ${results.totalTracks} tracks total`);

    return results;
  }

  /**
   * Поиск с автоматическим переключением источников
   */
  async smartSearch(query, options = {}) {
    const {
      minResults = 10,
      maxSources = 3,
      timeout = 30000
    } = options;

    const allTracks = [];
    const sourcesUsed = [];

    // Пробуем источники по приоритету
    for (const sourceName of this.sourcePriority.slice(0, maxSources)) {
      if (allTracks.length >= minResults) break;

      try {
        console.log(`[UnifiedMusic] Trying ${sourceName}...`);
        
        const service = this.services[sourceName];
        let tracks = [];

        if (sourceName === 'kissvk') {
          const result = await service.searchTracks(query, 50);
          tracks = result.success ? result.tracks : [];
        } else {
          tracks = await service.searchTracks(query, 50);
        }

        if (tracks.length > 0) {
          tracks = await this.decodeTrackUrls(tracks, sourceName);
          const validTracks = tracks.filter(t => t.streamUrl && t.isDecrypted !== false);
          
          allTracks.push(...validTracks);
          sourcesUsed.push({
            source: sourceName,
            count: validTracks.length
          });

          console.log(`[UnifiedMusic] ✓ ${sourceName}: ${validTracks.length} valid tracks`);
        }

      } catch (error) {
        console.error(`[UnifiedMusic] ${sourceName} failed:`, error.message);
      }
    }

    return {
      query,
      tracks: allTracks.slice(0, 50), // Ограничиваем общее кол-во
      totalFound: allTracks.length,
      sourcesUsed,
      success: allTracks.length > 0
    };
  }

  /**
   * Декодирование URL треков
   */
  async decodeTrackUrls(tracks, source) {
    const decoded = await Promise.all(
      tracks.map(async (track) => {
        try {
          if (track.streamUrl && !track.encryptedUrl) {
            // URL уже декодирован
            return { ...track, isDecrypted: true };
          }

          const urlToDecode = track.encryptedUrl || track.streamUrl;
          const result = await this.decoder.decode(urlToDecode, source);

          if (result.success) {
            return {
              ...track,
              streamUrl: result.url,
              encryptedUrl: urlToDecode,
              isDecrypted: true,
              decodingMethod: result.method
            };
          } else {
            return {
              ...track,
              isDecrypted: false,
              decodingError: result.error
            };
          }
        } catch (error) {
          return {
            ...track,
            isDecrypted: false,
            decodingError: error.message
          };
        }
      })
    );

    const successCount = decoded.filter(t => t.isDecrypted).length;
    console.log(`[UnifiedMusic] Decoded ${successCount}/${tracks.length} URLs`);

    return decoded;
  }

  /**
   * Загрузка треков
   */
  async downloadTracks(tracks, concurrency = 3) {
    const tracksToDownload = tracks.filter(t => 
      t.streamUrl && t.isDecrypted !== false
    );

    if (tracksToDownload.length === 0) {
      return tracks;
    }

    console.log(`[UnifiedMusic] Downloading ${tracksToDownload.length} tracks...`);

    const downloadResults = await this.downloadManager.downloadMany(
      tracksToDownload,
      concurrency
    );

    // Обновляем треки результатами загрузки
    return tracks.map(track => {
      const downloadResult = downloadResults.find(dr => dr.trackId === track.trackId);
      if (downloadResult) {
        return {
          ...track,
          downloaded: downloadResult.success,
          filePath: downloadResult.filePath,
          fileSize: downloadResult.fileSize,
          downloadError: downloadResult.error
        };
      }
      return track;
    });
  }

  /**
   * Получить топ треки со всех источников
   */
  async getTopTracks(options = {}) {
    const {
      limit = 50,
      sources = this.sourcePriority
    } = options;

    console.log(`[UnifiedMusic] 📊 Getting top tracks from ${sources.length} sources...`);

    const results = await Promise.all(
      sources.map(async (sourceName) => {
        try {
          const service = this.services[sourceName];
          
          if (sourceName === 'kissvk') {
            const result = await service.getChartTracks(limit);
            return {
              source: sourceName,
              tracks: result.success ? result.tracks : [],
              success: true
            };
          } else if (service.getPopularTracks) {
            const tracks = await service.getPopularTracks(limit);
            return {
              source: sourceName,
              tracks,
              success: true
            };
          } else if (service.getTopTracks) {
            const tracks = await service.getTopTracks(limit);
            return {
              source: sourceName,
              tracks,
              success: true
            };
          }

          return { source: sourceName, tracks: [], success: false };

        } catch (error) {
          console.error(`[UnifiedMusic] Error getting top from ${sourceName}:`, error.message);
          return {
            source: sourceName,
            tracks: [],
            success: false,
            error: error.message
          };
        }
      })
    );

    const allTopTracks = this.mergeAndDeduplicate(results);

    return {
      sources: results,
      tracks: allTopTracks.slice(0, limit),
      totalTracks: allTopTracks.length
    };
  }

  /**
   * Объединение и дедупликация треков
   */
  mergeAndDeduplicate(sourceResults) {
    const allTracks = [];
    const seen = new Set();

    // Обрабатываем источники по приоритету
    for (const sourceName of this.sourcePriority) {
      const sourceResult = sourceResults.find(sr => sr.source === sourceName);
      if (!sourceResult || !sourceResult.tracks) continue;

      for (const track of sourceResult.tracks) {
        // Создаем уникальный ключ на основе названия и артиста
        const key = this.getTrackKey(track);
        
        if (!seen.has(key)) {
          seen.add(key);
          allTracks.push({
            ...track,
            primarySource: sourceName
          });
        }
      }
    }

    return allTracks;
  }

  /**
   * Генерация уникального ключа трека
   */
  getTrackKey(track) {
    const title = (track.title || '').toLowerCase().trim();
    const artist = (track.artist || '').toLowerCase().trim();
    return `${artist}:::${title}`.replace(/\s+/g, ' ');
  }

  /**
   * Обновление статистики
   */
  updateStats(source, count, success) {
    if (!this.stats.bySource[source]) {
      this.stats.bySource[source] = {
        requests: 0,
        successful: 0,
        failed: 0,
        totalTracks: 0
      };
    }

    this.stats.bySource[source].requests++;
    this.stats.bySource[source].totalTracks += count;
    
    if (success) {
      this.stats.bySource[source].successful++;
      this.stats.successful++;
    } else {
      this.stats.bySource[source].failed++;
      this.stats.failed++;
    }
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      ...this.stats,
      downloadManagerStats: this.downloadManager.getStats(),
      sources: Object.keys(this.services),
      sourcePriority: this.sourcePriority
    };
  }

  /**
   * Сброс статистики
   */
  resetStats() {
    this.stats = {
      searches: 0,
      downloads: 0,
      successful: 0,
      failed: 0,
      bySource: {}
    };
    this.downloadManager.clearCache();
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new UnifiedMusicService();
    }
    return instance;
  },
  UnifiedMusicService
};
