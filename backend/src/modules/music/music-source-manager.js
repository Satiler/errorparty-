/**
 * Music Source Manager
 * Управление источниками музыки с fallback логикой
 */

const lmusicProvider = require('./providers/lmusic-provider');
const localProvider = require('./providers/local-provider');
const { Track } = require('../../models');
const { Op } = require('sequelize');

class MusicSourceManager {
  constructor() {
    // Приоритет провайдеров: локальные -> lmusic
    this.providers = [
      localProvider,
      lmusicProvider
    ];
  }

  /**
   * Найти лучший источник для трека
   * @param {string} artist - Исполнитель
   * @param {string} title - Название трека
   * @returns {Promise<Object|null>} { provider, track }
   */
  async findBestSource(artist, title) {
    const query = `${artist} ${title}`.trim();

    console.log(`[MusicSourceManager] Searching for: ${query}`);

    // Пробуем каждый провайдер по порядку
    for (const provider of this.providers) {
      if (provider.name === 'local') {
        // Локальный провайдер не используется для поиска
        continue;
      }

      try {
        console.log(`[MusicSourceManager] Trying provider: ${provider.name}`);
        
        const results = await provider.search(query, { limit: 3 });
        
        if (results && results.length > 0) {
          // Проверяем первый результат на доступность
          for (const track of results) {
            const isAvailable = await provider.isAvailable(track);
            
            if (isAvailable) {
              console.log(`[MusicSourceManager] Found working track via ${provider.name}`);
              return {
                provider: provider.name,
                track: track
              };
            }
          }
        }
      } catch (error) {
        console.error(`[MusicSourceManager] Error with provider ${provider.name}:`, error.message);
        continue;
      }
    }

    console.log(`[MusicSourceManager] No source found for: ${query}`);
    return null;
  }

  /**
   * Поиск по всем источникам
   * @param {string} query - Поисковый запрос
   * @param {number} limit - Лимит результатов
   * @returns {Promise<Array>} Массив треков
   */
  async searchAll(query, limit = 10) {
    const allResults = [];

    for (const provider of this.providers) {
      if (provider.name === 'local') continue;

      try {
        const results = await provider.search(query, { limit });
        
        if (results && results.length > 0) {
          // Добавляем метку провайдера
          results.forEach(track => {
            track.sourceProvider = provider.name;
          });
          
          allResults.push(...results);
        }
      } catch (error) {
        console.error(`[MusicSourceManager] Search error in ${provider.name}:`, error.message);
      }
    }

    // Дедупликация по названию + исполнителю
    const unique = [];
    const seen = new Set();

    for (const track of allResults) {
      const key = `${track.title.toLowerCase()}_${track.artist.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(track);
      }
    }

    return unique.slice(0, limit);
  }

  /**
   * Скачать и закешировать трек локально
   * @param {number} trackId - ID трека в БД
   * @param {string} sourceUrl - URL источника
   * @returns {Promise<Object>} Обновленный трек
   */
  async downloadAndCache(trackId, sourceUrl) {
    try {
      console.log(`[MusicSourceManager] Downloading track ${trackId} from ${sourceUrl}`);

      // Скачиваем через LocalProvider
      const result = await localProvider.downloadAndSave(trackId, sourceUrl);

      // Обновляем запись в БД
      const track = await Track.findByPk(trackId);
      if (track) {
        await track.update({
          filePath: result.filePath,
          fileSize: result.fileSize,
          provider: 'local',
          streamUrl: null, // Теперь локальный файл
          isVerified: true,
          lastChecked: new Date()
        });

        console.log(`[MusicSourceManager] Track ${trackId} cached successfully`);
        return track;
      }

      return null;
    } catch (error) {
      console.error(`[MusicSourceManager] Download error for track ${trackId}:`, error.message);
      throw error;
    }
  }

  /**
   * Проверить доступность трека
   * @param {Object} track - Объект трека из БД
   * @returns {Promise<boolean>}
   */
  async verifyTrack(track) {
    // Локальные треки
    if (track.filePath && !track.filePath.startsWith('http')) {
      return await localProvider.isAvailable(track);
    }

    // Внешние треки
    if (track.streamUrl) {
      const provider = this.getProviderByName(track.provider || 'lmusic');
      if (provider) {
        return await provider.isAvailable(track);
      }
    }

    return false;
  }

  /**
   * Получить провайдер по имени
   * @param {string} name - Имя провайдера
   * @returns {Object|null}
   */
  getProviderByName(name) {
    return this.providers.find(p => p.name === name) || null;
  }

  /**
   * Обновить источник трека если текущий недоступен
   * @param {Object} track - Трек из БД
   * @returns {Promise<Object|null>} Обновленный трек
   */
  async refreshTrackSource(track) {
    console.log(`[MusicSourceManager] Refreshing source for track ${track.id}: ${track.artist} - ${track.title}`);

    // Ищем новый источник
    const newSource = await this.findBestSource(track.artist, track.title);

    if (newSource) {
      await track.update({
        streamUrl: newSource.track.streamUrl,
        provider: newSource.provider,
        providerTrackId: newSource.track.providerTrackId,
        isVerified: true,
        lastChecked: new Date()
      });

      console.log(`[MusicSourceManager] Track ${track.id} source refreshed via ${newSource.provider}`);
      return track;
    }

    // Не нашли - помечаем как недоступный
    await track.update({
      isVerified: false,
      lastChecked: new Date()
    });

    console.log(`[MusicSourceManager] No alternative source found for track ${track.id}`);
    return null;
  }

  /**
   * Массовая верификация треков
   * @param {number} limit - Лимит треков для проверки
   * @returns {Promise<Object>} Статистика
   */
  async batchVerifyTracks(limit = 100) {
    const tracks = await Track.findAll({
      where: {
        [Op.or]: [
          { isVerified: null },
          {
            isVerified: true,
            lastChecked: {
              [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Старше 24 часов
            }
          }
        ]
      },
      limit,
      order: [['playCount', 'DESC']] // Сначала популярные
    });

    const stats = {
      total: tracks.length,
      verified: 0,
      failed: 0,
      refreshed: 0
    };

    for (const track of tracks) {
      const isAvailable = await this.verifyTrack(track);

      if (isAvailable) {
        await track.update({
          isVerified: true,
          lastChecked: new Date()
        });
        stats.verified++;
      } else {
        // Пытаемся найти новый источник
        const refreshed = await this.refreshTrackSource(track);
        if (refreshed) {
          stats.refreshed++;
          stats.verified++;
        } else {
          stats.failed++;
        }
      }

      // Задержка чтобы не забанили
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[MusicSourceManager] Batch verification complete:`, stats);
    return stats;
  }

  /**
   * Получить статистику по провайдерам
   * @returns {Promise<Object>}
   */
  async getProvidersStats() {
    const stats = {};

    // Статистика из БД
    const dbStats = await Track.findAll({
      attributes: [
        'provider',
        [Track.sequelize.fn('COUNT', '*'), 'count'],
        [Track.sequelize.fn('SUM', Track.sequelize.literal('CASE WHEN "isVerified" = true THEN 1 ELSE 0 END')), 'verified']
      ],
      group: ['provider']
    });

    dbStats.forEach(stat => {
      const provider = stat.provider || 'unknown';
      stats[provider] = {
        total: parseInt(stat.dataValues.count),
        verified: parseInt(stat.dataValues.verified || 0)
      };
    });

    // Статистика локального хранилища
    const localStats = await localProvider.getStorageStats();
    stats.local = {
      ...stats.local,
      storage: localStats
    };

    return stats;
  }
}

module.exports = new MusicSourceManager();
