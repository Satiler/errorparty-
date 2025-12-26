/**
 * 🤖 Automated Music System
 * 
 * Comprehensive system for:
 * - Importing popular tracks from Russian and foreign platforms
 * - Automatic creation and update of playlists
 * - Personalized recommendations based on user likes
 * - Monitoring popular charts
 */

const { Track, Playlist, PlaylistTrack, TrackLike, ListeningHistory, User, Album } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { getInstance: getKissVKService } = require('./kissvk-lightweight.service');
const axios = require('axios');

class AutoMusicSystemService {
  constructor() {
    this.kissVKService = getKissVKService();
    
    // Data sources configuration
    // IMPORTANT: All files are downloaded ONLY from KissVK!
    // Other sources provide only information about popular tracks
    this.sources = {
      russian: {
        enabled: true,
        platforms: ['yandex'], // Only track information
        weight: 0.5
      },
      foreign: {
        enabled: true,
        platforms: ['billboard', 'itunes'], // Only track information
        weight: 0.5
      }
    };

    // System statistics
    this.stats = {
      tracksImported: 0,
      playlistsCreated: 0,
      recommendationsGenerated: 0,
      lastUpdate: null
    };
  }

  /**
   * 🚀 MAIN METHOD: Full system update
   */
  async runFullUpdate() {
    console.log('\n' + '='.repeat(80));
    console.log('🤖 LAUNCHING AUTOMATED MUSIC SYSTEM');
    console.log('='.repeat(80));

    const startTime = Date.now();
    const results = {
      imports: {},
      playlists: {},
      recommendations: {},
      errors: []
    };

    try {
      // 1. Import new tracks from popular platforms
      console.log('\n📥 STAGE 1: Importing new tracks');
      results.imports = await this.importPopularTracks();

      // 2. Update chart playlists
      console.log('\n📊 STAGE 2: Updating chart playlists');
      results.playlists = await this.updateChartPlaylists();

      // 3. Generate personal recommendations
      console.log('\n🎯 STAGE 3: Generating personal recommendations');
      results.recommendations = await this.generatePersonalPlaylists();

      // 4. Update statistics
      this.stats.lastUpdate = new Date();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n' + '='.repeat(80));
      console.log(`✅ SYSTEM SUCCESSFULLY UPDATED IN ${duration}s`);
      console.log('='.repeat(80));

      return { success: true, results, duration };

    } catch (error) {
      console.error('\n❌ CRITICAL ERROR:', error);
      results.errors.push(error.message);
      return { success: false, results, error: error.message };
    }
  }

  /**
   * 📥 Import popular tracks from all sources
   */
  async importPopularTracks() {
    const results = {
      russian: { imported: 0, failed: 0 },
      foreign: { imported: 0, failed: 0 },
      total: 0
    };

    // RUSSIAN SOURCES
    if (this.sources.russian.enabled) {
      console.log('\n🇷🇺 Importing Russian hits...');
      
      // 1. KissVK - popular Russian tracks
      try {
        const kissVKResult = await this.importFromKissVK();
        results.russian.imported += kissVKResult.imported;
        results.russian.failed += kissVKResult.failed;
      } catch (error) {
        console.error('❌ KissVK import error:', error.message);
        results.russian.failed++;
      }

      // 2. Yandex.Music charts (emulation)
      try {
        const yandexResult = await this.importFromYandexCharts();
        results.russian.imported += yandexResult.imported;
        results.russian.failed += yandexResult.failed;
      } catch (error) {
        console.error('❌ Yandex.Music import error:', error.message);
        results.russian.failed++;
      }
    }

    // FOREIGN SOURCES
    if (this.sources.foreign.enabled) {
      console.log('\n🌍 Importing foreign hits...');
      
      // 1. iTunes Top Charts
      try {
        const itunesResult = await this.importFromITunesCharts();
        results.foreign.imported += itunesResult.imported;
        results.foreign.failed += itunesResult.failed;
      } catch (error) {
        console.error('❌ iTunes import error:', error.message);
        results.foreign.failed++;
      }

      // 2. Billboard Hot 100 (emulation)
      try {
        const billboardResult = await this.importFromBillboard();
        results.foreign.imported += billboardResult.imported;
        results.foreign.failed += billboardResult.failed;
      } catch (error) {
        console.error('❌ Billboard import error:', error.message);
        results.foreign.failed++;
      }
    }

    results.total = results.russian.imported + results.foreign.imported;
    
    console.log(`\n✅ Import completed:`);
    console.log(`   🇷🇺 Russian: ${results.russian.imported}`);
    console.log(`   🌍 Foreign: ${results.foreign.imported}`);
    console.log(`   📊 Total: ${results.total}`);

    this.stats.tracksImported += results.total;
    return results;
  }

