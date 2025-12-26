/**
 * 🤖 AI Music Discovery Service
 * Умная система поиска и импорта музыки с внешних источников
 */

const axios = require('axios');
const { Track, Album, Playlist, PlaylistTrack } = require('../../models');
const { Op } = require('sequelize');
const lmusicKzService = require('./lmusic-kz.service');

class AIMusicDiscoveryService {
  constructor() {
    this.sources = {
      lmusic: 'https://lmusic.kz'
    };
    
    // Маппинг жанров для lmusic.kz
    this.genrePatterns = {
      'Pop': ['pop-music', 'поп'],
      'Rock': ['rock', 'рок'],
      'Hip-Hop': ['rap', 'рэп', 'хип-хоп'],
      'Chanson': ['chanson', 'шансон'],
      'Electronic': ['electronic', 'электронная'],
      'Dance': ['dance', 'танцевальная'],
      'Folk': ['folk', 'народная'],
      'Jazz': ['jazz', 'джаз']
    };
    
    // Маппинг жанров в формат lmusic.kz
    this.lmusicGenres = {
      'Pop': 'pop-music',
      'Rock': 'rock',
      'Hip-Hop': 'rap',
      'Chanson': 'chanson',
      'Electronic': 'electronic',
      'Dance': 'dance',
      'Folk': 'folk',
      'Jazz': 'jazz'
    };
    
    this.moodDetector = {
      'Энергичная': ['energy', 'upbeat', 'fast', 'pump', 'power'],
      'Спокойная': ['calm', 'relax', 'peaceful', 'slow', 'soft'],
      'Грустная': ['sad', 'melancholy', 'emotional', 'dark'],
      'Счастливая': ['happy', 'joy', 'fun', 'bright', 'positive'],
      'Мотивирующая': ['motivation', 'workout', 'training', 'epic']
    };
  }

  /**
   * 🎯 Умный поиск музыки по критериям (через lmusic.kz)
   */
  async intelligentSearch(criteria) {
    const {
      genre = null,
      mood = null,
      tempo = null,
      keywords = [],
      limit = 50,
      language = 'rus'
    } = criteria;

    console.log('🔍 Умный поиск музыки через lmusic.kz:', { genre, mood, language, keywords });

    const results = [];

    // Поиск по жанру через lmusic.kz
    if (genre) {
      const lmusicGenre = this.lmusicGenres[genre] || 'pop-music';
      console.log(`📂 Парсинг жанра ${genre} (${lmusicGenre}) с lmusic.kz...`);
      
      const genreTracks = await lmusicKzService.parseGenrePage(
        lmusicGenre,
        language,
        1
      );
      
      results.push(...genreTracks.map(t => ({
        ...t,
        genre,
        confidence: 0.9,
        source: 'genre'
      })));
    }

    // Поиск по ключевым словам
    if (keywords.length > 0) {
      for (const keyword of keywords.slice(0, 3)) {
        const searchResults = await this.searchFreeMusic(keyword, Math.ceil(limit / keywords.length));
        results.push(...searchResults.map(t => ({
          ...t,
          confidence: 0.7,
          source: 'keyword'
        })));
      }
    }

    // Удаление дубликатов и ранжирование
    const uniqueResults = this.deduplicateAndRank(results);

    return uniqueResults.slice(0, limit);
  }

  /**
   * 🎵 Поиск по жанру с умной категоризацией
   */
  async searchByGenre(genre, limit = 20) {
    const results = [];
    const patterns = this.genrePatterns[genre] || [genre.toLowerCase()];

    // Генерируем разнообразные запросы
    for (const pattern of patterns) {
      try {
        const tracks = await this.searchFreeMusic(pattern, Math.ceil(limit / patterns.length));
        results.push(...tracks.map(t => ({ ...t, confidence: 0.9, source: 'genre' })));
      } catch (error) {
        console.error(`Ошибка поиска по паттерну ${pattern}:`, error.message);
      }
    }

    return results;
  }

  /**
   * 😊 Поиск по настроению
   */
  async searchByMood(mood, limit = 20) {
    const results = [];
    const keywords = this.moodDetector[mood] || [mood.toLowerCase()];

    for (const keyword of keywords) {
      try {
        const tracks = await this.searchFreeMusic(keyword, Math.ceil(limit / keywords.length));
        results.push(...tracks.map(t => ({ ...t, confidence: 0.8, source: 'mood' })));
      } catch (error) {
        console.error(`Ошибка поиска по настроению ${keyword}:`, error.message);
      }
    }

    return results;
  }

