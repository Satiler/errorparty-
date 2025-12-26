/**
 * Умный импорт музыки из нескольких источников
 * - iTunes RSS (мировые чарты)
 * - Яндекс.Музыка (российские чарты)
 * - Фильтрация по жанрам и странам
 * - Импорт новых альбомов
 */

require('dotenv').config();
const smartDiscovery = require('./src/services/smart-discovery.service');

async function main() {
  console.log('🚀 === УМНЫЙ ИМПОРТ МУЗЫКИ ===\n');
  console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}\n`);

  const stats = {
    countries: [],
    genres: [],
    albums: 0,
    totalImported: 0,
    totalUpdated: 0
  };

  try {
    // 1. Импорт топ-треков по странам
    console.log('🌍 === ШАГ 1: ИМПОРТ ПО СТРАНАМ ===\n');
    
    const countries = [
      { code: 'us', name: 'США', limit: 50 },
      { code: 'gb', name: 'Великобритания', limit: 30 },
      { code: 'ru', name: 'Россия', limit: 50 },
      { code: 'de', name: 'Германия', limit: 20 }
    ];

    for (const country of countries) {
      const result = await smartDiscovery.importTopByCountry(
        country.code, 
        country.limit
      );
      
      stats.countries.push(result);
      stats.totalImported += result.imported;
      stats.totalUpdated += result.skipped;
      
      console.log(`✅ ${country.name}: ${result.imported} новых, ${result.skipped} обновлено\n`);
      
      // Задержка между странами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 2. Импорт по жанрам
    console.log('\n🎸 === ШАГ 2: ИМПОРТ ПО ЖАНРАМ ===\n');
    
    const genres = ['pop', 'rock', 'rap', 'electronic', 'indie'];
    
    for (const genre of genres) {
      const result = await smartDiscovery.importTopByGenre(genre, 30);
      
      stats.genres.push(result);
      stats.totalImported += result.imported;
      stats.totalUpdated += result.skipped;
      
      console.log(`✅ ${genre}: ${result.imported} новых, ${result.skipped} обновлено\n`);
      
      // Задержка между жанрами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 3. Импорт новых альбомов
    console.log('\n💿 === ШАГ 3: ИМПОРТ НОВЫХ АЛЬБОМОВ ===\n');
    
    const albumsResult = await smartDiscovery.importNewAlbums();
    stats.albums = albumsResult.importedAlbums;

    // 4. Итоговая статистика
    console.log('\n\n🎉 === ИМПОРТ ЗАВЕРШЕН ===');
    console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}\n`);
    
    console.log('📊 СТАТИСТИКА ПО СТРАНАМ:');
    stats.countries.forEach(c => {
      console.log(`  ${c.country.toUpperCase()}: ${c.imported} новых, ${c.skipped} обновлено`);
    });
    
    console.log('\n📊 СТАТИСТИКА ПО ЖАНРАМ:');
    stats.genres.forEach(g => {
      console.log(`  ${g.genre}: ${g.imported} новых, ${g.skipped} обновлено`);
    });
    
    console.log(`\n💿 Импортировано альбомов: ${stats.albums}`);
    console.log(`\n🎵 Всего импортировано треков: ${stats.totalImported}`);
    console.log(`📝 Всего обновлено треков: ${stats.totalUpdated}`);
    
    console.log('\n🌐 Проверьте результат на errorparty.ru/music');

    process.exit(0);

  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
