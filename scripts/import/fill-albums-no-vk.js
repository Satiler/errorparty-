/**
 * Заполнение альбомов БЕЗ VK - только Lmusic + Musify
 */

const { Album, Track } = require('./src/models');
const { Op } = require('sequelize');
const lmusicService = require('./src/modules/music/lmusic-kz.service');
const musifyService = require('./src/services/musify.service');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fillAlbumsDirectly(limit = 30) {
  console.log('\n🎵 === ЗАПОЛНЕНИЕ АЛЬБОМОВ (LMUSIC + MUSIFY) ===\n');
  
  try {
    const emptyAlbums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false
      }],
      where: {
        '$tracks.id$': null
      },
      limit
    });

    console.log(`📊 Пустых альбомов: ${emptyAlbums.length}\n`);

    let stats = { processed: 0, filled: 0, failed: 0, totalTracks: 0 };

    for (const album of emptyAlbums) {
      stats.processed++;
      console.log(`\n[${stats.processed}/${emptyAlbums.length}] 📀 ${album.artist} - ${album.title}`);

      const query = `${album.artist} ${album.title}`;
      console.log(`  🔍 "${query}"`);

      let foundTracks = [];

      // Lmusic
      try {
        const results = await lmusicService.searchTracks(query, 15);
        if (results && results.length > 0) {
          console.log(`    ✅ Lmusic: ${results.length} треков`);
          foundTracks = results.filter(t => t.streamUrl && t.artist && t.title);
        }
      } catch (e) {
        console.log(`    ⚠️  Lmusic: ${e.message}`);
      }

      await sleep(1000);

      // Musify если Lmusic не помог
      if (foundTracks.length === 0) {
        try {
          const results = await musifyService.searchTracks(query, 15);
          if (results && results.length > 0) {
            console.log(`    ✅ Musify: ${results.length} треков`);
            foundTracks = results.filter(t => t.streamUrl && t.artist && t.title);
          }
        } catch (e) {
          console.log(`    ⚠️  Musify: ${e.message}`);
        }
      }

      if (foundTracks.length > 0) {
        // Сохраняем треки
        const tracksToCreate = foundTracks.slice(0, 12).map((t, idx) => ({
          title: t.title,
          artist: t.artist,
          duration: t.duration,
          streamUrl: t.streamUrl,
          sourceType: t.source || 'lmusic.kz',
          albumId: album.id,
          trackNumber: idx + 1
        }));

        await Track.bulkCreate(tracksToCreate, { ignoreDuplicates: true });
        
        stats.filled++;
        stats.totalTracks += tracksToCreate.length;
        console.log(`    💾 Добавлено ${tracksToCreate.length} треков`);
      } else {
        stats.failed++;
        console.log(`    ❌ Треки не найдены`);
      }

      await sleep(1500);
    }

    console.log('\n\n📊 === ИТОГИ ===');
    console.log(`Обработано: ${stats.processed}`);
    console.log(`Заполнено: ${stats.filled}`);
    console.log(`Не найдено: ${stats.failed}`);
    console.log(`Всего треков: ${stats.totalTracks}`);
    console.log(`Среднее: ${stats.filled > 0 ? Math.round(stats.totalTracks / stats.filled) : 0} треков/альбом`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  }
}

const limit = process.argv[2] ? parseInt(process.argv[2]) : 30;
fillAlbumsDirectly(limit);
