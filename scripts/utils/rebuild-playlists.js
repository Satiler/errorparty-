/**
 * Rebuild Playlists from Loaded Tracks
 * Пересоздаёт все плейлисты на основе загруженных треков (1000+)
 */
const { Playlist, PlaylistTrack, Track, Album, User } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function rebuildPlaylists() {
  console.log('🔄 Starting playlist rebuild with 1000+ tracks...\n');
  
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
    
    // Get all tracks
    const allTracks = await Track.findAll({ 
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
    const kissVKTracks = allTracks.filter(t => t.provider === 'kissvk').slice(0, 50);
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
    const newTracks = allTracks.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
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
    const lmusicTracks = allTracks.filter(t => t.provider === 'lmusic').slice(0, 50);
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

    console.log('\n' + '='.repeat(50));
    console.log('✅ PLAYLIST REBUILD COMPLETE!');
    console.log('='.repeat(50));
    console.log(`\n📊 Statistics:`);
    console.log(`   Total Playlists Created: ${playlists.length}`);
    console.log(`   Total Tracks Available: ${allTracks.length}`);
    console.log(`   - KissVK: ${allTracks.filter(t => t.provider === 'kissvk').length}`);
    console.log(`   - Lmusic: ${allTracks.filter(t => t.provider === 'lmusic').length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error rebuilding playlists:', error);
    process.exit(1);
  }
}

rebuildPlaylists();
