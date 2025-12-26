/**
 * 🤖   
 * 
 *   :
 * -        
 * -     
 * -      
 * -   
 */

const { Track, Playlist, PlaylistTrack, TrackLike, ListeningHistory, User, Album } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { getInstance: getKissVKService } = require('./kissvk-lightweight.service');
const axios = require('axios');

class AutoMusicSystemService {
  constructor() {
    this.kissVKService = getKissVKService();
    
    //   
    // :      KissVK!
    //        
    this.sources = {
      russian: {
        enabled: true,
        platforms: ['yandex'], //     
        weight: 0.5
      },
      foreign: {
        enabled: true,
        platforms: ['billboard', 'itunes'], //     
        weight: 0.5
      }
    };

    //   
    this.stats = {
      tracksImported: 0,
      playlistsCreated: 0,
      recommendationsGenerated: 0,
      lastUpdate: null
    };
  }

  /**
   * 🚀  :   
   */
  async runFullUpdate() {
    console.log('\n' + '='.repeat(80));
    console.log('🤖    ');
    console.log('='.repeat(80));

    const startTime = Date.now();
    const results = {
      imports: {},
      playlists: {},
      recommendations: {},
      errors: []
    };

    try {
      // 1.      
      console.log('\n📥  1:   ');
      results.imports = await this.importPopularTracks();

      // 2.   
      console.log('\n📊  2:   ');
      results.playlists = await this.updateChartPlaylists();

      // 3.   
      console.log('\n🎯  3:   ');
      results.recommendations = await this.generatePersonalPlaylists();

      // 4.  
      this.stats.lastUpdate = new Date();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n' + '='.repeat(80));
      console.log(`✅     ${duration}`);
      console.log('='.repeat(80));

      return { success: true, results, duration };

    } catch (error) {
      console.error('\n❌  :', error);
      results.errors.push(error.message);
      return { success: false, results, error: error.message };
    }
  }

  /**
   * 📥      
   */
  async importPopularTracks() {
    const results = {
      russian: { imported: 0, failed: 0 },
      foreign: { imported: 0, failed: 0 },
      total: 0
    };

    //  
    if (this.sources.russian.enabled) {
      console.log('\n🇷🇺   ...');
      
      // 1. KissVK -   
      try {
        const kissVKResult = await this.importFromKissVK();
        results.russian.imported += kissVKResult.imported;
        results.russian.failed += kissVKResult.failed;
      } catch (error) {
        console.error('❌   KissVK:', error.message);
        results.russian.failed++;
      }

      // 2. .  ()
      try {
        const yandexResult = await this.importFromYandexCharts();
        results.russian.imported += yandexResult.imported;
        results.russian.failed += yandexResult.failed;
      } catch (error) {
        console.error('❌   .:', error.message);
        results.russian.failed++;
      }
    }

    //  
    if (this.sources.foreign.enabled) {
      console.log('\n🌍   ...');
      
      // 1. iTunes Top Charts
      try {
        const itunesResult = await this.importFromITunesCharts();
        results.foreign.imported += itunesResult.imported;
        results.foreign.failed += itunesResult.failed;
      } catch (error) {
        console.error('❌   iTunes:', error.message);
        results.foreign.failed++;
      }

      // 2. Billboard Hot 100 ()
      try {
        const billboardResult = await this.importFromBillboard();
        results.foreign.imported += billboardResult.imported;
        results.foreign.failed += billboardResult.failed;
      } catch (error) {
        console.error('❌   Billboard:', error.message);
        results.foreign.failed++;
      }
    }

    results.total = results.russian.imported + results.foreign.imported;
    
    console.log(`\n✅  :`);
    console.log(`   🇷🇺 : ${results.russian.imported}`);
    console.log(`   🌍 : ${results.foreign.imported}`);
    console.log(`   📊 : ${results.total}`);

    this.stats.tracksImported += results.total;
    return results;
  }

