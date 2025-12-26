/**
 * Автоматический импорт топ-хитов из разных источников
 * Запуск: node import-top-hits.js
 * Можно добавить в cron для ежедневного обновления
 */

require('dotenv').config();
const musicDiscoveryService = require('./src/services/music-discovery.service');
const musifyService = require('./src/services/musify.service');
const { Track, Playlist, PlaylistTrack, User } = require('./src/models');
const { Op } = require('sequelize');

async function importFromItunes() {
  console.log('🎵 === ИМПОРТ ИЗ ITUNES CHARTS ===\n');
  
  try {
    const result = await musicDiscoveryService.importGlobalTop100();
    console.log(`✅ iTunes: ${result.imported} новых, ${result.skipped} обновлено`);
    return result;
  } catch (error) {
    console.error('❌ Ошибка импорта iTunes:', error.message);
    return { imported: 0, skipped: 0, notFound: 0 };
  }
}

async function importFromMusify() {
  console.log('\n🎵 === ИМПОРТ ТОП-ХИТОВ ИЗ MUSIFY ===\n');
  
  try {
    const topTracks = await musifyService.getTopHits(50);
    console.log(`📊 Получено ${topTracks.length} топ-треков из Musify\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const [index, musifyTrack] of topTracks.entries()) {
      console.log(`[${index + 1}/${topTracks.length}] ${musifyTrack.artist} - ${musifyTrack.title}`);
      
      try {
        // Проверяем, нет ли уже в базе
        const existing = await Track.findOne({
          where: {
            [Op.or]: [
              { streamUrl: musifyTrack.streamUrl },
              {
                [Op.and]: [
                  { title: { [Op.iLike]: musifyTrack.title } },
                  { artist: { [Op.iLike]: musifyTrack.artist } }
                ]
              }
            ]
          }
        });

        if (existing) {
          console.log(`  ⏭️  Уже в базе (ID: ${existing.id})`);
          
          // Обновляем популярность
          await existing.update({
            popularityScore: (50 - index) * 100, // Чем выше в топе, тем больше score
            chartPosition: musifyTrack.position || index + 1,
            trendingDate: new Date(),
            importSource: existing.importSource || 'musify-top'
          });
          
          skipped++;
          continue;
        }

        // Импортируем новый трек
        const newTrack = await Track.create({
          title: musifyTrack.title,
          artist: musifyTrack.artist,
          streamUrl: musifyTrack.streamUrl,
          downloadUrl: musifyTrack.downloadUrl,
          coverUrl: musifyTrack.coverUrl,
          popularityScore: (50 - index) * 100,
          chartPosition: musifyTrack.position || index + 1,
          trendingDate: new Date(),
          importSource: 'musify-top',
          playCountExternal: 0
        });

        console.log(`  ✅ Импортирован (ID: ${newTrack.id})`);
        imported++;

      } catch (error) {
        console.log(`  ❌ Ошибка: ${error.message}`);
        errors++;
      }

      // Задержка для предотвращения перегрузки
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n📊 Итоги Musify: ${imported} новых, ${skipped} обновлено, ${errors} ошибок`);
    return { imported, skipped, errors };

  } catch (error) {
    console.error('❌ Ошибка импорта Musify:', error.message);
    return { imported: 0, skipped: 0, errors: 1 };
  }
}

async function updateGlobalTopPlaylist() {
  console.log('\n📝 === ОБНОВЛЕНИЕ ПЛЕЙЛИСТА "ТОП-50 МИРОВЫЕ ХИТЫ" ===\n');
  
  try {
    const result = await musicDiscoveryService.updateGlobalTop50Playlist();
    console.log(`✅ Плейлист обновлен: ${result.tracksCount} треков`);
    return result;
  } catch (error) {
    console.error('❌ Ошибка обновления плейлиста:', error.message);
    return { tracksCount: 0 };
  }
}

async function main() {
  console.log('🚀 === АВТОМАТИЧЕСКИЙ ИМПОРТ ТОП-ХИТОВ ===\n');
  console.log(`⏰ Время запуска: ${new Date().toLocaleString('ru-RU')}\n`);

  const stats = {
    itunes: { imported: 0, skipped: 0 },
    musify: { imported: 0, skipped: 0 },
    playlist: { tracksCount: 0 }
  };

  // 1. Импорт из iTunes Charts
  stats.itunes = await importFromItunes();
  
  // 2. Импорт топ-хитов из Musify
  stats.musify = await importFromMusify();
  
  // 3. Обновление плейлиста
  stats.playlist = await updateGlobalTopPlaylist();

  // Итоговая статистика
  console.log('\n\n🎉 === ИМПОРТ ЗАВЕРШЕН ===');
  console.log(`⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}\n`);
  
  console.log('📊 Общая статистика:');
  console.log(`  iTunes: ${stats.itunes.imported} новых, ${stats.itunes.skipped} обновлено`);
  console.log(`  Musify: ${stats.musify.imported} новых, ${stats.musify.skipped} обновлено`);
  console.log(`  Плейлист: ${stats.playlist.tracksCount} треков`);
  console.log(`  Всего импортировано: ${stats.itunes.imported + stats.musify.imported}`);
  
  console.log('\n🌐 Проверьте результат на errorparty.ru/music');

  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 Критическая ошибка:', error);
  process.exit(1);
});
