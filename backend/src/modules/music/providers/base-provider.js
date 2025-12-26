/**
 * Base Music Provider
 * Абстрактный класс для всех музыкальных провайдеров
 */

class MusicProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Поиск треков
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Опции поиска
   * @param {number} options.limit - Лимит результатов
   * @returns {Promise<Array>} Массив треков
   */
  async search(query, options = {}) {
    throw new Error('Method search() must be implemented');
  }

  /**
   * Получить информацию о треке по ID
   * @param {string} id - ID трека у провайдера
   * @returns {Promise<Object>} Информация о треке
   */
  async getTrack(id) {
    throw new Error('Method getTrack() must be implemented');
  }

  /**
   * Получить прямую ссылку на MP3
   * @param {Object} track - Объект трека
   * @returns {Promise<string>} Прямая ссылка на аудио
   */
  async getDirectUrl(track) {
    throw new Error('Method getDirectUrl() must be implemented');
  }

  /**
   * Проверить доступность трека
   * @param {Object} track - Объект трека
   * @returns {Promise<boolean>} true если трек доступен
   */
  async isAvailable(track) {
    if (!track || !track.streamUrl) {
      return false;
    }

    try {
      const axios = require('axios');
      const response = await axios.head(track.streamUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 400
      });
      return response.status >= 200 && response.status < 400;
    } catch (error) {
      return false;
    }
  }

  /**
   * Нормализовать данные трека к единому формату
   * @param {Object} rawTrack - Сырые данные трека от провайдера
   * @returns {Object} Нормализованный объект трека
   */
  normalizeTrack(rawTrack) {
    return {
      title: rawTrack.title || 'Unknown Title',
      artist: rawTrack.artist || 'Unknown Artist',
      album: rawTrack.album || null,
      genre: rawTrack.genre || 'Unknown',
      duration: rawTrack.duration || 0,
      streamUrl: rawTrack.streamUrl || null,
      coverUrl: rawTrack.coverUrl || rawTrack.cover || null,
      year: rawTrack.year || null,
      provider: this.name,
      providerTrackId: rawTrack.id || rawTrack.trackId || null
    };
  }

  /**
   * Получить имя провайдера
   * @returns {string}
   */
  getName() {
    return this.name;
  }
}

module.exports = MusicProvider;