  /**
   * 💋 Import popular tracks from KissVK
   */
  async importFromKissVK() {
    console.log('💋 Loading popular tracks from KissVK...');
    
    const categories = [
      { url: 'https://kissvk.top/charts/top-100', name: 'Top 100', limit: 50 },
      { url: 'https://kissvk.top/charts/russian', name: 'Russian Music', limit: 30 },
      { url: 'https://kissvk.top/new', name: 'New Releases', limit: 20 }
    ];

    let imported = 0;
    let failed = 0;

    for (const category of categories) {
      try {
        console.log(`   📊 ${category.name}...`);
        
        const result = await this.kissVKService.extractTracks(category.url, category.limit);
        
        if (result.tracks && result.tracks.length > 0) {
          // Decrypt tracks
          const decryptedTracks = await this.kissVKService.decryptTracks(result.tracks);
          
          // Save to DB
          for (const trackData of decryptedTracks) {
            try {
              await this.saveTrackToDB(trackData, 'kissvk', category.name);
              imported++;
            } catch (error) {
              console.error(`      ❌ Track save error: ${error.message}`);
              failed++;
            }
          }
        }
      } catch (error) {
        console.error(`   ❌ Category load error ${category.name}:`, error.message);
        failed++;
      }
    }

    console.log(`   ✅ KissVK: imported ${imported}, errors ${failed}`);
    return { imported, failed };
  }

  /**
   * 🎵 Import popular tracks based on Yandex.Music data
   * IMPORTANT: Files are downloaded ONLY from KissVK, Yandex provides only track list
   */
  async importFromYandexCharts() {
    console.log('🎵 Getting popular tracks info from Yandex.Music...');
    console.log('   📥 Downloading files from: KissVK');
    
    // Popular Russian tracks 2025 (data from Yandex.Music charts)
    const popularRussianTracks = [
      { artist: 'Инстасамка', title: 'За деньги да', genre: 'Русский рэп' },
      { artist: 'Miyagi & Andy Panda', title: 'Kosandra', genre: 'Русский рэп' },
      { artist: 'Скриптонит', title: 'Положение', genre: 'Русский рэп' },
      { artist: 'Три дня дождя', title: 'Демоны', genre: 'Русский рок' },
      { artist: 'Cream Soda', title: 'Никаких больше вечеринок', genre: 'Русский поп' },
      { artist: 'Big Baby Tape', title: 'Gimme The Loot', genre: 'Русский рэп' },
      { artist: 'Монеточка', title: 'Каждый раз', genre: 'Русский поп' },
      { artist: 'Валентин Стрыкало', title: 'Наше лето', genre: 'Русский инди' },
      { artist: 'Oxxxymiron', title: 'Город под подошвой', genre: 'Русский рэп' },
      { artist: 'Король и Шут', title: 'Кукла колдуна', genre: 'Русский рок' },
      { artist: 'Макс Корж', title: 'Малый повзрослел', genre: 'Русский рэп' },
      { artist: 'ANNA ASTI', title: 'По барам', genre: 'Русский поп' },
      { artist: 'Джиос', title: 'Малиновый закат', genre: 'Русский поп' },
      { artist: 'Danya Milokhin', title: 'Малолетка', genre: 'Русский поп' }
    ];

    let imported = 0;
    let failed = 0;

    for (const trackInfo of popularRussianTracks) {
      try {
        // Track info from Yandex.Music
        // Download files ONLY from KissVK
        const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
        const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
        
        console.log(`      🔍 Searching on KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
        const result = await this.kissVKService.extractTracks(searchUrl, 1);
        
        if (result.tracks && result.tracks.length > 0) {
          const decrypted = await this.kissVKService.decryptTracks(result.tracks);
          if (decrypted.length > 0) {
            // Save with source 'yandex' (info) + 'kissvk' (file)
            await this.saveTrackToDB(
              { ...decrypted[0], genre: trackInfo.genre }, 
              'yandex-chart', 
              'Yandex.Music Chart'
            );
            imported++;
          }
        } else {
          console.log(`      ⚠️ Not found on KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
          failed++;
        }
      } catch (error) {
        console.error(`      ❌ Error: ${trackInfo.artist} - ${trackInfo.title} - ${error.message}`);
        failed++;
      }
    }

    console.log(`   ✅ Yandex → KissVK: imported ${imported}, errors ${failed}`);
    return { imported, failed };
  }

