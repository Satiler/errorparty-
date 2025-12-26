/**
 * Проверка и удаление треков с encrypted или битыми URL
 */
const { Track, PlaylistTrack } = require('./src/models');
const { Op } = require('sequelize');

async function checkEncryptedTracks() {
  try {
    console.log('🔍 Searching for tracks with encrypted or broken URLs...\n');

    // Найти треки с encrypted: prefix
    const encryptedTracks = await Track.findAll({
      where: {
        streamUrl: {
          [Op.like]: 'encrypted:%'
        }
      },
      attributes: ['id', 'title', 'artist', 'streamUrl', 'isVerified', 'lastChecked'],
      limit: 100
    });

    console.log(`❌ Found ${encryptedTracks.length} tracks with encrypted URLs\n`);

    if (encryptedTracks.length > 0) {
      console.log('Sample of encrypted tracks:');
      for (const track of encryptedTracks.slice(0, 10)) {
        console.log(`  ID ${track.id}: "${track.artist} - ${track.title}"`);
        console.log(`    streamUrl: ${track.streamUrl.substring(0, 50)}...`);
        console.log(`    isVerified: ${track.isVerified}`);
        console.log('');
      }
    }

    // Найти треки которые помечены как неверифицированные
    const unverifiedTracks = await Track.findAll({
      where: {
        isVerified: false
      },
      attributes: ['id', 'title', 'artist', 'streamUrl', 'lastChecked'],
      limit: 100
    });

    console.log(`⚠️ Found ${unverifiedTracks.length} unverified tracks\n`);

    const allProblemTracks = [...new Set([
      ...encryptedTracks.map(t => t.id),
      ...unverifiedTracks.map(t => t.id)
    ])];

    console.log(`📊 Total problem tracks: ${allProblemTracks.length}\n`);

    // Проверить сколько треков в плейлистах
    const playlistsWithProblems = await PlaylistTrack.count({
      where: {
        trackId: {
          [Op.in]: allProblemTracks
        }
      }
    });

    console.log(`⚠️ ${playlistsWithProblems} playlist entries affected\n`);

    console.log('=' .repeat(60));
    console.log('📋 Summary:');
    console.log(`  Encrypted tracks: ${encryptedTracks.length}`);
    console.log(`  Unverified tracks: ${unverifiedTracks.length}`);
    console.log(`  Total problem tracks: ${allProblemTracks.length}`);
    console.log(`  Playlist entries: ${playlistsWithProblems}`);
    console.log('='.repeat(60));

    // Опционально удалить
    const args = process.argv.slice(2);
    if (args.includes('--remove')) {
      console.log('\n⚠️ REMOVING problem tracks from playlists...');
      
      const removedFromPlaylists = await PlaylistTrack.destroy({
        where: {
          trackId: {
            [Op.in]: allProblemTracks
          }
        }
      });
      
      console.log(`✅ Removed ${removedFromPlaylists} playlist entries`);
      
      if (args.includes('--delete')) {
        console.log('\n⚠️ DELETING problem tracks from database...');
        
        const deletedTracks = await Track.destroy({
          where: {
            id: {
              [Op.in]: allProblemTracks
            }
          }
        });
        
        console.log(`✅ Deleted ${deletedTracks} tracks`);
      }
    } else {
      console.log('\n💡 To remove these tracks from playlists: node check-encrypted-tracks.js --remove');
      console.log('💡 To also delete tracks from DB: node check-encrypted-tracks.js --remove --delete');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkEncryptedTracks();
