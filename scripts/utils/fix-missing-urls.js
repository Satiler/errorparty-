/**
 * Обновление streamUrl для треков без URL
 * Попробуем найти через Lmusic или Musify
 */
const { Track, Album } = require('./src/models');
const { sequelize } = require('./src/config/database');
const lmusicService = require('./src/modules/music/lmusic-kz.service');
const musifyService = require('./src/services/musify.service');

async function fixMissingStreamUrls() {
  console.log('\n🔧 === ИСПРАВЛЕНИЕ ТРЕКОВ БЕЗ URL ===\n');

  try {
    // Находим треки без streamUrl
    const tracksWithoutUrl = await Track.findAll({
      where: {
        streamUrl: null
      },
      include: [{
        model: Album,
        as: 'album',
        required: false
      }],
      limit: 50 // Первые 50 для теста
    });

    console.log(`📊 Найдено ${tracksWithoutUrl.length} треков без URL\n`);

    let fixed = 0;

    for (const track of tracksWithoutUrl) {
      console.log(`\n🔍 ${track.artist} - ${track.title}`);
      
      try {
        // Пробуем Lmusic
        const query = `${track.artist} ${track.title}`;
        const lmusicResults = await lmusicService.searchTracks(query, 1);
        
        if (lmusicResults && lmusicResults.length > 0 && lmusicResults[0].streamUrl) {
          await track.update({
            streamUrl: lmusicResults[0].streamUrl,
            duration: lmusicResults[0].duration || track.duration,
            source: 'lmusic.kz'
          });
          
          console.log(`  ✅ Найден URL: ${lmusicResults[0].streamUrl.substring(0, 50)}...`);
          fixed++;
          
          // Задержка чтобы не забанили
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Пробуем Musify
        const musifyResults = await musifyService.searchTracks(query, 1);
        
        if (musifyResults && musifyResults.length > 0 && musifyResults[0].streamUrl) {
          await track.update({
            streamUrl: musifyResults[0].streamUrl,
            duration: musifyResults[0].duration || track.duration,
            source: 'musify'
          });
          
          console.log(`  ✅ Найден URL: ${musifyResults[0].streamUrl.substring(0, 50)}...`);
          fixed++;
          
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        console.log(`  ⚠️  URL не найден`);

      } catch (error) {
        console.log(`  ❌ Ошибка: ${error.message}`);
      }
    }

    console.log(`\n\n✅ === ИТОГИ ===`);
    console.log(`📊 Обработано: ${tracksWithoutUrl.length} треков`);
    console.log(`✅ Исправлено: ${fixed} треков\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixMissingStreamUrls();