  /**
   * 💋     KissVK
   */
  async importFromKissVK() {
    console.log('💋    KissVK...');
    
    const categories = [
      { url: 'https://kissvk.top/charts/top-100', name: 'Top 100', limit: 50 },
      { url: 'https://kissvk.top/charts/russian', name: ' ', limit: 30 },
      { url: 'https://kissvk.top/new', name: '', limit: 20 }
    ];

    let imported = 0;
    let failed = 0;

    for (const category of categories) {
      try {
        console.log(`   📊 ${category.name}...`);
        
        const result = await this.kissVKService.extractTracks(category.url, category.limit);
        
        if (result.tracks && result.tracks.length > 0) {
          //  
          const decryptedTracks = await this.kissVKService.decryptTracks(result.tracks);
          
          //   
          for (const trackData of decryptedTracks) {
            try {
              await this.saveTrackToDB(trackData, 'kissvk', category.name);
              imported++;
            } catch (error) {
              console.error(`      ❌   : ${error.message}`);
              failed++;
            }
          }
        }
      } catch (error) {
        console.error(`   ❌    ${category.name}:`, error.message);
        failed++;
      }
    }

    console.log(`   ✅ KissVK:  ${imported},  ${failed}`);
    return { imported, failed };
  }

  /**
   * 🎵       .
   * :     KissVK,      
   */
  async importFromYandexCharts() {
    console.log('🎵       ....');
    console.log('   📥  : KissVK');
    
    //    2025 (  . )
    const popularRussianTracks = [
      { artist: '', title: '  ', genre: ' ' },
      { artist: 'Miyagi & Andy Panda', title: 'Kosandra', genre: ' ' },
      { artist: '', title: '', genre: ' ' },
      { artist: '  ', title: '', genre: ' ' },
      { artist: 'Cream Soda', title: '  ', genre: ' ' },
      { artist: 'Big Baby Tape', title: 'Gimme The Loot', genre: ' ' },
      { artist: '', title: ' ', genre: ' ' },
      { artist: ' ', title: ' ', genre: ' ' },
      { artist: 'Oxxxymiron', title: '  ', genre: ' ' },
      { artist: '  ', title: ' ', genre: ' ' },
      { artist: ' ', title: ' ', genre: ' ' },
      { artist: 'ANNA ASTI', title: ' ', genre: ' ' },
      { artist: '', title: ' ', genre: ' ' },
      { artist: 'Danya Milokhin', title: '', genre: ' ' }
    ];

    let imported = 0;
    let failed = 0;

    for (const trackInfo of popularRussianTracks) {
      try {
        //      .
        //     KissVK
        const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
        const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
        
        console.log(`      🔍   KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
        const result = await this.kissVKService.extractTracks(searchUrl, 1);
        
        if (result.tracks && result.tracks.length > 0) {
          const decrypted = await this.kissVKService.decryptTracks(result.tracks);
          if (decrypted.length > 0) {
            //    'yandex' () + 'kissvk' ()
            await this.saveTrackToDB(
              { ...decrypted[0], genre: trackInfo.genre }, 
              'yandex-chart', 
              '. '
            );
            imported++;
          }     iTunes Top Charts
   * :     KissVK, iTunes     
   */
  async importFromITunesCharts() {
    console.log('🍎       iTunes...');
    console.log('   📥  : KissVK');
    
    let imported = 0;
    let failed = 0;

    try {
      // iTunes API - Top 25 Songs (    )
      const response = await axios.get('https://itunes.apple.com/us/rss/topsongs/limit=25/json', {
        timeout: 15000
      });

      const songs = response.data?.feed?.entry || [];
      console.log(`   📊    iTunes: ${songs.length}`);

      for (const song of songs) {
        try {
          const trackInfo = {
            artist: song['im:artist']?.label || 'Unknown Artist',
            title: song['im:name']?.label || 'Unknown Title',
            genre: song.category?.attributes?.label || 'Pop',
            coverUrl: song['im:image']?.[2]?.label || null
          };

          //      iTunes
          //     KissVK
          const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
          const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
          
          console.log(`      🔍   KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
          const result = await this.kissVKService.extractTracks(searchUrl, 1);
          
          if (result.tracks && result.tracks.length > 0) {
            const decrypted = await this.kissVKService.decryptTracks(result.tracks);
            if (decrypted.length > 0) {
              //   iTunes   KissVK
              const trackData = { 
                ...decrypted[0],
                genre: trackInfo.genre,
                coverUrl: trackInfo.coverUrl || decrypted[0].coverUrl
              };
              await this.saveTrackToDB(trackData, 'itunes-chart', 'iTunes Top Chart');
              imported++;
            }
          } else {
            console.log(`      ⚠️    KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
            failed++;
          }
        } catch (error) {
          console.error(`      ❌ : ${error.message}`);
          failed++;
        }     Billboard Hot 100
   * :     KissVK, Billboard     
   */
  async importFromBillboard() {
    console.log('📊       Billboard...');
    console.log('   📥  : KissVK');
    
    //    2025 (  Billboard Hot 100)
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
        //      Billboard
        //     KissVK
        const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
        const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
        
        console.log(`      🔍   KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
        const result = await this.kissVKService.extractTracks(searchUrl, 1);
        
        if (result.tracks && result.tracks.length > 0) {
          const decrypted = await this.kissVKService.decryptTracks(result.tracks);
          if (decrypted.length > 0) {
            //    'billboard' () + 'kissvk' ()
            await this.saveTrackToDB(
              { ...decrypted[0], genre: trackInfo.genre }, 
              'billboard-chart', 
              'Billboard Hot 100'
            );
            imported++;
          }
        } else {
          console.log(`      ⚠️    KissVK: ${trackInfo.artist} - ${trackInfo.title}`);
          failed++;
        }
      } catch (error) {
        console.error(`      ❌ : ${trackInfo.artist} - ${trackInfo.title} - ${error.message}`);
        failed++;
      }
    }

    console.log(`   ✅ Billboard → KissVK: ${imported} , ${failed} 
      { artist: 'Olivia Rodrigo', title: 'vampire', genre: 'Pop Rock' },
      { artist: 'Travis Scott', title: 'FE!N', genre: 'Hip Hop' }
    ];

    let imported = 0;
    let failed = 0;

    for (const trackInfo of billboardTracks) {
      try {
        const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
        const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
        
        const result = await this.kissVKService.extractTracks(searchUrl, 1);
        
        if (result.tracks && result.tracks.length > 0) {
          const decrypted = await this.kissVKService.decryptTracks(result.tracks);
          if (decrypted.length > 0) {
            await this.saveTrackToDB(decrypted[0], 'billboard-kissvk', 'Billboard Hot 100');
            imported++;
          }
        }
      } catch (error) {
        console.error(`   ❌   ${trackInfo.artist} - ${trackInfo.title}`);
        failed++;
      }
    }

    console.log(`   ✅ Billboard:  ${imported},  ${failed}`);
    return { imported, failed };
  }

  /**
   * 💾     
   */
  async saveTrackToDB(trackData, source, category) {
    //   
    const existing = await Track.findOne({
      where: {
        [Op.or]: [
          { fileUrl: trackData.url },
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
      //    
      await existing.update({
        playCount: (existing.playCount || 0) + 1,
        popularity: Math.min((existing.popularity || 50) + 5, 100)
      });
      return existing;
    }

    //   
    const track = await Track.create({
      title: trackData.title || 'Unknown Title',
      artist: trackData.artist || 'Unknown Artist',
      genre: trackData.genre || category,
      duration: trackData.duration || 180,
      fileUrl: trackData.url,
      streamUrl: trackData.url,
      source: source,
      provider: 'kissvk',
      coverUrl: trackData.coverUrl || null,
      popularity: 75, //      
      playCount: 10, //   
      externalId: trackData.externalId || null,
      metadata: JSON.stringify({
        category: category,
        importDate: new Date(),
        source: source
      })
    });

    console.log(`      ✅ : ${track.artist} - ${track.title}`);
    return track;
  }

  /**
   * 📊   
   */
  async updateChartPlaylists() {
    console.log('\n📊   ...');

    const results = {
      updated: 0,
      created: 0,
      failed: 0
    };

    const playlistConfigs = [
      {
        name: '🔥  100 ',
        description: '      ',
        type: 'chart',
        criteria: { limit: 100, sortBy: 'popularity' }
      },
      {
        name: '🇷🇺   2025',
        description: '   ',
        type: 'chart',
        criteria: { limit: 50, genre: 'russian', sortBy: 'popularity' }
      },
      {
        name: '🌍   2025',
        description: '   ',
        type: 'chart',
        criteria: { limit: 50, genre: 'foreign', sortBy: 'popularity' }
      },
      {
        name: '🆕  ',
        description: '   7 ',
        type: 'new',
        criteria: { limit: 30, daysAgo: 7, sortBy: 'createdAt' }
      },
      {
        name: '🎧  ',
        description: '     ',
        type: 'editorial',
        criteria: { limit: 40, minPopularity: 80 }
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

        console.log(`   ✅ ${config.name}: ${playlist.trackCount} `);
      } catch (error) {
        console.error(`   ❌   ${config.name}:`, error.message);
        results.failed++;
      }
    }

    console.log(`\n✅  :`);
    console.log(`   📝 : ${results.created}`);
    console.log(`   🔄 : ${results.updated}`);
    console.log(`   ❌ : ${results.failed}`);

    this.stats.playlistsCreated += results.created + results.updated;
    return results;
  }

  /**
   * 📝 / 
   */
  async createOrUpdatePlaylist(config) {
    //   
    let playlist = await Playlist.findOne({
      where: { name: config.name }
    });

    let created = false;

    if (!playlist) {
      //   
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

    //    
    const tracks = await this.getTracksByCriteria(config.criteria);

    //     
    await PlaylistTrack.destroy({
      where: { playlistId: playlist.id }
    });

    //   
    for (let i = 0; i < tracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: tracks[i].id,
        position: i + 1
      });
    }

    //    (   )
    if (tracks.length > 0 && tracks[0].coverUrl) {
      await playlist.update({
        coverPath: tracks[0].coverUrl
      });
    }

    return { created, trackCount: tracks.length };
  }

  /**
   * 🔍    
   */
  async getTracksByCriteria(criteria) {
    const whereClause = {};
    const order = [];

    //   
    if (criteria.daysAgo) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - criteria.daysAgo);
      whereClause.createdAt = { [Op.gte]: dateLimit };
    }

    //   
    if (criteria.minPopularity) {
      whereClause.popularity = { [Op.gte]: criteria.minPopularity };
    }

    //   /
    if (criteria.genre === 'russian') {
      whereClause[Op.or] = [
        { genre: { [Op.like]: '%%' } },
        { source: { [Op.like]: '%yandex%' } },
        { metadata: { [Op.like]: '%russian%' } }
      ];
    } else if (criteria.genre === 'foreign') {
      whereClause[Op.and] = [
        { genre: { [Op.notLike]: '%%' } },
        { source: { [Op.notLike]: '%yandex%' } }
      ];
    }

    // 
    if (criteria.sortBy === 'popularity') {
      order.push(['popularity', 'DESC']);
      order.push(['playCount', 'DESC']);
    } else if (criteria.sortBy === 'createdAt') {
      order.push(['createdAt', 'DESC']);
    }

    // 
    const tracks = await Track.findAll({
      where: whereClause,
      order: order,
      limit: criteria.limit || 50
    });

    return tracks;
  }

  /**
   * 🎯     
   */
  async generatePersonalPlaylists() {
    console.log('\n🎯   ...');

    const results = {
      usersProcessed: 0,
      playlistsGenerated: 0,
      failed: 0
    };

    //      
    const users = await User.findAll({
      include: [{
        model: TrackLike,
        as: 'likedTracks',
        required: true
      }],
      group: ['User.id'],
      having: literal('COUNT(likedTracks.id) >= 5') //  5 
    });

    console.log(`   👥  : ${users.length}`);

    for (const user of users) {
      try {
        await this.generatePersonalPlaylistForUser(user.id);
        results.usersProcessed++;
        results.playlistsGenerated++;
      } catch (error) {
        console.error(`   ❌    ${user.id}:`, error.message);
        results.failed++;
      }
    }

    console.log(`\n✅   :`);
    console.log(`   👥  : ${results.usersProcessed}`);
    console.log(`   📝  : ${results.playlistsGenerated}`);
    console.log(`   ❌ : ${results.failed}`);

    this.stats.recommendationsGenerated += results.playlistsGenerated;
    return results;
  }

  /**
   * 👤     
   */
  async generatePersonalPlaylistForUser(userId) {
    // 1.   
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

    // 2.  
    const preferences = this.analyzeUserPreferences(likedTracks);

    // 3.   
    const recommendations = await this.findSimilarTracks(preferences, 30);

    // 4. /  " "
    let playlist = await Playlist.findOne({
      where: {
        userId: userId,
        name: '❤️  '
      }
    });

    if (!playlist) {
      playlist = await Playlist.create({
        userId: userId,
        name: '❤️  ',
        description: '     ',
        type: 'personal',
        isPublic: false,
        metadata: JSON.stringify({
          autoGenerated: true,
          preferences: preferences,
          lastUpdate: new Date()
        })
      });
    }

    // 5.    
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

    console.log(`      ✅  ${userId}: ${recommendations.length} `);
    return playlist;
  }

  /**
   * 📊    
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
      //  
      if (track.genre) {
        preferences.genres[track.genre] = (preferences.genres[track.genre] || 0) + 1;
      }

      //  
      if (track.artist) {
        preferences.artists[track.artist] = (preferences.artists[track.artist] || 0) + 1;
      }

      //  
      popularitySum += track.popularity || 50;
    }

    preferences.avgPopularity = Math.round(popularitySum / likedTracks.length);

    // -3 
    preferences.topGenres = Object.entries(preferences.genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    // -5 
    preferences.topArtists = Object.entries(preferences.artists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);

    return preferences;
  }

  /**
   * 🔍      
   */
  async findSimilarTracks(preferences, limit = 30) {
    const whereClause = {
      [Op.or]: []
    };

    //    
    if (preferences.topGenres && preferences.topGenres.length > 0) {
      whereClause[Op.or].push({
        genre: { [Op.in]: preferences.topGenres }
      });
    }

    //    
    if (preferences.topArtists && preferences.topArtists.length > 0) {
      whereClause[Op.or].push({
        artist: { [Op.in]: preferences.topArtists }
      });
    }

    //     (±20  )
    whereClause.popularity = {
      [Op.between]: [
        Math.max(0, preferences.avgPopularity - 20),
        Math.min(100, preferences.avgPopularity + 20)
      ]
    };

    //    
    const likedTrackIds = await TrackLike.findAll({
      attributes: ['trackId'],
      raw: true
    }).then(likes => likes.map(l => l.trackId));

    if (likedTrackIds.length > 0) {
      whereClause.id = { [Op.notIn]: likedTrackIds };
    }

    // 
    const tracks = await Track.findAll({
      where: whereClause,
      order: [
        ['popularity', 'DESC'],
        ['playCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: limit * 2 //    
    });

    // :   ,   
    const diversified = [];
    for (let i = 0; i < tracks.length && diversified.length < limit; i += 2) {
      diversified.push(tracks[i]);
    }

    return diversified;
  }

  /**
   * 📊   
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
   * 🔧  
   */
  configureSources(config) {
    this.sources = { ...this.sources, ...config };
    console.log('✅   ');
  }
}

//  
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