  /**
   * 🍎 Import popular tracks based on iTunes Top Charts data
   * IMPORTANT: Files are downloaded ONLY from KissVK, iTunes provides only track list
   */
  async importFromITunesCharts() {
    console.log('🍎 Getting popular tracks info from iTunes...');
    console.log('   📥 Downloading files from: KissVK');
    
    let imported = 0;
    let failed = 0;

    try {
      // iTunes API - Top 25 Songs (track info only)
      const response = await axios.get('https://itunes.apple.com/us/rss/topsongs/limit=25/json', {
        timeout: 15000
      });

      const songs = response.data?.feed?.entry || [];
      console.log(`   📊 Received tracks from iTunes: ${songs.length}`);

      for (const song of songs) {
        try {
          const trackInfo = {
            artist: song['im:artist']?.label || 'Unknown Artist',
            title: song['im:name']?.label || 'Unknown Title',
            genre: song.category?.attributes?.label || 'Pop',
            coverUrl: song['im:image']?.[2]?.label || null
          };

          // Track info from iTunes
          // Download files ONLY from KissVK
          const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
          const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
          
          console.log(`      🔍 Searching on KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
          const result = await this.kissVKService.extractTracks(searchUrl, 1);
          
          if (result.tracks && result.tracks.length > 0) {
            const decrypted = await this.kissVKService.decryptTracks(result.tracks);
            if (decrypted.length > 0) {
              // Merge iTunes metadata with KissVK file
              const trackData = { 
                ...decrypted[0],
                genre: trackInfo.genre,
                coverUrl: trackInfo.coverUrl || decrypted[0].coverUrl
              };
              await this.saveTrackToDB(trackData, 'itunes-chart', 'iTunes Top Chart');
              imported++;
            }
          } else {
            console.log(`      ⚠️ Not found on KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
            failed++;
          }
        } catch (error) {
          console.error(`      ❌ Error: ${error.message}`);
          failed++;
        }
      }
    } catch (error) {
      console.error('   ❌ iTunes API error:', error.message);
      failed++;
    }

    console.log(`   ✅ iTunes → KissVK: imported ${imported}, errors ${failed}`);
    return { imported, failed };
  }

  /**
   * 📊 Import popular tracks based on Billboard Hot 100 data
   * IMPORTANT: Files are downloaded ONLY from KissVK, Billboard provides only track list
   */
  async importFromBillboard() {
    console.log('📊 Getting popular tracks info from Billboard...');
    console.log('   📥 Downloading files from: KissVK');
    
    // Popular foreign tracks 2025 (data from Billboard Hot 100)
    const billboardTracks = [
      { artist: 'Taylor Swift', title: 'Fortnight', genre: 'Pop' },
      { artist: 'Sabrina Carpenter', title: 'Espresso', genre: 'Pop' },
      { artist: 'Billie Eilish', title: 'Lunch', genre: 'Alternative' },
      { artist: 'Ariana Grande', title: 'yes, and?', genre: 'Pop' },
      { artist: 'Post Malone & Morgan Wallen', title: 'I Had Some Help', genre: 'Country Pop' },
      { artist: 'Beyoncé', title: 'Texas Hold Em', genre: 'Country' },
      { artist: 'Dua Lipa', title: 'Houdini', genre: 'Dance Pop' },
      { artist: 'The Weeknd', title: 'Timeless', genre: 'R&B' },
      { artist: 'Olivia Rodrigo', title: 'vampire', genre: 'Pop Rock' },
      { artist: 'Travis Scott', title: 'FE!N', genre: 'Hip Hop' },
      { artist: 'Charli XCX', title: '360', genre: 'Pop' },
      { artist: 'Chappell Roan', title: 'Good Luck, Babe!', genre: 'Pop' },
      { artist: 'Tate McRae', title: 'greedy', genre: 'Pop' },
      { artist: 'Teddy Swims', title: 'Lose Control', genre: 'R&B' }
    ];

    let imported = 0;
    let failed = 0;

    for (const trackInfo of billboardTracks) {
      try {
        // Track info from Billboard
        // Download files ONLY from KissVK
        const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
        const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
        
        console.log(`      🔍 Searching on KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
        const result = await this.kissVKService.extractTracks(searchUrl, 1);
        
        if (result.tracks && result.tracks.length > 0) {
          const decrypted = await this.kissVKService.decryptTracks(result.tracks);
          if (decrypted.length > 0) {
            // Save with source 'billboard' (info) + 'kissvk' (file)
            await this.saveTrackToDB(
              { ...decrypted[0], genre: trackInfo.genre }, 
              'billboard-chart', 
              'Billboard Hot 100'
            );
            imported++;
          }
        } else {
          console.log(`      ⚠️ Not found on KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
          failed++;
        }
      } catch (error) {
        console.error(`      ❌ Error: ${trackInfo.artist} - ${trackInfo.title} - ${error.message}`);
        failed++;
      }
    }

    console.log(`   ✅ Billboard → KissVK: imported ${imported}, errors ${failed}`);
    return { imported, failed };
  }

