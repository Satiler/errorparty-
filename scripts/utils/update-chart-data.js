/**
 * Обновляет chartPosition и popularityScore для всех импортированных треков
 */

const itunesService = require('./src/services/lastfm.service');
const { Track } = require('./src/models');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

async function updateChartData() {
  console.log('🔄 === ОБНОВЛЕНИЕ ДАННЫХ ЧАРТОВ ===\n');
  
  try {
    // Получаем текущий топ из iTunes
    const topTracks = await itunesService.getGlobalTop100();
    console.log(`📊 Получено ${topTracks.length} треков из iTunes Charts\n`);
    
    let updated = 0;
    let notFound = 0;
    
    for (const chartTrack of topTracks) {
      // Ищем трек в базе
      const existing = await Track.findOne({
        where: {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('artist')),
              Sequelize.fn('LOWER', chartTrack.artist)
            ),
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('title')),
              Sequelize.fn('LOWER', chartTrack.title)
            )
          ]
        }
      });
      
      if (existing) {
        await existing.update({
          popularityScore: (100 - chartTrack.position) * 100,
          chartPosition: chartTrack.position,
          trendingDate: new Date(),
          importSource: 'itunes-global',
          genre: chartTrack.genre || existing.genre
        });
        
        console.log(`✅ [${chartTrack.position}] ${chartTrack.artist} - ${chartTrack.title} (ID: ${existing.id})`);
        updated++;
      } else {
        console.log(`❌ [${chartTrack.position}] ${chartTrack.artist} - ${chartTrack.title} - не найден`);
        notFound++;
      }
    }
    
    console.log(`\n📊 === ИТОГИ ===`);
    console.log(`✅ Обновлено: ${updated}`);
    console.log(`❌ Не найдено: ${notFound}`);
    
    // Проверка результата
    const tracksWithCharts = await Track.count({
      where: {
        chartPosition: { [Op.ne]: null }
      }
    });
    
    console.log(`\n🎵 Всего треков с chartPosition в базе: ${tracksWithCharts}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

updateChartData();
