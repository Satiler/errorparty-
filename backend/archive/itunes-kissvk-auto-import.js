#!/usr/bin/env node

/**
 * 🎵 АВТОМАТИЧЕСКАЯ СИСТЕМА ИМПОРТА МУЗЫКИ
 * ==========================================
 * 1. Анализ топ-треков из iTunes RSS (все страны)
 * 2. Поиск и скачивание через KissVK Lightweight
 * 3. Сохранение в базу данных
 * 4. Автоматическое обновление плейлистов
 */

const axios = require('axios');
const { Track, Album, Playlist, PlaylistTrack, User } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');
const { Op } = require('sequelize');

// ============ ITUNES RSS API ============

class ItunesRSSService {
  constructor() {
    this.baseUrl = 'https://itunes.apple.com';
  }

  /**
   * Получить топ-песни по стране
   */
  async getTopSongs(country = 'us', limit = 100) {
    try {
      const url = `${this.baseUrl}/${country}/rss/topsongs/limit=${limit}/json`;
      const response = await axios.get(url, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const entries = response.data.feed?.entry || [];
      
      const tracks = entries.map((entry, index) => ({
        position: index + 1,
        title: this.cleanText(entry['im:name']?.label || ''),
        artist: this.cleanText(entry['im:artist']?.label || ''),
        album: entry['im:collection']?.['im:name']?.label || null,
        releaseDate: entry['im:releaseDate']?.label || null,
        genre: entry.category?.attributes?.label || 'Pop',
        coverUrl: entry['im:image']?.[2]?.label || null,
        previewUrl: entry.link?.[1]?.attributes?.href || null,
        country: country.toUpperCase()
      }));

      return tracks.filter(t => t.title && t.artist);
      
    } catch (error) {
      console.error(`❌ iTunes RSS Error (${country}):`, error.message);
      return [];
    }
  }

  /**
   * Получить топ-альбомы
   */
  async getTopAlbums(country = 'us', limit = 50) {
    try {
      const url = `${this.baseUrl}/${country}/rss/topalbums/limit=${limit}/json`;
      const response = await axios.get(url, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const entries = response.data.feed?.entry || [];
      
      const albums = entries.map((entry, index) => ({
        position: index + 1,
        title: this.cleanText(entry['im:name']?.label || ''),
        artist: this.cleanText(entry['im:artist']?.label || ''),
        releaseDate: entry['im:releaseDate']?.label || null,
        genre: entry.category?.attributes?.label || 'Pop',
        trackCount: parseInt(entry['im:itemCount']?.label) || 0,
        coverUrl: entry['im:image']?.[2]?.label || null,
        country: country.toUpperCase()
      }));

      return albums.filter(a => a.title && a.artist);
      
    } catch (error) {
      console.error(`❌ iTunes Albums Error (${country}):`, error.message);
      return [];
    }
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-()&',]/gi, '')
      .trim();
  }
}

// ============ KISSVK AUTO IMPORTER ============

class KissVKAutoImporter {
  constructor() {
    this.kissvk = new KissVKLightweightService();
    this.itunes = new ItunesRSSService();
    this.stats = {
      analyzed: 0,
      found: 0,
      imported: 0,
      skipped: 0,
      failed: 0
    };
  }

  /**
   * Найти трек на KissVK
   */
  async findOnKissVK(title, artist) {
    try {
      const query = `${artist} ${title}`;
      const results = await this.kissvk.searchTracks(query, 5);

      if (!results.success || results.tracks.length === 0) {
        return null;
      }

      // Находим наиболее подходящий трек
      const bestMatch = results.tracks.find(track => {
        const trackTitle = (track.title || '').toLowerCase();
        const trackArtist = (track.artist || '').toLowerCase();
        const searchTitle = title.toLowerCase();
        const searchArtist = artist.toLowerCase();

        return (
          trackTitle.includes(searchTitle) ||
          searchTitle.includes(trackTitle)
        ) && (
          trackArtist.includes(searchArtist) ||
          searchArtist.includes(trackArtist)
        );
      }) || results.tracks[0];

      return bestMatch;
      
    } catch (error) {
      console.error(`   ❌ Ошибка поиска на KissVK:`, error.message);
      return null;
    }
  }

  /**
   * Импортировать трек в базу
   */
  async importTrack(itunesTrack, kissvkTrack) {
    try {
      // Проверяем существование
      const existing = await Track.findOne({
        where: {
          [Op.or]: [
            { title: itunesTrack.title, artist: itunesTrack.artist },
            { streamUrl: kissvkTrack.streamUrl }
          ]
        }
      });

      if (existing) {
        this.stats.skipped++;
        return { success: true, skipped: true };
      }

      // Создаем/находим альбом
      let album = null;
      if (itunesTrack.album) {
        [album] = await Album.findOrCreate({
          where: {
            title: itunesTrack.album,
            artist: itunesTrack.artist
          },
          defaults: {
            title: itunesTrack.album,
            artist: itunesTrack.artist,
            releaseDate: itunesTrack.releaseDate ? new Date(itunesTrack.releaseDate) : null,
            genre: itunesTrack.genre,
            coverUrl: itunesTrack.coverUrl || kissvkTrack.coverUrl
          }
        });
      }

      // Создаем трек
      const track = await Track.create({
        title: itunesTrack.title,
        artist: itunesTrack.artist,
        albumId: album?.id || null,
        streamUrl: kissvkTrack.streamUrl,
        duration: kissvkTrack.duration || 180,
        genre: itunesTrack.genre,
        coverUrl: kissvkTrack.coverUrl || itunesTrack.coverUrl,
        trackNumber: itunesTrack.position,
        source: 'kissvk',
        provider: 'kissvk',
        allowDownload: true,
        popularityScore: (100 - itunesTrack.position + 1) * 10,
        chartPosition: itunesTrack.position,
        trendingDate: new Date(),
        importSource: `itunes-${itunesTrack.country.toLowerCase()}-kissvk`,
        metadata: {
          itunesCountry: itunesTrack.country,
          itunesPosition: itunesTrack.position,
          kissvkId: kissvkTrack.id,
          importedAt: new Date().toISOString()
        }
      });

      this.stats.imported++;
      return { success: true, track };
      
    } catch (error) {
      console.error(`   ❌ Ошибка импорта:`, error.message);
      this.stats.failed++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Обработать один трек из iTunes
   */
  async processTrack(itunesTrack, index, total) {
    this.stats.analyzed++;
    
    console.log(`\n[${index}/${total}] 🎵 ${itunesTrack.artist} - ${itunesTrack.title}`);
    console.log(`   📊 Позиция: #${itunesTrack.position} (${itunesTrack.country})`);

    // Поиск на KissVK
    console.log(`   🔍 Поиск на KissVK...`);
    const kissvkTrack = await this.findOnKissVK(itunesTrack.title, itunesTrack.artist);

    if (!kissvkTrack) {
      console.log(`   ⚠️  Не найдено на KissVK`);
      this.stats.failed++;
      return;
    }

    console.log(`   ✅ Найдено: ${kissvkTrack.artist} - ${kissvkTrack.title}`);
    this.stats.found++;

    // Расшифровываем URL
    console.log(`   🔓 Расшифровка URL...`);
    const decrypted = await this.kissvk.decryptTracks([kissvkTrack]);

    if (!decrypted || decrypted.length === 0 || !decrypted[0].streamUrl) {
      console.log(`   ❌ Не удалось расшифровать URL`);
      this.stats.failed++;
      return;
    }

    // Импортируем в базу
    console.log(`   💾 Сохранение в базу...`);
    const result = await this.importTrack(itunesTrack, decrypted[0]);

    if (result.success) {
      if (result.skipped) {
        console.log(`   ⏭️  Трек уже существует`);
      } else {
        console.log(`   ✅ Успешно импортирован!`);
      }
    } else {
      console.log(`   ❌ Ошибка импорта: ${result.error}`);
    }

    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Импортировать треки из страны
   */
  async importFromCountry(country, limit = 50) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🌍 ${country.name} - Топ ${limit}`);
    console.log('='.repeat(60));

    const tracks = await this.itunes.getTopSongs(country.code, limit);
    
    if (tracks.length === 0) {
      console.log(`❌ Не удалось получить треки из iTunes RSS`);
      return;
    }

    console.log(`📊 Получено ${tracks.length} треков из iTunes RSS\n`);

    for (let i = 0; i < tracks.length; i++) {
      await this.processTrack(tracks[i], i + 1, tracks.length);
    }
  }

  /**
   * Показать статистику
   */
  showStats() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 СТАТИСТИКА ИМПОРТА');
    console.log('='.repeat(60));
    console.log(`Проанализировано треков: ${this.stats.analyzed}`);
    console.log(`Найдено на KissVK: ${this.stats.found}`);
    console.log(`Импортировано: ${this.stats.imported}`);
    console.log(`Пропущено (дубликаты): ${this.stats.skipped}`);
    console.log(`Ошибки: ${this.stats.failed}`);
    console.log(`Успешность: ${((this.stats.imported / this.stats.analyzed) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
  }
}

// ============ MAIN ============

async function main() {
  console.log('\n🚀 АВТОМАТИЧЕСКАЯ СИСТЕМА ИМПОРТА МУЗЫКИ');
  console.log('iTunes RSS → KissVK → Database\n');

  const importer = new KissVKAutoImporter();

  // Страны для импорта (в порядке приоритета)
  const countries = [
    { code: 'us', name: '🇺🇸 США', limit: 50 },
    { code: 'gb', name: '🇬🇧 Великобритания', limit: 30 },
    { code: 'ru', name: '🇷🇺 Россия', limit: 30 },
    { code: 'de', name: '🇩🇪 Германия', limit: 20 },
    { code: 'fr', name: '🇫🇷 Франция', limit: 20 },
    { code: 'ca', name: '🇨🇦 Канада', limit: 20 },
    { code: 'au', name: '🇦🇺 Австралия', limit: 20 }
  ];

  try {
    // Импортируем из каждой страны
    for (const country of countries) {
      await importer.importFromCountry(country, country.limit);
    }

    // Показываем итоговую статистику
    importer.showStats();

    // Пересобираем плейлисты
    console.log(`\n🔄 Пересборка плейлистов...`);
    const { execSync } = require('child_process');
    try {
      execSync('node rebuild-playlists-modern.js', { 
        stdio: 'inherit',
        cwd: __dirname 
      });
    } catch (error) {
      console.log(`⚠️  Плейлисты можно пересобрать вручную: node rebuild-playlists-modern.js`);
    }

    console.log(`\n✅ Импорт завершен!`);
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    importer.showStats();
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  main();
}

module.exports = { ItunesRSSService, KissVKAutoImporter };