  /**
   * 💾 Save track to database
   */
  async saveTrackToDB(trackData, source, category) {
    // Check for duplicates
    const existing = await Track.findOne({
      where: {
        [Op.or]: [
          { fileUrl: trackData.streamUrl },
          {
            [Op.and]: [
              { artist: trackData.artist || 'Unknown' },
              { title: trackData.title || 'Unknown' }
            ]
          }
        ]
      }
    });

    if (existing) {
      // Update existing track popularity
      await existing.update({
        playCount: (existing.playCount || 0) + 1,
        popularity: Math.min((existing.popularity || 50) + 5, 100)
      });
      return existing;
    }

    // Create new track
    const track = await Track.create({
      title: trackData.title || 'Unknown Title',
      artist: trackData.artist || 'Unknown Artist',
      genre: trackData.genre || category,
      duration: trackData.duration || 180,
      fileUrl: trackData.streamUrl,
      streamUrl: trackData.streamUrl,
      source: source,
      provider: 'kissvk',
      coverUrl: trackData.coverUrl || null,
      popularity: 75, // High initial popularity for chart tracks
      playCount: 10, // Initial play count
      externalId: trackData.externalId || null,
      metadata: JSON.stringify({
        category: category,
        importDate: new Date(),
        source: source
      })
    });

    console.log(`      ✅ Saved: ${track.artist} - ${track.title}`);
    return track;
  }

  /**
   * 📊 Update chart playlists
   */
  async updateChartPlaylists() {
    console.log('\n📊 Updating chart playlists...');

    const results = {
      updated: 0,
      created: 0,
      failed: 0
    };

    const playlistConfigs = [
      {
        name: '🔥 ТОП 100 ХИТОВ',
        description: 'Самые популярные треки в мире и России',
        type: 'chart',
        criteria: { limit: 100, sortBy: 'popularity' }
      },
      {
        name: '🇷🇺 РУССКИЕ ХИТЫ 2025',
        description: 'Лучшие российские треки года',
        type: 'chart',
        criteria: { limit: 50, genre: 'russian', sortBy: 'popularity' }
      },
      {
        name: '🌍 МИРОВЫЕ ХИТЫ 2025',
        description: 'Топовые зарубежные треки года',
        type: 'chart',
        criteria: { limit: 50, genre: 'foreign', sortBy: 'popularity' }
      },
      {
        name: '🆕 НОВИНКИ НЕДЕЛИ',
        description: 'Свежие треки последних 7 дней',
        type: 'new',
        criteria: { limit: 30, daysAgo: 7, sortBy: 'createdAt' }
      },
      {
        name: '🎧 РЕДАКТОРСКИЙ ВЫБОР',
        description: 'Лучшая музыка по мнению нашей команды',
        type: 'editorial',
        criteria: { limit: 40, minPopularity: 40 }
      }
    ];

    for (const config of playlistConfigs) {
      try {
        const playlist = await this.createOrUpdatePlaylist(config);
        
        if (playlist.created) {
          results.created++;
        } else {
          results.updated++;
        }

        console.log(`   ✅ ${config.name}: ${playlist.trackCount} tracks`);
      } catch (error) {
        console.error(`   ❌ Playlist creation error ${config.name}:`, error.message);
        results.failed++;
      }
    }

    console.log(`\n✅ Playlists updated:`);
    console.log(`   📝 Created: ${results.created}`);
    console.log(`   🔄 Updated: ${results.updated}`);
    console.log(`   ❌ Errors: ${results.failed}`);

    this.stats.playlistsCreated += results.created + results.updated;
    return results;
  }

