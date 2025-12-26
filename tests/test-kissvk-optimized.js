/**
 * Тест оптимизированного KissVK сервиса
 */

const { getInstance } = require('./backend/src/services/kissvk.service');

async function testKissVKService() {
  console.log('🧪 Тестирование оптимизированного KissVK сервиса\n');

  const service = getInstance();

  try {
    // Тест 1: Получить топ треки
    console.log('1️⃣ Получение топ 5 треков...');
    const chartResult = await service.getChartTracks(5);
    
    if (chartResult.success) {
      console.log(`✅ Найдено ${chartResult.total} треков`);
      console.log(`✅ Расшифровано: ${chartResult.tracks.filter(t => t.isDecrypted).length}/${chartResult.tracks.length}`);
      
      if (chartResult.tracks.length > 0) {
        const track = chartResult.tracks[0];
        console.log(`\nПервый трек:`);
        console.log(`  📀 ${track.artist} - ${track.title}`);
        console.log(`  ⏱️ Длительность: ${track.duration}с`);
        console.log(`  🔗 Stream URL: ${track.streamUrl ? '✅' : '❌'}`);
      }
    } else {
      console.log(`❌ Ошибка: ${chartResult.error}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Тест 2: Поиск
    console.log('2️⃣ Поиск треков "russian pop"...');
    const searchResult = await service.searchTracks('russian pop', 3);
    
    if (searchResult.success) {
      console.log(`✅ Найдено ${searchResult.total} треков`);
      searchResult.tracks.forEach((track, i) => {
        console.log(`  ${i + 1}. ${track.artist} - ${track.title} ${track.isDecrypted ? '✅' : '❌'}`);
      });
    } else {
      console.log(`❌ Ошибка: ${searchResult.error}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Тест 3: Новые альбомы
    console.log('3️⃣ Получение новых альбомов...');
    const albumsResult = await service.getNewAlbums(3);
    
    if (albumsResult.success) {
      console.log(`✅ Найдено ${albumsResult.total} альбомов`);
      albumsResult.albums.forEach((album, i) => {
        console.log(`  ${i + 1}. ${album.author} - ${album.title}`);
      });
    } else {
      console.log(`❌ Ошибка: ${albumsResult.error}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Тест 4: Статистика
    console.log('4️⃣ Статистика сервиса:');
    const stats = service.getStats();
    console.log(`  Запросов: ${stats.requests}`);
    console.log(`  Cache hits: ${stats.cacheHits}`);
    console.log(`  Cache misses: ${stats.cacheMisses}`);
    console.log(`  Ошибок: ${stats.errors}`);
    console.log(`  Размер кеша: ${stats.cacheSize}`);
    console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);

    console.log('\n✅ Все тесты завершены!\n');

  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
    console.error(error.stack);
  }
}

// Запуск тестов
if (require.main === module) {
  testKissVKService()
    .then(() => {
      console.log('✅ Тестирование успешно завершено');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Тестирование завершилось с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = { testKissVKService };
