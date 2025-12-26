/**
 * Musify.club Integration Service
 * Один из лучших источников MP3 в RU-сегменте
 * Официально лицензирован, большая база треков
 */
const axios = require('axios');
const cheerio = require('cheerio');

class MusifyService {
  constructor() {
    this.baseURL = 'https://musify.club';
  }

  /**
   * Поиск треков на Musify
   */
  async searchTracks(query, limit = 20) {
    try {
      console.log(`🔍 Searching Musify: "${query}"`);

      const searchURL = `${this.baseURL}/search?searchText=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      // Парсим результаты поиска треков
      $('a[href*="/track/"]').each((i, elem) => {
        if (tracks.length >= limit) return false; // Останавливаем после достижения лимита
        
        try {
          const $link = $(elem);
          const href = $link.attr('href');
          
          if (!href) return;

          // Формат: /track/artist-song-title-1234567
          const match = href.match(/\/track\/([a-z0-9\-]+)-(\d+)$/i);
          if (!match) return;

          const [, slug, trackId] = match;
          
          // Берем родительский контейнер
          let $parent = $link.closest('div');
          if (!$parent.length) {
            $parent = $link.parent();
          }
          
          // Название трека
          const title = $link.text().trim();
          
          // Ищем артиста
          const $artistLink = $parent.find('a[href*="/artist/"]').first();
          let artist = 'Unknown Artist';
          
          if ($artistLink.length) {
            artist = $artistLink.text().trim();
          } else {
            // Пытаемся извлечь из slug
            const slugParts = slug.split('-');
            if (slugParts.length > 1) {
              artist = slugParts[0].replace(/-/g, ' ');
            }
          }

          // Ищем обложку
          const $img = $parent.find('img').first();
          const coverUrl = $img.length ? $img.attr('src') : null;

          if (title && title.length > 2) {
            tracks.push({
              id: trackId,
              slug: slug,
              title: title,
              artist: artist,
              streamUrl: `${this.baseURL}/api/track/${trackId}/stream`,
              downloadUrl: `${this.baseURL}/api/track/${trackId}/download`,
              pageUrl: `${this.baseURL}${href}`,
              coverUrl: coverUrl,
              source: 'musify.club'
            });
          }
        } catch (error) {
          // Пропускаем проблемные элементы
        }
      });

      // Убираем дубликаты по ID
      const uniqueTracks = [];
      const seenIds = new Set();
      
      tracks.forEach(track => {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          uniqueTracks.push(track);
        }
      });

      console.log(`  ✅ Found ${uniqueTracks.length} tracks on Musify`);
      return uniqueTracks;

    } catch (error) {
      console.error('Musify search error:', error.message);
      return [];
    }
  }

  /**
   * Получить топ хиты
   */
  async getTopHits(limit = 50) {
    try {
      console.log(`🎵 Fetching Musify Top ${limit}...`);

      const response = await axios.get(`${this.baseURL}/hits`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('a[href*="/track/"]').slice(0, limit).each((i, elem) => {
        const $link = $(elem);
        const href = $link.attr('href');
        const match = href.match(/\/track\/(.+?)(\d+)$/);
        
        if (match) {
          const [, slug, trackId] = match;
          const $parent = $link.closest('div');
          const title = $link.text().trim();
          const artist = $parent.find('a[href*="/artist/"]').first().text().trim();

          if (title && title.length > 2) {
            tracks.push({
              position: i + 1,
              id: trackId,
              title,
              artist: artist || 'Unknown Artist',
              streamUrl: `${this.baseURL}/api/track/${trackId}/stream`,
              downloadUrl: `${this.baseURL}/api/track/${trackId}/download`,
              source: 'musify.club'
            });
          }
        }
      });

      console.log(`✅ Found ${tracks.length} top tracks on Musify`);
      return tracks;

    } catch (error) {
      console.error('Musify top tracks error:', error.message);
      return [];
    }
  }

  /**
   * Получить новинки
   */
  async getNewReleases(limit = 30) {
    try {
      const response = await axios.get(`${this.baseURL}/release`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const releases = [];

      $('a[href*="/release/"]').slice(0, limit).each((i, elem) => {
        const $link = $(elem);
        const href = $link.attr('href');
        const title = $link.text().trim();
        const $parent = $link.closest('div');
        const artist = $parent.find('a[href*="/artist/"]').first().text().trim();

        if (title && title.length > 2) {
          releases.push({
            title,
            artist: artist || 'Unknown Artist',
            url: `${this.baseURL}${href}`,
            source: 'musify.club'
          });
        }
      });

      console.log(`✅ Found ${releases.length} new releases on Musify`);
      return releases;

    } catch (error) {
      console.error('Musify new releases error:', error.message);
      return [];
    }
  }
}

module.exports = new MusifyService();