  /**
   * 🔑 Поиск по ключевым словам
   */
  async searchByKeywords(keywords, limit = 20) {
    const results = [];

    for (const keyword of keywords) {
      try {
        const tracks = await this.searchFreeMusic(keyword, Math.ceil(limit / keywords.length));
        results.push(...tracks.map(t => ({ ...t, confidence: 0.7, source: 'keyword' })));
      } catch (error) {
        console.error(`Ошибка поиска по ключевому слову ${keyword}:`, error.message);
      }
    }

    return results;
  }

  /**
   * 🌐 Поиск музыки через lmusic.kz
   */
  async searchFreeMusic(query, limit = 10) {
    try {
      console.log(`🔍 Searching lmusic.kz: "${query}", limit=${limit}`);
      
      // Поиск через lmusic.kz
      const results = await lmusicKzService.searchTracks(query, limit);
      
      // Преобразуем в нужный формат
      return results.map(track => ({
        title: track.title,
        artist: track.artist,
        genre: this.detectGenreFromTitle(track.title + ' ' + track.artist),
        mood: this.detectMoodFromTitle(track.title + ' ' + track.artist),
        duration: track.duration || 180,
        streamUrl: track.streamUrl,
        downloadUrl: track.downloadUrl,
        coverUrl: track.coverUrl,
        externalId: track.id,
        source: 'lmusic.kz',
        sourceUrl: track.pageUrl
      }));
      
    } catch (error) {
      console.error('❌ Lmusic.kz search error:', error.message);
      return [];
    }
  }
  
  /**
   * 🎵 Определение жанра из названия/артиста
   */
  detectGenreFromTitle(text) {
    const lowerText = text.toLowerCase();
    
    for (const [genre, patterns] of Object.entries(this.genrePatterns)) {
      if (patterns.some(pattern => lowerText.includes(pattern))) {
        return genre;
      }
    }
    
    return 'Pop'; // По умолчанию
  }
  
  /**
   * 😊 Определение настроения из названия
   */
  detectMoodFromTitle(text) {
    const lowerText = text.toLowerCase();
    const moods = ['Энергичная', 'Спокойная', 'Счастливая', 'Грустная', 'Мотивирующая'];
    
    // Простая эвристика на основе ключевых слов
    if (lowerText.match(/party|dance|fast|энергия|танц/)) return 'Энергичная';
    if (lowerText.match(/chill|relax|slow|спокой|тихо/)) return 'Спокойная';
    if (lowerText.match(/love|happy|joy|любовь|счаст/)) return 'Счастливая';
    if (lowerText.match(/sad|cry|tear|грустн|печал/)) return 'Грустная';
    if (lowerText.match(/power|strong|мотив|сил/)) return 'Мотивирующая';
    
    return moods[Math.floor(Math.random() * moods.length)];
  }

