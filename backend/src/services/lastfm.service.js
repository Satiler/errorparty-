/**
 * iTunes/Apple Music Charts API Service
 * Получение топ-чартов БЕЗ регистрации и API ключей
 */

const axios = require('axios');

class ItunesChartsService {
  constructor() {
    // iTunes RSS - публичный API без ключей!
    this.baseUrl = 'https://itunes.apple.com';
  }

  /**
   * Получить топ-100 песен по стране
   * @param {string} country - код страны (us, ru, gb, etc)
   * @param {number} limit - количество треков
   */
  async getTopSongs(country = 'us', limit = 100) {
    try {
      console.log(`🌍 Получаем топ-${limit} из ${country.toUpperCase()} (iTunes)...`);
      
      const url = `${this.baseUrl}/${country}/rss/topsongs/limit=${limit}/json`;
      const response = await axios.get(url);

      const entries = response.data.feed.entry || [];
      
      const tracks = entries.map((entry, index) => ({
        position: index + 1,
        title: entry['im:name'].label,
        artist: entry['im:artist'].label,
        album: entry['im:collection']?.['im:name']?.label || 'Unknown',
        releaseDate: entry['im:releaseDate']?.label || null,
        genre: entry.category?.attributes?.label || 'Unknown',
        price: entry['im:price']?.label || 'N/A',
        link: entry.link?.attributes?.href || '',
        image: entry['im:image']?.[2]?.label || '', // большое изображение
        preview: entry.link?.attributes?.href || ''
      }));

      console.log(`✅ Получено ${tracks.length} треков из iTunes Charts`);
      return tracks;
      
    } catch (error) {
      console.error(`❌ Ошибка iTunes API (${country}):`, error.message);
      throw error;
    }
  }

  /**
   * Получить топ-100 песен из нескольких стран
   */
  async getGlobalTop100() {
    try {
      console.log('🌍 Получаем мировые чарты из iTunes...\n');
      
      // Получаем топ из разных стран
      const [usTop, gbTop, deTop] = await Promise.all([
        this.getTopSongs('us', 50),  // США - 50 треков
        this.getTopSongs('gb', 30),  // Великобритания - 30
        this.getTopSongs('de', 20)   // Германия - 20
      ]);

      // Объединяем и убираем дубликаты
      const allTracks = [...usTop, ...gbTop, ...deTop];
      const uniqueTracks = this.removeDuplicates(allTracks);

      console.log(`✅ Получено ${uniqueTracks.length} уникальных треков`);
      return uniqueTracks.slice(0, 100);
      
    } catch (error) {
      console.error('❌ Ошибка получения мировых чартов:', error);
      throw error;
    }
  }

  /**
   * Получить топ русской музыки
   */
  async getRussianTop50() {
    return this.getTopSongs('ru', 50);
  }

  /**
   * Убрать дубликаты треков
   */
  removeDuplicates(tracks) {
    const seen = new Map();
    
    return tracks.filter(track => {
      const key = `${track.artist.toLowerCase()}-${track.title.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.set(key, true);
      return true;
    });
  }

  /**
   * Получить новинки
   */
  async getNewReleases(country = 'us', limit = 50) {
    try {
      console.log(`🆕 Получаем новинки из ${country.toUpperCase()}...`);
      
      const url = `${this.baseUrl}/${country}/rss/newreleases/limit=${limit}/json`;
      const response = await axios.get(url);

      const entries = response.data.feed.entry || [];
      
      const tracks = entries.map((entry, index) => ({
        position: index + 1,
        title: entry['im:name'].label,
        artist: entry['im:artist'].label,
        releaseDate: entry['im:releaseDate']?.label || null,
        genre: entry.category?.attributes?.label || 'Unknown',
        image: entry['im:image']?.[2]?.label || ''
      }));

      console.log(`✅ Получено ${tracks.length} новинок`);
      return tracks;
      
    } catch (error) {
      console.error('❌ Ошибка получения новинок:', error.message);
      throw error;
    }
  }

  /**
   * Получить топ-альбомы
   */
  async getTopAlbums(country = 'us', limit = 100) {
    try {
      console.log(`💿 Получаем топ-${limit} альбомов из ${country.toUpperCase()}...`);
      
      const url = `${this.baseUrl}/${country}/rss/topalbums/limit=${limit}/json`;
      const response = await axios.get(url);

      const entries = response.data.feed.entry || [];
      
      const albums = entries.map((entry, index) => ({
        position: index + 1,
        title: entry['im:name'].label,
        artist: entry['im:artist'].label,
        releaseDate: entry['im:releaseDate']?.label || null,
        genre: entry.category?.attributes?.label || 'Unknown',
        price: entry['im:price']?.label || 'N/A',
        trackCount: entry['im:itemCount']?.label || 0,
        link: entry.link?.attributes?.href || '',
        coverUrl: entry['im:image']?.[2]?.label || '', // большое изображение
        year: entry['im:releaseDate']?.label ? new Date(entry['im:releaseDate'].label).getFullYear() : new Date().getFullYear()
      }));

      console.log(`✅ Получено ${albums.length} альбомов из iTunes`);
      return albums;
      
    } catch (error) {
      console.error(`❌ Ошибка получения альбомов (${country}):`, error.message);
      return [];
    }
  }

  /**
   * Получить топ-альбомы из нескольких стран
   */
  async getGlobalTopAlbums(limit = 50) {
    try {
      console.log('\n💿 Получаем мировые топ-альбомы из iTunes...');
      
      const [usAlbums, gbAlbums, deAlbums] = await Promise.all([
        this.getTopAlbums('us', 30),
        this.getTopAlbums('gb', 20),
        this.getTopAlbums('de', 10)
      ]);

      const allAlbums = [...usAlbums, ...gbAlbums, ...deAlbums];
      
      // Убираем дубликаты
      const uniqueAlbums = this.removeDuplicateAlbums(allAlbums);
      
      console.log(`✅ Получено ${uniqueAlbums.length} уникальных альбомов\n`);
      return uniqueAlbums.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Ошибка получения мировых альбомов:', error.message);
      return [];
    }
  }

  /**
   * Убрать дубликаты альбомов
   */
  removeDuplicateAlbums(albums) {
    const seen = new Map();
    
    return albums.filter(album => {
      const key = `${album.artist.toLowerCase()}-${album.title.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.set(key, true);
      return true;
    });
  }
}

module.exports = new ItunesChartsService();