  /**
   * 📝 Create/update playlist
   */
  async createOrUpdatePlaylist(config) {
    // Find existing playlist
    let playlist = await Playlist.findOne({
      where: { name: config.name }
    });

    let created = false;

    if (!playlist) {
      // Create new playlist
      playlist = await Playlist.create({
        name: config.name,
        description: config.description,
        type: config.type,
        isPublic: true,
        metadata: JSON.stringify({
          autoGenerated: true,
          criteria: config.criteria,
          lastUpdate: new Date()
        })
      });
      created = true;
    }

    // Get tracks by criteria
    const tracks = await this.getTracksByCriteria(config.criteria);

    // Clear old tracks from playlist
    await PlaylistTrack.destroy({
      where: { playlistId: playlist.id }
    });

    // Add new tracks
    for (let i = 0; i < tracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: tracks[i].id,
        position: i + 1
      });
    }

    // Update playlist cover (take cover from first track)
    if (tracks.length > 0 && tracks[0].coverUrl) {
      await playlist.update({
        coverPath: tracks[0].coverUrl
      });
    }

    return { created, trackCount: tracks.length };
  }

  /**
   * 🔍 Get tracks by criteria
   */
  async getTracksByCriteria(criteria) {
    const whereClause = {};
    const order = [];

    // Date filter
    if (criteria.daysAgo) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - criteria.daysAgo);
      whereClause.createdAt = { [Op.gte]: dateLimit };
    }

    // Popularity filter
    if (criteria.minPopularity) {
      whereClause.popularity = { [Op.gte]: criteria.minPopularity };
    }

    // Genre/region filter - TEMPORARILY DISABLED
    // Most tracks don't have genre/source properly set yet
    // They will be populated by future imports from KissVK/Yandex/iTunes
    // For now, just show all available tracks
    if (criteria.genre === 'russian') {
      // Will filter by genre when tracks have proper metadata
      // whereClause[Op.or] = [
      //   { genre: { [Op.like]: '%рус%' } },
      //   { source: { [Op.like]: '%yandex%' } }
      // ];
    } else if (criteria.genre === 'foreign') {
      // Will filter by genre when tracks have proper metadata
      // whereClause[Op.and] = [
      //   { genre: { [Op.notLike]: '%рус%' } },
      //   { source: { [Op.notLike]: '%yandex%' } }
      // ];
    }

    // Sorting
    if (criteria.sortBy === 'popularity') {
      order.push(['popularity', 'DESC']);
      order.push(['playCount', 'DESC']);
    } else if (criteria.sortBy === 'createdAt') {
      order.push(['createdAt', 'DESC']);
    }

    // Query
    const tracks = await Track.findAll({
      where: whereClause,
      order: order,
      limit: criteria.limit || 50
    });

    return tracks;
  }

  /**
   * 🎯 Generate personal playlists for users
   */
  async generatePersonalPlaylists() {
    console.log('\n🎯 Generating personal recommendations...');

    const results = {
      usersProcessed: 0,
      playlistsGenerated: 0,
      failed: 0
    };

    // Get all active users with likes
    const users = await User.findAll({
      include: [{
        model: TrackLike,
        as: 'likedTracks',
        required: true
      }],
      group: ['User.id', 'likedTracks.id'],
      having: literal('COUNT("likedTracks"."id") >= 5') // Minimum 5 likes
    });

    console.log(`   👥 Users found: ${users.length}`);

    for (const user of users) {
      try {
        await this.generatePersonalPlaylistForUser(user.id);
        results.usersProcessed++;
        results.playlistsGenerated++;
      } catch (error) {
        console.error(`   ❌ Error for user ${user.id}:`, error.message);
        results.failed++;
      }
    }

    console.log(`\n✅ Personal playlists created:`);
    console.log(`   👥 Users processed: ${results.usersProcessed}`);
    console.log(`   📝 Playlists created: ${results.playlistsGenerated}`);
    console.log(`   ❌ Errors: ${results.failed}`);

    this.stats.recommendationsGenerated += results.playlistsGenerated;
    return results;
  }

  /**
   * 👤 Create personal playlist for user
   */
  async generatePersonalPlaylistForUser(userId) {
    // 1. Analyze user likes
    const likedTracks = await Track.findAll({
      include: [{
        model: TrackLike,
        where: { userId },
        required: true
      }],
      limit: 100
    });

    if (likedTracks.length === 0) {
      return;
    }

    // 2. Analyze preferences
    const preferences = this.analyzeUserPreferences(likedTracks);

    // 3. Find similar tracks
    const recommendations = await this.findSimilarTracks(preferences, 30);

    // 4. Create/update "You'll Like It" playlist
    let playlist = await Playlist.findOne({
      where: {
        userId: userId,
        name: '❤️ МНЕ ПОНРАВИТСЯ'
      }
    });

    if (!playlist) {
      playlist = await Playlist.create({
        userId: userId,
        name: '❤️ МНЕ ПОНРАВИТСЯ',
        description: 'Персональная подборка на основе ваших лайков',
        type: 'personal',
        isPublic: false,
        metadata: JSON.stringify({
          autoGenerated: true,
          preferences: preferences,
          lastUpdate: new Date()
        })
      });
    }

    // 5. Update tracks in playlist
    await PlaylistTrack.destroy({
      where: { playlistId: playlist.id }
    });

    for (let i = 0; i < recommendations.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: recommendations[i].id,
        position: i + 1
      });
    }

    console.log(`      ✅ User ${userId}: ${recommendations.length} recommendations`);
    return playlist;
  }

  /**
   * 📊 Analyze user music preferences
   */
  analyzeUserPreferences(likedTracks) {
    const preferences = {
      genres: {},
      artists: {},
      avgPopularity: 0,
      totalTracks: likedTracks.length
    };

    let popularitySum = 0;

    for (const track of likedTracks) {
      // Count genres
      if (track.genre) {
        preferences.genres[track.genre] = (preferences.genres[track.genre] || 0) + 1;
      }

      // Count artists
      if (track.artist) {
        preferences.artists[track.artist] = (preferences.artists[track.artist] || 0) + 1;
      }

      // Average popularity
      popularitySum += track.popularity || 50;
    }

    preferences.avgPopularity = Math.round(popularitySum / likedTracks.length);

    // Top 3 genres
    preferences.topGenres = Object.entries(preferences.genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    // Top 5 artists
    preferences.topArtists = Object.entries(preferences.artists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);

    return preferences;
  }

  /**
   * 🔍 Find similar tracks based on preferences
   */
  async findSimilarTracks(preferences, limit = 30) {
    const whereClause = {
      [Op.or]: []
    };

    // Search by top genres
    if (preferences.topGenres && preferences.topGenres.length > 0) {
      whereClause[Op.or].push({
        genre: { [Op.in]: preferences.topGenres }
      });
    }

    // Search by top artists
    if (preferences.topArtists && preferences.topArtists.length > 0) {
      whereClause[Op.or].push({
        artist: { [Op.in]: preferences.topArtists }
      });
    }

    // Search by similar popularity (±20 from average)
    whereClause.popularity = {
      [Op.between]: [
        Math.max(0, preferences.avgPopularity - 20),
        Math.min(100, preferences.avgPopularity + 20)
      ]
    };

    // Exclude already liked tracks
    const likedTrackIds = await TrackLike.findAll({
      attributes: ['trackId'],
      raw: true
    }).then(likes => likes.map(l => l.trackId));

    if (likedTrackIds.length > 0) {
      whereClause.id = { [Op.notIn]: likedTrackIds };
    }

    // Query
    const tracks = await Track.findAll({
      where: whereClause,
      order: [
        ['popularity', 'DESC'],
        ['playCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: limit * 2 // Take more for diversity
    });

    // Diversification: take with intervals, not sequentially
    const diversified = [];
    for (let i = 0; i < tracks.length && diversified.length < limit; i += 2) {
      diversified.push(tracks[i]);
    }

    return diversified;
  }

  /**
   * 📊 Get system statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: this.stats.lastUpdate 
        ? Math.floor((Date.now() - this.stats.lastUpdate.getTime()) / 1000 / 60)
        : null
    };
  }

  /**
   * 🔧 Configure sources
   */
  configureSources(config) {
    this.sources = { ...this.sources, ...config };
    console.log('✅ Source configuration updated');
  }
}

// Export singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new AutoMusicSystemService();
    }
    return instance;
  },
  AutoMusicSystemService
};
