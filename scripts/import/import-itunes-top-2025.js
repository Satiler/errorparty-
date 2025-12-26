/**
 * Импорт популярных альбомов iTunes 2025 с KissVK
 * Поиск по запросам: "itunes top 100 2025", "best albums 2025", "top songs 2025"
 */

const { Track } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

const kissvk = new KissVKLightweightService();

// Поисковые запросы для поиска популярных альбомов 2025
const searchQueries = [
  'itunes top 100 2025',
  'best albums 2025',
  'top songs 2025',
  'top hits 2025',
  'billboard hot 100 2025',
  'spotify top 2025',
  'apple music top 2025',
  'popular albums 2025',
  'new albums 2025',
  'chart toppers 2025'
];

// Список обработанных альбомов (чтобы избежать дублирования)
const processedAlbums = new Set();

/**
 * Сохранить треки в базу данных
 */
async function saveTracks(tracks) {
  let savedCount = 0;
  let skippedCount = 0;

  for (const track of tracks) {
    try {
      // Проверяем, существует ли трек с таким же названием и исполнителем
      const existing = await Track.findOne({
        where: {
          title: track.title,
          artist: track.artist
        }
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Создаем новый трек
      await Track.create({
        title: track.title,
        artist: track.artist,
        duration: track.duration || 0,
        coverUrl: track.coverUrl || null,
        streamUrl: track.streamUrl,
        metadata: {
          source: 'kissvk',
          imported: new Date().toISOString(),
          vkId: track.id
        }
      });

      savedCount++;
    } catch (error) {
      console.error(`   ❌ Ошибка сохранения трека "${track.title}":`, error.message);
    }
  }

  return { saved: savedCount, skipped: skippedCount };
}

/**
 * Импортировать треки из одного альбома
 */
async function importAlbum(albumUrl, albumTitle) {
  try {
    console.log(`\n📀 Альбом: ${albumTitle}`);
    console.log(`   URL: ${albumUrl}`);

    // Извлекаем треки из альбома
    const result = await kissvk.extractTracks(albumUrl);
    
    if (!result.success || result.tracks.length === 0) {
      console.log(`   ⚠️  Треки не найдены`);
      return { saved: 0, skipped: 0 };
    }

    console.log(`   Найдено треков: ${result.tracks.length}`);

    // Расшифровываем треки
    const decryptedTracks = await kissvk.decryptTracks(result.tracks);
    
    if (!decryptedTracks || decryptedTracks.length === 0) {
      console.log(`   ❌ Ошибка расшифровки треков`);
      return { saved: 0, skipped: 0 };
    }

    console.log(`   Расшифровано: ${decryptedTracks.length}/${result.tracks.length}`);

    // Сохраняем треки в базу
    const saveResult = await saveTracks(decryptedTracks);
    console.log(`   ✅ Добавлено: ${saveResult.saved}, Пропущено: ${saveResult.skipped}`);

    return saveResult;
  } catch (error) {
    console.error(`   ❌ Ошибка импорта альбома "${albumTitle}":`, error.message);
    return { saved: 0, skipped: 0 };
  }
}

/**
 * Основная функция импорта
 */
async function importITunesTop2025() {
  console.log('🎵 ИМПОРТ ПОПУЛЯРНЫХ АЛЬБОМОВ iTunes 2025 С KISSVK');
  console.log('=' .repeat(60));

  let totalSaved = 0;
  let totalSkipped = 0;
  let albumsProcessed = 0;

  try {
    // Проходим по каждому поисковому запросу
    for (const query of searchQueries) {
      console.log(`\n🔍 Поиск: "${query}"`);
      console.log('-'.repeat(60));

      // Выполняем поиск
      const searchResult = await kissvk.searchAlbums(query, 20);

      if (!searchResult.success || searchResult.albums.length === 0) {
        console.log(`   ⚠️  Альбомы не найдены по запросу "${query}"`);
        continue;
      }

      console.log(`   Найдено альбомов: ${searchResult.albums.length}`);

      // Обрабатываем каждый найденный альбом
      for (const album of searchResult.albums) {
        // Пропускаем уже обработанные альбомы
        if (processedAlbums.has(album.url)) {
          console.log(`\n📀 Пропускаем (уже обработан): ${album.title} - ${album.author}`);
          continue;
        }

        processedAlbums.add(album.url);

        // Импортируем альбом
        const result = await importAlbum(
          album.url,
          `${album.title} - ${album.author}${album.year ? ` (${album.year})` : ''}`
        );

        totalSaved += result.saved;
        totalSkipped += result.skipped;
        albumsProcessed++;

        // Проверяем общее количество треков
        const currentCount = await Track.count();
        console.log(`\n📊 Текущее состояние: ${currentCount} треков в базе`);

        // Останавливаемся, если достигли 1000+ треков
        if (currentCount >= 1000) {
          console.log('\n✅ Достигнута цель: 1000+ треков в базе!');
          break;
        }

        // Задержка между альбомами (2 секунды)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Проверяем снова после каждого запроса
      const currentCount = await Track.count();
      if (currentCount >= 1000) {
        console.log('\n✅ Достигнута цель: 1000+ треков в базе!');
        break;
      }

      // Задержка между запросами (3 секунды)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Финальная статистика
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`Обработано альбомов: ${albumsProcessed}`);
    console.log(`Уникальных альбомов: ${processedAlbums.size}`);
    console.log(`Новых треков добавлено: ${totalSaved}`);
    console.log(`Дубликатов пропущено: ${totalSkipped}`);
    
    const finalCount = await Track.count();
    console.log(`\n🎵 Всего треков в базе: ${finalCount}`);
    
    // Статистика KissVK сервиса
    const stats = kissvk.getStats();
    console.log(`\n📈 Статистика KissVK:`);
    console.log(`   Запросов выполнено: ${stats.requests}`);
    console.log(`   Кэш-попаданий: ${stats.cacheHits}`);
    console.log(`   Кэш-промахов: ${stats.cacheMisses}`);
    console.log(`   Hit Rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);

    console.log('\n✨ Импорт завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Критическая ошибка импорта:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запускаем импорт
importITunesTop2025();
