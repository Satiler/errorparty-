/**
 * Исправление треков без streamUrl в альбомах
 * Ищет URL через Lmusic.kz и Musify
 */

const { Track, Album } = require('./src/models');
const { Sequelize } = require('sequelize');
const lmusicService = require('./src/modules/music/lmusic-kz.service');
const musifyService = require('./src/services/musify.service');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fixTracksWithoutUrls(limit = 100) {
  console.log('\n🔧 === ИСПРАВЛЕНИЕ ТРЕКОВ БЕЗ URL ===\n');
  
  try {
    // Находим все треки без streamUrl в альбомах
    const brokenTracks = await Track.findAll({
      where: { 
        streamUrl: null,
        albumId: { [Sequelize.Op.ne]: null }
      },
      include: [{
        model: Album,
        as: 'album'
      }],
      limit
    });

    console.log(`📊 Найдено треков без URL: ${brokenTracks.length}\n`);

    if (brokenTracks.length === 0) {
      console.log('✅ Все треки в альбомах имеют URL!');
      process.exit(0);
    }

    let fixed = 0;
    let failed = 0;

    for (const track of brokenTracks) {
      console.log(`\n[${fixed + failed + 1}/${brokenTracks.length}] 🎵 ${track.title}`);
      console.log(`  Исполнитель: ${track.artist}`);
      if (track.album) {
        console.log(`  Альбом: ${track.album.title}`);
      }

      // Формируем поисковый запрос
      let query = track.title;
      
      // Если в названии нет исполнителя, добавляем его
      if (!track.title.toLowerCase().includes(track.artist.toLowerCase().split(' ')[0])) {
        query = `${track.artist} ${track.title}`;
      }

      console.log(`  🔍 Запрос: "${query}"`);

      let streamUrl = null;
      let duration = track.duration;
      let source = null;

      // Пробуем Lmusic
      try {
        const lmusicResults = await lmusicService.searchTracks(query, 3);
        if (lmusicResults && lmusicResults.length > 0) {
          // Берем первый результат с URL
          const match = lmusicResults.find(t => t.streamUrl);
          if (match) {
            streamUrl = match.streamUrl;
            duration = match.duration || duration;
            source = 'lmusic.kz';
            console.log(`  ✅ Lmusic: ${streamUrl.substring(0, 50)}...`);
          }
        }
      } catch (e) {
        console.log(`  ⚠️  Lmusic ошибка: ${e.message}`);
      }

      // Если Lmusic не помог, пробуем Musify
      if (!streamUrl) {
        await sleep(500);
        try {
          const musifyResults = await musifyService.searchTracks(query, 3);
          if (musifyResults && musifyResults.length > 0) {
            const match = musifyResults.find(t => t.streamUrl);
            if (match) {
              streamUrl = match.streamUrl;
              duration = match.duration || duration;
              source = 'musify.club';
              console.log(`  ✅ Musify: ${streamUrl.substring(0, 50)}...`);
            }
          }
        } catch (e) {
          console.log(`  ⚠️  Musify ошибка: ${e.message}`);
        }
      }

      // Обновляем трек если нашли URL
      if (streamUrl) {
        await track.update({
          streamUrl,
          duration,
          sourceType: source,
          externalSource: source
        });
        fixed++;
        console.log(`  💾 Сохранено`);
      } else {
        failed++;
        console.log(`  ❌ URL не найден`);
      }

      // Задержка между запросами
      await sleep(800);
    }

    console.log('\n\n📊 === ИТОГИ ===');
    console.log(`Обработано: ${fixed + failed}`);
    console.log(`Исправлено: ${fixed}`);
    console.log(`Не найдено: ${failed}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;
fixTracksWithoutUrls(limit);
