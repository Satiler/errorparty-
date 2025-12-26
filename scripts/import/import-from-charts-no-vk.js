/**
 * Импорт из чартов БЕЗ VK Music
 * iTunes API → метаданные
 * Lmusic.kz → полные треки
 * 
 * Используется когда VK недоступен
 */

require('dotenv').config();
const { Sequelize, Op } = require('sequelize');
const { Track } = require('./src/models');
const itunesService = require('./src/services/lastfm.service');
const lmusic = require('./src/modules/music/lmusic-kz.service');

async function importFromChartsNoVK() {
  console.log('\n🎵 === ИМПОРТ ИЗ ЧАРТОВ (БЕЗ VK) ===\n');
  console.log('📋 iTunes API → метаданные популярности');
  console.log('🎶 Lmusic.kz → полные треки\n');
  
  try {
    // 1. Получаем метаданные из iTunes
    console.log('📊 Шаг 1: Получаем чарты из iTunes...\n');
    const charts = await itunesService.getGlobalTop100();
    console.log(`✅ Получено ${charts.length} позиций в чартах\n`);
    
    let imported = 0;
    let skipped = 0;
    let notFound = 0;
    
    // 2. Для каждой позиции ищем ПОЛНЫЙ трек на Lmusic.kz
    for (const [index, chartTrack] of charts.entries()) {
      console.log(`\n[${index + 1}/${charts.length}] ${chartTrack.artist} - ${chartTrack.title}`);
      console.log(`  📍 Позиция: ${chartTrack.position} | Жанр: ${chartTrack.genre}`);
      
      // Проверяем, нет ли уже в базе
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
        console.log(`  ⏭️  Уже в базе (ID: ${existing.id})`);
        
        // Обновляем метаданные из чартов
        await existing.update({
          chartPosition: chartTrack.position,
          popularityScore: (100 - chartTrack.position) * 100,
          trendingDate: new Date(),
          genre: chartTrack.genre || existing.genre,
          coverUrl: chartTrack.image || existing.coverUrl
        });
        
        skipped++;
        continue;
      }
      
      // 3. Ищем ПОЛНЫЙ трек на Lmusic.kz
      const query = `${chartTrack.artist} ${chartTrack.title}`;
      let foundTrack = null;
      
      try {
        console.log('  🔍 Lmusic.kz...');
        const lmusicResults = await lmusic.searchTracks(query, 1);
        if (lmusicResults.length > 0 && lmusicResults[0].streamUrl) {
          foundTrack = lmusicResults[0];
          console.log(`  ✅ Найден на Lmusic.kz`);
        } else {
          console.log('  ⚠️  Не найден на Lmusic');
        }
      } catch (err) {
        console.log(`  ❌ Lmusic ошибка: ${err.message}`);
      }
      
      // 4. Импортируем если нашли ПОЛНЫЙ трек
      if (foundTrack && foundTrack.streamUrl) {
        try {
          const newTrack = await Track.create({
            title: foundTrack.title || chartTrack.title,
            artist: foundTrack.artist || chartTrack.artist,
            streamUrl: foundTrack.streamUrl,
            coverUrl: chartTrack.image || foundTrack.coverUrl,
            genre: chartTrack.genre,
            chartPosition: chartTrack.position,
            popularityScore: (100 - chartTrack.position) * 100,
            trendingDate: new Date(),
            importSource: 'lmusic-kz',
            duration: foundTrack.duration || 180,
            allowDownload: true
          });
          
          console.log(`  💾 Импортирован (ID: ${newTrack.id})`);
          imported++;
        } catch (err) {
          console.log(`  ❌ Ошибка сохранения: ${err.message}`);
          notFound++;
        }
      } else {
        console.log('  ❌ Не найден');
        notFound++;
      }
      
      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Итоги
    console.log('\n\n📊 === ИТОГИ ИМПОРТА ===\n');
    console.log(`✅ Импортировано: ${imported}`);
    console.log(`⏭️  Уже были: ${skipped}`);
    console.log(`❌ Не найдено: ${notFound}`);
    console.log(`📈 Покрытие: ${Math.round((imported + skipped) / charts.length * 100)}%\n`);
    
    console.log('📊 Источник: Lmusic.kz\n');
    console.log('✅ Импорт завершен!\n');
    
    return {
      imported,
      skipped,
      notFound,
      total: charts.length
    };
    
  } catch (error) {
    console.error('❌ Ошибка импорта:', error);
    throw error;
  }
}

// Запуск
if (require.main === module) {
  importFromChartsNoVK()
    .then(() => {
      console.log('🎉 Готово!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { importFromChartsNoVK };