  /**
   * 🎯 Удаление дубликатов и умное ранжирование
   */
  deduplicateAndRank(results) {
    // Группируем по названию + артист
    const uniqueMap = new Map();

    for (const track of results) {
      const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
      
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, track);
      } else {
        // Если дубликат, оставляем трек с большей уверенностью
        const existing = uniqueMap.get(key);
        if (track.confidence > existing.confidence) {
          uniqueMap.set(key, track);
        }
      }
    }

    // Сортируем по уверенности
    return Array.from(uniqueMap.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 📥 Автоматический импорт найденных треков
   */
  async autoImportTracks(tracks, albumId = null) {
    const imported = [];
    const failed = [];

    for (const track of tracks) {
      try {
        // Проверяем, не существует ли уже такой трек
        const existing = await Track.findOne({
          where: {
            [Op.or]: [
              { title: track.title, artist: track.artist },
              { externalId: `lmusic_${track.externalId || track.id}` }
            ]
          }
        });

        if (existing) {
          console.log(`⏭️  Трек "${track.title}" уже существует`);
          continue;
        }

        // Создаём новый трек
        const newTrack = await Track.create({
          title: track.title,
          artist: track.artist,
          genre: track.genre || 'Pop',
          duration: track.duration || 180,
          filePath: track.streamUrl,
          externalUrl: track.streamUrl,
          sourceUrl: track.sourceUrl || track.pageUrl,
          coverPath: track.coverUrl,
          albumId: albumId,
          externalSource: 'lmusic.kz',
          externalId: `lmusic_${track.externalId || track.id}`,
          sourceType: 'external',
          isPublic: true,
          allowDownload: true,
          metadata: {
            mood: track.mood,
            confidence: track.confidence,
            language: track.language || 'rus'
          }
        });

        imported.push(newTrack);
        console.log(`✅ Импортирован: ${track.artist} - ${track.title}`);

      } catch (error) {
        console.error(`❌ Ошибка импорта ${track.title}:`, error.message);
        failed.push({ track, error: error.message });
      }
    }

    return {
      success: imported.length,
      failed: failed.length,
      imported,
      failed
    };
  }

  /**
   * 🤖 Автоматическое обновление библиотеки
   */
  async autoUpdateLibrary(options = {}) {
    const {
      genres = ['Electronic', 'Pop', 'Hip-Hop', 'Rock', 'Jazz'],
      tracksPerGenre = 10,
      createPlaylists = true
    } = options;

    console.log('🤖 Запуск автообновления библиотеки...');

    const results = {
      totalSearched: 0,
      totalImported: 0,
      playlistsCreated: 0,
      errors: []
    };

    for (const genre of genres) {
      try {
        console.log(`\n📂 Обработка жанра: ${genre}`);

        // Умный поиск
        const searchResults = await this.intelligentSearch({
          genre,
          limit: tracksPerGenre
        });

        results.totalSearched += searchResults.length;

        // Автоимпорт
        const importResult = await this.autoImportTracks(searchResults);
        results.totalImported += importResult.success;

        // Создание плейлиста
        if (createPlaylists && importResult.imported.length > 0) {
          await this.createAutoPlaylist(genre, importResult.imported);
          results.playlistsCreated++;
        }

      } catch (error) {
        console.error(`❌ Ошибка обработки жанра ${genre}:`, error.message);
        results.errors.push({ genre, error: error.message });
      }
    }

    console.log('\n✅ Автообновление завершено:', results);
    return results;
  }

  /**
   * 📋 Создание автоматического плейлиста
   */
  async createAutoPlaylist(genre, tracks) {
    const playlistName = `🤖 Auto: ${genre} ${new Date().toLocaleDateString('ru-RU')}`;

    // Проверяем, не существует ли уже
    let playlist = await Playlist.findOne({
      where: { name: playlistName, type: 'auto' }
    });

    if (!playlist) {
      playlist = await Playlist.create({
        name: playlistName,
        description: `Автоматически подобранные треки жанра ${genre}`,
        type: 'auto',
        isPublic: true,
        metadata: {
          genre,
          autoGenerated: true,
          generatedAt: new Date(),
          icon: this.getGenreIcon(genre),
          color: this.getGenreColor(genre)
        }
      });
    }

    // Добавляем треки (с проверкой на дубликаты)
    for (let i = 0; i < tracks.length; i++) {
      const existing = await PlaylistTrack.findOne({
        where: {
          playlistId: playlist.id,
          trackId: tracks[i].id
        }
      });
      
      if (!existing) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: tracks[i].id,
          position: i + 1,
          addedBy: 1 // Система
        });
      }
    }

    console.log(`📋 Создан плейлист: ${playlistName} (${tracks.length} треков)`);
    return playlist;
  }

  /**
   * 🎨 Получить иконку для жанра
   */
  getGenreIcon(genre) {
    const icons = {
      'Electronic': '⚡',
      'Pop': '🎵',
      'Hip-Hop': '🎤',
      'Rock': '🎸',
      'Jazz': '🎷',
      'Soul': '💜',
      'Ambient': '🌊',
      'Indie': '🎨'
    };
    return icons[genre] || '🎵';
  }

  /**
   * 🌈 Получить цвет для жанра
   */
  getGenreColor(genre) {
    const colors = {
      'Electronic': '#3b82f6',
      'Pop': '#ec4899',
      'Hip-Hop': '#f59e0b',
      'Rock': '#ef4444',
      'Jazz': '#8b5cf6',
      'Soul': '#a855f7',
      'Ambient': '#06b6d4',
      'Indie': '#10b981'
    };
    return colors[genre] || '#6b7280';
  }

  /**
   * 📊 Статистика автоимпорта
   */
  async getImportStats() {
    const autoTracks = await Track.count({
      where: { sourceType: 'auto-import' }
    });

    const autoPlaylists = await Playlist.count({
      where: { type: 'auto' }
    });

    const lastImport = await Track.findOne({
      where: { sourceType: 'auto-import' },
      order: [['createdAt', 'DESC']]
    });

    return {
      autoImportedTracks: autoTracks,
      autoGeneratedPlaylists: autoPlaylists,
      lastImportDate: lastImport?.createdAt || null
    };
  }
}

module.exports = new AIMusicDiscoveryService();
