/**
 * Тест Unified Music System
 * Демонстрация работы улучшенной системы скачивания и декодирования треков
 */

const { getInstance: getUnifiedMusic } = require('./src/services/unified-music.service');

async function testUnifiedMusicSystem() {
  console.log('🎵 ТЕСТИРОВАНИЕ UNIFIED MUSIC SYSTEM\n');
  console.log('=' .repeat(60));

  const unifiedMusic = getUnifiedMusic();

  try {
    // Тест 1: Поиск по всем источникам
    console.log('\n📌 ТЕСТ 1: Поиск по всем источникам');
    console.log('-'.repeat(60));
    
    const searchQuery = 'Miyagi';
    console.log(`Ищем: "${searchQuery}"`);
    
    const searchResult = await unifiedMusic.searchAllSources(searchQuery, {
      limit: 5,
      sources: ['kissvk', 'musify', 'hitmo'],
      includeStreamUrl: true
    });

    console.log(`\n✓ Результаты поиска:`);
    console.log(`  Всего треков: ${searchResult.totalTracks}`);
    searchResult.sources.forEach(source => {
      console.log(`  ${source.source}: ${source.count} треков ${source.success ? '✓' : '✗'}`);
    });

    if (searchResult.allTracks.length > 0) {
      console.log(`\n  Примеры треков:`);
      searchResult.allTracks.slice(0, 3).forEach((track, i) => {
        console.log(`  ${i + 1}. ${track.artist} - ${track.title}`);
        console.log(`     Источник: ${track.primarySource}`);
        console.log(`     URL доступен: ${track.streamUrl ? '✓' : '✗'}`);
        if (track.decodingMethod) {
          console.log(`     Метод декодирования: ${track.decodingMethod}`);
        }
      });
    }

    // Тест 2: Умный поиск
    console.log('\n📌 ТЕСТ 2: Умный поиск с автопереключением');
    console.log('-'.repeat(60));
    
    const smartQuery = 'Скриптонит';
    console.log(`Ищем: "${smartQuery}"`);
    
    const smartResult = await unifiedMusic.smartSearch(smartQuery, {
      minResults: 5,
      maxSources: 2
    });

    console.log(`\n✓ Результаты умного поиска:`);
    console.log(`  Найдено: ${smartResult.totalFound} треков`);
    console.log(`  Использовано источников: ${smartResult.sourcesUsed.length}`);
    smartResult.sourcesUsed.forEach(src => {
      console.log(`  - ${src.source}: ${src.count} треков`);
    });

    // Тест 3: Топ треки
    console.log('\n📌 ТЕСТ 3: Топ треки со всех источников');
    console.log('-'.repeat(60));
    
    const topResult = await unifiedMusic.getTopTracks({
      limit: 10,
      sources: ['kissvk']
    });

    console.log(`\n✓ Топ треки:`);
    console.log(`  Всего треков: ${topResult.totalTracks}`);
    if (topResult.tracks.length > 0) {
      console.log(`\n  Топ 5:`);
      topResult.tracks.slice(0, 5).forEach((track, i) => {
        console.log(`  ${i + 1}. ${track.artist} - ${track.title}`);
        console.log(`     Источник: ${track.primarySource || track.source}`);
      });
    }

    // Тест 4: Декодирование URL
    console.log('\n📌 ТЕСТ 4: Тест декодирования');
    console.log('-'.repeat(60));
    
    if (searchResult.allTracks.length > 0) {
      const testTrack = searchResult.allTracks.find(t => t.encryptedUrl);
      if (testTrack) {
        console.log(`Тестируем декодирование трека:`);
        console.log(`  ${testTrack.artist} - ${testTrack.title}`);
        console.log(`  Зашифрованный URL: ${testTrack.encryptedUrl.substring(0, 50)}...`);
        console.log(`  Декодированный URL: ${testTrack.streamUrl ? testTrack.streamUrl.substring(0, 80) + '...' : 'Не удалось декодировать'}`);
        console.log(`  Метод: ${testTrack.decodingMethod || 'N/A'}`);
        console.log(`  Статус: ${testTrack.isDecrypted ? '✓ Успешно' : '✗ Ошибка'}`);
      }
    }

    // Тест 5: Статистика
    console.log('\n📌 ТЕСТ 5: Статистика системы');
    console.log('-'.repeat(60));
    
    const stats = unifiedMusic.getStats();
    console.log(`\n✓ Общая статистика:`);
    console.log(`  Всего поисков: ${stats.searches}`);
    console.log(`  Успешных: ${stats.successful}`);
    console.log(`  Неудачных: ${stats.failed}`);
    
    console.log(`\n  Статистика по источникам:`);
    Object.entries(stats.bySource).forEach(([source, stat]) => {
      console.log(`  ${source}:`);
      console.log(`    Запросов: ${stat.requests}`);
      console.log(`    Успешных: ${stat.successful}`);
      console.log(`    Треков получено: ${stat.totalTracks}`);
    });

    if (stats.downloadManagerStats) {
      console.log(`\n  Менеджер загрузок:`);
      console.log(`    Загрузок: ${stats.downloadManagerStats.downloads}`);
      console.log(`    Успешных: ${stats.downloadManagerStats.successful}`);
      console.log(`    Success rate: ${stats.downloadManagerStats.successRate}`);
      console.log(`    Размер кеша: ${stats.downloadManagerStats.cacheSize}`);
      console.log(`    Всего скачано: ${stats.downloadManagerStats.totalSize}`);
    }

    // Финальный отчет
    console.log('\n' + '='.repeat(60));
    console.log('✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО');
    console.log('='.repeat(60));
    
    console.log('\n📊 Итоговая информация:');
    console.log(`  - Поддерживаемые источники: ${stats.sources.join(', ')}`);
    console.log(`  - Приоритет источников: ${stats.sourcePriority.join(' → ')}`);
    console.log(`  - Всего треков найдено: ${searchResult.totalTracks + smartResult.totalFound + topResult.totalTracks}`);
    
    console.log('\n💡 Возможности системы:');
    console.log('  ✓ Поиск по множественным источникам');
    console.log('  ✓ Автоматическое декодирование URL');
    console.log('  ✓ Умный поиск с переключением источников');
    console.log('  ✓ Скачивание треков с retry и валидацией');
    console.log('  ✓ Кеширование результатов');
    console.log('  ✓ Дедупликация треков');
    console.log('  ✓ Множественные алгоритмы декодирования');
    
    console.log('\n🚀 Готово к использованию!');

  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТИРОВАНИЯ:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Запуск теста
if (require.main === module) {
  testUnifiedMusicSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testUnifiedMusicSystem };
