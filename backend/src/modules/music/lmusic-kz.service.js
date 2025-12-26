/**
 * Lmusic.kz Integration Service
 * Парсинг и получение треков с lmusic.kz
 * 
 * Сайт предоставляет:
 * - Русскую и казахскую музыку
 * - Прямые ссылки на MP3
 * - Информацию об исполнителях и альбомах
 * - Различные жанры (поп, рок, рэп, шансон и т.д.)
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Track, Album } = require('../../models');

class LmusicKzService {
  constructor() {
    this.baseURL = 'https://lmusic.kz';
    this.apiURL = 'https://lmusic.kz/api';
  }

  /**
   * Парсинг списка треков со страницы жанра (улучшенный)
   */
  async parseGenrePage(genre = 'pop-music', language = 'rus', page = 1) {
    try {
      const url = page === 1 
        ? `${this.baseURL}/genres/${genre}/${language}`
        : `${this.baseURL}/genres/${genre}/${language}/${page}`;
      
      console.log(`🔍 Parsing Lmusic.kz: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
          'Referer': this.baseURL
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];
      const processedIds = new Set();

      // Ищем все ссылки на треки
      $('a[href*="/mp3/"]').each((i, elem) => {
        try {
          const $link = $(elem);
          const trackLink = $link.attr('href');
          if (!trackLink) return;

          const match = trackLink.match(/\/mp3\/([^/]+)\/(\d+)/);
          if (!match) return;

          const [, slug, trackId] = match;
          if (processedIds.has(trackId)) return; // Пропускаем дубликаты
          processedIds.add(trackId);

          const title = $link.text().trim();
          if (!title || title.length < 2) return;

          // Ищем артиста рядом со ссылкой
          let artist = 'Unknown Artist';
          const $parent = $link.parent();
          const $container = $parent.parent();
          
          // Пробуем найти артиста в разных местах
          const artistLink = $container.find('a[href*="/artist/"]').first();
          if (artistLink.length) {
            artist = artistLink.text().trim();
          } else {
            // Ищем текст рядом с названием
            const parentText = $parent.text();
            const titleIndex = parentText.indexOf(title);
            if (titleIndex > 0) {
              const beforeTitle = parentText.substring(0, titleIndex).trim();
              if (beforeTitle.length > 0 && beforeTitle.length < 50) {
                artist = beforeTitle;
              }
            }
          }
          
          // Длительность
          let duration = 0;
          const durationText = $container.text().match(/(\d{1,2}):(\d{2})/);
          if (durationText) {
            duration = parseInt(durationText[1]) * 60 + parseInt(durationText[2]);
          }

          // Обложка
          let coverUrl = null;
          const coverImg = $container.find('img').first().attr('src');
          if (coverImg && !coverImg.includes('data:image')) {
            coverUrl = coverImg.startsWith('http') ? coverImg : `${this.baseURL}${coverImg}`;
          }

          // Ссылка на скачивание
          const downloadLink = `${this.apiURL}/download/${trackId}`;

          tracks.push({
            id: trackId,
            title,
            artist,
            duration,
            coverUrl,
            downloadUrl: downloadLink,
            streamUrl: downloadLink,
            pageUrl: `${this.baseURL}${trackLink}`,
            source: 'lmusic.kz',
            genre,
            language
          });

        } catch (error) {
          // Пропускаем проблемные элементы
        }
      });

      console.log(`  ✅ Parsed ${tracks.length} tracks from page ${page}`);
      
      // Если не удалось спарсить треки, используем поиск как фолбэк
      if (tracks.length === 0) {
        console.log('  ⚠️  Парсинг не дал результатов, используем поиск...');
        const searchQuery = this.getSearchQueryForGenre(genre, language);
        const searchResults = await this.searchTracks(searchQuery, 20);
        return searchResults.map(track => ({
          ...track,
          genre,
          language
        }));
      }
      
      return tracks;

    } catch (error) {
      console.error('Lmusic.kz parsing error:', error.message);
      // Фолбэк через поиск
      try {
        const searchQuery = this.getSearchQueryForGenre(genre, language);
        return await this.searchTracks(searchQuery, 20);
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError.message);
        return [];
      }
    }
  }
  
  /**
   * Получить поисковый запрос для жанра
   */
  getSearchQueryForGenre(genre, language = 'rus') {
    const queries = {
      'pop-music': language === 'rus' ? 'популярная музыка' : 'танцы',
      'rock': 'рок музыка',
      'rap': language === 'rus' ? 'русский рэп' : 'казахский рэп',
      'chanson': 'шансон',
      'electronic': 'электронная музыка',
      'dance': 'танцевальная',
      'folk': language === 'rus' ? 'народная' : 'казахская народная',
      'jazz': 'джаз'
    };
    return queries[genre] || 'музыка';
  }
  
  /**
   * Получить поисковый запрос для жанра
   */
  getSearchQueryForGenre(genre, language = 'rus') {
    const queries = {
      'pop-music': language === 'rus' ? 'популярная музыка' : 'танцы',
      'rock': 'рок музыка',
      'rap': language === 'rus' ? 'русский рэп' : 'казахский рэп',
      'chanson': 'шансон',
      'electronic': 'электронная музыка',
      'dance': 'танцевальная',
      'folk': language === 'rus' ? 'народная' : 'казахская народная',
      'jazz': 'джаз'
    };
    return queries[genre] || 'музыка';
  }

  /**
   * Получить детальную информацию о треке
   */
  async getTrackDetails(slug, trackId) {
    try {
      console.log(`📀 Getting track details: ${slug}/${trackId}`);

      const url = `${this.baseURL}/mp3/${slug}/${trackId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Название трека
      const title = $('h1').first().text().trim();
      
      // Исполнители
      const artists = [];
      $('a[href*="/artist/"]').each((i, elem) => {
        artists.push($(elem).text().trim());
      });
      const artist = artists.join(', ') || 'Unknown Artist';

      // Обложка
      const coverImg = $('img[src*="/images/cover/"]').first().attr('src');
      const coverUrl = coverImg 
        ? (coverImg.startsWith('http') ? coverImg : `${this.baseURL}${coverImg}`)
        : null;

      // Жанр
      const genreLink = $('a[href*="/genres/"]').first();
      const genre = genreLink.text().trim() || null;

      // Длительность
      const durationText = $('body').text().match(/(\d{1,2}):(\d{2})/);
      const duration = durationText 
        ? parseInt(durationText[1]) * 60 + parseInt(durationText[2])
        : 0;

      return {
        id: trackId,
        slug,
        title,
        artist,
        duration,
        coverUrl,
        genre,
        downloadUrl: `${this.apiURL}/download/${trackId}`,
        streamUrl: `${this.apiURL}/download/${trackId}`,
        pageUrl: url,
        source: 'lmusic.kz'
      };

    } catch (error) {
      console.error('Error getting track details:', error.message);
      return null;
    }
  }

  /**
   * Поиск треков через парсинг поисковой страницы
   */
  async searchTracks(query, limit = 20) {
    try {
      console.log(`🔍 Searching Lmusic.kz: "${query}"`);

      // Формируем поисковый URL
      const searchURL = `${this.baseURL}/search?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      // Парсим результаты поиска
      $('a[href*="/mp3/"]').slice(0, limit).each((i, elem) => {
        try {
          const $link = $(elem);
          const href = $link.attr('href');
          
          const match = href.match(/\/mp3\/([^/]+)\/(\d+)/);
          if (!match) return;

          const [, slug, trackId] = match;
          const title = $link.text().trim();
          
          // Ищем информацию об исполнителе рядом
          const $parent = $link.closest('div, tr, li');
          const artistLink = $parent.find('a[href*="/artist/"]').first();
          const artist = artistLink.text().trim() || 'Unknown Artist';

          tracks.push({
            id: trackId,
            slug,
            title,
            artist,
            downloadUrl: `${this.apiURL}/download/${trackId}`,
            streamUrl: `${this.apiURL}/download/${trackId}`,
            pageUrl: `${this.baseURL}${href}`,
            source: 'lmusic.kz'
          });

        } catch (error) {
          // Пропускаем проблемные элементы
        }
      });

      console.log(`  ✅ Found ${tracks.length} tracks`);
      return tracks;

    } catch (error) {
      console.error('Lmusic.kz search error:', error.message);
      return [];
    }
  }

  /**
   * Получить прямую ссылку на MP3 файл
   */
  async getDirectDownloadUrl(trackId) {
    try {
      const downloadUrl = `${this.apiURL}/download/${trackId}`;
      
      // Делаем HEAD запрос, чтобы получить финальный URL после редиректа
      const response = await axios.head(downloadUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Возвращаем финальный URL
      return response.request.res.responseUrl || downloadUrl;

    } catch (error) {
      console.error('Error getting direct URL:', error.message);
      return `${this.apiURL}/download/${trackId}`;
    }
  }

  /**
   * Импортировать треки из жанра
   */
  async importFromGenre(genre = 'pop-music', language = 'rus', limit = 50, maxPages = 3) {
    try {
      console.log(`📥 Importing from Lmusic.kz: ${genre}/${language}, limit=${limit}`);

      let allTracks = [];
      let imported = 0;
      let skipped = 0;

      // Парсим несколько страниц
      for (let page = 1; page <= maxPages && allTracks.length < limit; page++) {
        const pageTracks = await this.parseGenrePage(genre, language, page);
        allTracks.push(...pageTracks);
        
        if (pageTracks.length === 0) break; // Больше нет треков
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Ограничиваем количество
      allTracks = allTracks.slice(0, limit);

      // Импортируем треки в базу
      for (const trackData of allTracks) {
        try {
          // Проверяем, не существует ли уже
          const existing = await Track.findOne({
            where: {
              externalSource: 'lmusic.kz',
              externalId: `lmusic_${trackData.id}`
            }
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Создаём трек
          await Track.create({
            title: trackData.title,
            artist: trackData.artist,
            duration: trackData.duration,
            genre: this.mapGenre(trackData.genre),
            coverPath: trackData.coverUrl,
            filePath: trackData.streamUrl,
            externalUrl: trackData.streamUrl,
            sourceUrl: trackData.pageUrl,
            externalSource: 'lmusic.kz',
            externalId: `lmusic_${trackData.id}`,
            sourceType: 'external',
            isPublic: true,
            allowDownload: true
          });

          imported++;
          console.log(`  ✅ Imported: ${trackData.artist} - ${trackData.title}`);

        } catch (error) {
          console.error(`  ❌ Failed to import track ${trackData.id}:`, error.message);
          skipped++;
        }
      }

      console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped`);

      return {
        success: true,
        imported,
        skipped,
        total: allTracks.length
      };

    } catch (error) {
      console.error('❌ Lmusic.kz import error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Маппинг жанров
   */
  mapGenre(genre) {
    const genreMap = {
      'pop-music': 'Pop',
      'rock': 'Rock',
      'rap': 'Hip-Hop',
      'chanson': 'Chanson',
      'electronic': 'Electronic',
      'dance': 'Dance',
      'folk': 'Folk',
      'jazz': 'Jazz'
    };
    return genreMap[genre] || 'Various';
  }

  /**
   * Получить популярные жанры
   */
  getAvailableGenres() {
    return [
      { id: 'pop-music', name: 'Поп', languages: ['rus', 'kz'] },
      { id: 'rock', name: 'Рок', languages: ['rus', 'kz'] },
      { id: 'rap', name: 'Рэп', languages: ['rus', 'kz'] },
      { id: 'chanson', name: 'Шансон', languages: ['rus', 'kz'] },
      { id: 'electronic', name: 'Электронная', languages: ['rus', 'kz'] },
      { id: 'dance', name: 'Танцевальная', languages: ['rus', 'kz'] },
      { id: 'folk', name: 'Народная', languages: ['rus', 'kz'] }
    ];
  }
}

module.exports = new LmusicKzService();
