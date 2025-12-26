/**
 * Проверка треков без валидных источников
 * Находит и опционально удаляет треки без streamUrl, filePath и externalUrl
 */
const { Track, PlaylistTrack, Playlist } = require('./src/models');
const { Op } = require('sequelize');

async function checkInvalidTracks() {
  try {
    console.log('🔍 Searching for tracks without valid sources...\n');

    // Найти треки без streamUrl, filePath и externalUrl
    const invalidTracks = await Track.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { streamUrl: null },
              { streamUrl: '' }
            ]
          },
          {
            [Op.or]: [
              { filePath: null },
              { filePath: '' }
            ]
          },
          {
            [Op.or]: [
              { externalUrl: null },
              { externalUrl: '' }
            ]
          }
        ]
      },
      attributes: ['id', 'title', 'artist', 'streamUrl', 'filePath', 'externalUrl', 'provider', 'isVerified'],
      limit: 100
    });

    console.log(`❌ Found ${invalidTracks.length} tracks without ANY valid source\n`);

    if (invalidTracks.length > 0) {
      console.log('Sample of invalid tracks:');
      for (const track of invalidTracks.slice(0, 10)) {
        console.log(`  ID ${track.id}: "${track.artist} - ${track.title}"`);
        console.log(`    streamUrl: ${track.streamUrl || 'NULL'}`);
        console.log(`    filePath: ${track.filePath || 'NULL'}`);
        console.log(`    externalUrl: ${track.externalUrl || 'NULL'}`);
        console.log(`    provider: ${track.provider || 'NULL'}`);
        console.log('');
      }
    }

    // Проверить сколько треков в плейлистах
    console.log('📊 Checking playlists with invalid tracks...\n');
    
    const playlistsWithInvalidTracks = await PlaylistTrack.findAll({
      where: {
        trackId: {
          [Op.in]: invalidTracks.map(t => t.id)
        }
      },
      include: [{
        model: Playlist,
        as: 'playlist',
        attributes: ['id', 'name', 'type']
      }],
      attributes: ['trackId', 'playlistId']
    });

    const affectedPlaylists = new Map();
    for (const pt of playlistsWithInvalidTracks) {
      const key = pt.playlistId;
      if (!affectedPlaylists.has(key)) {
        affectedPlaylists.set(key, {
          playlist: pt.playlist,
          count: 0
        });
      }
      affectedPlaylists.get(key).count++;
    }

    console.log(`⚠️ ${affectedPlaylists.size} playlists affected:\n`);
    for (const [playlistId, data] of affectedPlaylists.entries()) {
      console.log(`  Playlist ${playlistId}: "${data.playlist.name}" (${data.playlist.type})`);
      console.log(`    Invalid tracks: ${data.count}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 Summary:');
    console.log(`  Total invalid tracks: ${invalidTracks.length}`);
    console.log(`  Tracks in playlists: ${playlistsWithInvalidTracks.length}`);
    console.log(`  Affected playlists: ${affectedPlaylists.size}`);
    console.log('='.repeat(60));

    // Опционально удалить
    const args = process.argv.slice(2);
    if (args.includes('--remove')) {
      console.log('\n⚠️ REMOVING invalid tracks from playlists...');
      
      const removedFromPlaylists = await PlaylistTrack.destroy({
        where: {
          trackId: {
            [Op.in]: invalidTracks.map(t => t.id)
          }
        }
      });
      
      console.log(`✅ Removed ${removedFromPlaylists} playlist entries`);
      
      if (args.includes('--delete')) {
        console.log('\n⚠️ DELETING invalid tracks from database...');
        
        const deletedTracks = await Track.destroy({
          where: {
            id: {
              [Op.in]: invalidTracks.map(t => t.id)
            }
          }
        });
        
        console.log(`✅ Deleted ${deletedTracks} tracks`);
      }
    } else {
      console.log('\n💡 To remove these tracks from playlists: node check-invalid-tracks.js --remove');
      console.log('💡 To also delete tracks from DB: node check-invalid-tracks.js --remove --delete');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkInvalidTracks();
