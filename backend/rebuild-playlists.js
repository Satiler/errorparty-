/**
 * Rebuild Playlists from Loaded Tracks
 * Пересоздаёт все плейлисты на основе загруженных треков
 * ОБНОВЛЕНО: Использует умные алгоритмы из SmartPlaylistGenerator
 */
const { Playlist, PlaylistTrack, Track, Album, User } = require('./src/models');
const { sequelize } = require('./src/core/database');
const { Op } = require('sequelize');
const smartPlaylistGenerator = require('./src/services/smart-playlist-generator.service');

async function rebuildPlaylists() {
  console.log('🔄 Starting playlist rebuild...\n');
  
  try {
    // Get or create system user for editorial playlists
    let systemUser = await User.findOne({ where: { username: 'system' } });
    if (!systemUser) {
      systemUser = await User.create({
        username: 'system',
        email: 'system@errorparty.local',
        password: 'system',
        isAdmin: true
      });
      console.log('✅ Created system user for editorial playlists\n');
    }
    
    const SYSTEM_USER_ID = systemUser.id;
    
    // Get all tracks (exclude broken tracks without sources)
    const allTracks = await Track.findAll({ 
      where: {
        [Op.or]: [
          { streamUrl: { [Op.ne]: null } },
          { filePath: { [Op.like]: 'http%' } },
          { 
            [Op.and]: [
              { filePath: { [Op.ne]: null } },
              { filePath: { [Op.notLike]: '/uploads/%' } }
            ]
          }
        ]
      },
      include: [{
        model: Album,
        as: 'album',
        attributes: ['id', 'coverUrl']
      }],
      order: [['playCount', 'DESC'], ['createdAt', 'DESC']]
    });

    console.log(`📊 Total tracks available: ${allTracks.length}`);

    // Clear existing editorial playlists
    await Playlist.destroy({ where: { type: 'editorial' } });
    console.log('🗑️ Cleared old editorial playlists\n');

    const playlists = [];

    // 1. Top 100 Most Popular
    console.log('📀 Creating: Top 100 Most Popular...');
    const top100 = allTracks.slice(0, 100);
    const topPlaylist = await Playlist.create({
      userId: SYSTEM_USER_ID,
      name: 'Топ 100 Треков',
      description: 'Самые популярные треки платформы',
      type: 'editorial',
      isPublic: true,
      coverPath: null,
      metadata: JSON.stringify({ priority: 1 })
    });

    for (let i = 0; i < top100.length; i++) {
      await PlaylistTrack.create({
        playlistId: topPlaylist.id,
        trackId: top100[i].id,
        position: i + 1
      });
    }
    playlists.push(topPlaylist);
    console.log(`✅ Created: ${topPlaylist.name} (${top100.length} tracks)\n`);

    // 2. KissVK Best Hits
    console.log('📀 Creating: KissVK Best Hits...');
    const kissVKTracks = allTracks.filter(t => t.source === 'kissvk').slice(0, 50);
    if (kissVKTracks.length > 0) {
      const kissVKPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: 'KissVK Хиты',
        description: 'Лучшие треки от KissVK',
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 2 })
      });

      for (let i = 0; i < kissVKTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: kissVKPlaylist.id,
          trackId: kissVKTracks[i].id,
          position: i + 1
        });
      }
      playlists.push(kissVKPlaylist);
      console.log(`✅ Created: ${kissVKPlaylist.name} (${kissVKTracks.length} tracks)\n`);
    }

    // 3. New Tracks (Latest Added)
    console.log('📀 Creating: New Arrivals...');
    const newTracks = [...allTracks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    const newPlaylist = await Playlist.create({
      userId: SYSTEM_USER_ID,
      name: 'Новые Треки',
      description: 'Недавно добавленные треки',
      type: 'editorial',
      isPublic: true,
      metadata: JSON.stringify({ priority: 3 })
    });

    for (let i = 0; i < newTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: newPlaylist.id,
        trackId: newTracks[i].id,
        position: i + 1
      });
    }
    playlists.push(newPlaylist);
    console.log(`✅ Created: ${newPlaylist.name} (${newTracks.length} tracks)\n`);

    // 4. Lmusic Curated
    console.log('📀 Creating: Lmusic Curated...');
    const lmusicTracks = allTracks.filter(t => t.source === 'lmusic').slice(0, 50);
    if (lmusicTracks.length > 0) {
      const lmusicPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: 'Lmusic Подборка',
        description: 'Отборные треки от Lmusic',
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 4 })
      });

      for (let i = 0; i < lmusicTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: lmusicPlaylist.id,
          trackId: lmusicTracks[i].id,
          position: i + 1
        });
      }
      playlists.push(lmusicPlaylist);
      console.log(`✅ Created: ${lmusicPlaylist.name} (${lmusicTracks.length} tracks)\n`);
    }

    // 5. Energy Hits - High Energy Tracks
    console.log('📀 Creating: Energy Hits...');
    const energyTracks = allTracks
      .filter(t => t.energy >= 0.7 && t.energy <= 1.0)
      .sort((a, b) => b.energy - a.energy)
      .slice(0, 50);
    
    if (energyTracks.length > 0) {
      const energyPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: 'Энергия',
        description: 'Зажигательные треки для активности',
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 5 })
      });

      for (let i = 0; i < energyTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: energyPlaylist.id,
          trackId: energyTracks[i].id,
          position: i + 1
        });
      }
      playlists.push(energyPlaylist);
      console.log(`✅ Created: ${energyPlaylist.name} (${energyTracks.length} tracks)\n`);
    }

    // 6. Chill Mix - Low Energy
    console.log('📀 Creating: Chill Mix...');
    const chillTracks = allTracks
      .filter(t => t.energy >= 0 && t.energy < 0.4)
      .sort((a, b) => a.energy - b.energy)
      .slice(0, 50);
    
    if (chillTracks.length > 0) {
      const chillPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: 'Релакс',
        description: 'Спокойные треки для отдыха',
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 6 })
      });

      for (let i = 0; i < chillTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: chillPlaylist.id,
          trackId: chillTracks[i].id,
          position: i + 1
        });
      }
      playlists.push(chillPlaylist);
      console.log(`✅ Created: ${chillPlaylist.name} (${chillTracks.length} tracks)\n`);
    }

    // ========== НОВЫЕ УМНЫЕ ПОДБОРКИ ==========
    
    // 7. Тренировка
    console.log('📀 Creating: Workout Mix...');
    const workoutResult = await smartPlaylistGenerator.generateWorkoutPlaylist(40);
    if (workoutResult.tracks.length > 0) {
      const workoutPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: workoutResult.name,
        description: workoutResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 7, tags: workoutResult.tags })
      });
      for (let i = 0; i < workoutResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: workoutPlaylist.id,
          trackId: workoutResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(workoutPlaylist);
      console.log(`✅ Created: ${workoutPlaylist.name} (${workoutResult.tracks.length} tracks)\n`);
    }

    // 8. Концентрация
    console.log('📀 Creating: Focus Playlist...');
    const focusResult = await smartPlaylistGenerator.generateFocusPlaylist(50);
    if (focusResult.tracks.length > 0) {
      const focusPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: focusResult.name,
        description: focusResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 8, tags: focusResult.tags })
      });
      for (let i = 0; i < focusResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: focusPlaylist.id,
          trackId: focusResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(focusPlaylist);
      console.log(`✅ Created: ${focusPlaylist.name} (${focusResult.tracks.length} tracks)\n`);
    }

    // 9. Для сна
    console.log('📀 Creating: Sleep Playlist...');
    const sleepResult = await smartPlaylistGenerator.generateSleepPlaylist(30);
    if (sleepResult.tracks.length > 0) {
      const sleepPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: sleepResult.name,
        description: sleepResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 9, tags: sleepResult.tags })
      });
      for (let i = 0; i < sleepResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: sleepPlaylist.id,
          trackId: sleepResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(sleepPlaylist);
      console.log(`✅ Created: ${sleepPlaylist.name} (${sleepResult.tracks.length} tracks)\n`);
    }

    // 10. Вечерний чилл
    console.log('📀 Creating: Evening Chill...');
    const eveningResult = await smartPlaylistGenerator.generateEveningPlaylist(40);
    if (eveningResult.tracks.length > 0) {
      const eveningPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: eveningResult.name,
        description: eveningResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 10, tags: eveningResult.tags })
      });
      for (let i = 0; i < eveningResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: eveningPlaylist.id,
          trackId: eveningResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(eveningPlaylist);
      console.log(`✅ Created: ${eveningPlaylist.name} (${eveningResult.tracks.length} tracks)\n`);
    }

    // 11. Ретро хиты
    console.log('📀 Creating: Retro Hits...');
    const retroResult = await smartPlaylistGenerator.generateRetroPlaylist(50);
    if (retroResult.tracks.length > 0) {
      const retroPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: retroResult.name,
        description: retroResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 11, tags: retroResult.tags })
      });
      for (let i = 0; i < retroResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: retroPlaylist.id,
          trackId: retroResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(retroPlaylist);
      console.log(`✅ Created: ${retroPlaylist.name} (${retroResult.tracks.length} tracks)\n`);
    }

    // 12. Открытия недели
    console.log('📀 Creating: Weekly Discovery...');
    const discoveryResult = await smartPlaylistGenerator.generateWeeklyDiscovery(30);
    if (discoveryResult.tracks.length > 0) {
      const discoveryPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: discoveryResult.name,
        description: discoveryResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 12, tags: discoveryResult.tags })
      });
      for (let i = 0; i < discoveryResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: discoveryPlaylist.id,
          trackId: discoveryResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(discoveryPlaylist);
      console.log(`✅ Created: ${discoveryPlaylist.name} (${discoveryResult.tracks.length} tracks)\n`);
    }

    // 13. Звуковая дорожка дня
    console.log('📀 Creating: Daily Soundtrack...');
    const dailyResult = await smartPlaylistGenerator.generateDailySoundtrack(null, 60);
    if (dailyResult.tracks.length > 0) {
      const dailyPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: dailyResult.name,
        description: dailyResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 13, timeOfDay: dailyResult.timeOfDay })
      });
      for (let i = 0; i < dailyResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: dailyPlaylist.id,
          trackId: dailyResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(dailyPlaylist);
      console.log(`✅ Created: ${dailyPlaylist.name} (${dailyResult.tracks.length} tracks)\n`);
    }

    // 14. Настроение: Веселое
    console.log('📀 Creating: Happy Mood...');
    const happyResult = await smartPlaylistGenerator.generateByMood('happy', 50);
    if (happyResult.tracks.length > 0) {
      const happyPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: happyResult.name,
        description: happyResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 14, mood: 'happy' })
      });
      for (let i = 0; i < happyResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: happyPlaylist.id,
          trackId: happyResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(happyPlaylist);
      console.log(`✅ Created: ${happyPlaylist.name} (${happyResult.tracks.length} tracks)\n`);
    }

    // 15. Настроение: Вечеринка
    console.log('📀 Creating: Party Mood...');
    const partyResult = await smartPlaylistGenerator.generateByMood('party', 50);
    if (partyResult.tracks.length > 0) {
      const partyPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: partyResult.name,
        description: partyResult.description,
        type: 'editorial',
        isPublic: true,
        metadata: JSON.stringify({ priority: 15, mood: 'party' })
      });
      for (let i = 0; i < partyResult.tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: partyPlaylist.id,
          trackId: partyResult.tracks[i].id,
          position: i + 1
        });
      }
      playlists.push(partyPlaylist);
      console.log(`✅ Created: ${partyPlaylist.name} (${partyResult.tracks.length} tracks)\n`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ PLAYLIST REBUILD COMPLETE!');
    console.log('='.repeat(50));
    console.log(`\n📊 Statistics:`);
    console.log(`   Total Playlists Created: ${playlists.length}`);
    console.log(`   Total Tracks Available: ${allTracks.length}`);
    console.log(`   - KissVK: ${allTracks.filter(t => t.source === 'kissvk').length}`);
    console.log(`   - Lmusic: ${allTracks.filter(t => t.source === 'lmusic').length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error rebuilding playlists:', error);
    process.exit(1);
  }
}

rebuildPlaylists();
