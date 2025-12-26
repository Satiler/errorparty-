const { Track } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

const kissvk = new KissVKLightweightService();

// Запросы СТРОГО для зарубежных исполнителей (на английском)
const foreignSearchQueries = [
  'taylor swift',
  'the weeknd',
  'drake',
  'ariana grande',
  'billie eilish',
  'dua lipa',
  'ed sheeran',
  'bruno mars',
  'post malone',
  'travis scott',
  'justin bieber',
  'olivia rodrigo',
  'harry styles',
  'bad bunny',
  'coldplay',
  'imagine dragons',
  'maroon 5',
  'eminem',
  'kendrick lamar',
  'rihanna',
  'adele',
  'lady gaga',
  'katy perry',
  'miley cyrus',
  'selena gomez',
  'shawn mendes',
  'twenty one pilots',
  'sia',
  'onerepublic',
  'macklemore',
  'sam smith',
  'charlie puth',
  'khalid',
  'bebe rexha',
  'doja cat',
  'megan thee stallion',
  'cardi b',
  'nicki minaj',
  'kanye west',
  'beyonce'
];

async function saveTracks(tracks) {
  let added = 0;
  let duplicates = 0;

  for (const track of tracks) {
    try {
      const exists = await Track.findOne({
        where: { 
          title: track.title,
          artist: track.artist
        }
      });

      if (exists) {
        duplicates++;
        continue;
      }

      await Track.create({
        title: track.title,
        artist: track.artist,
        album: track.album || 'Unknown Album',
        coverUrl: track.coverUrl,
        streamUrl: track.streamUrl,
        duration: track.duration || 0,
        genre: track.genre || 'Pop',
        source: 'kissvk'
      });

      added++;
      console.log(`✅ ${track.artist} - ${track.title}`);
    } catch (error) {
      console.error(`❌ Ошибка сохранения "${track.title}":`, error.message);
    }
  }

  return { added, duplicates };
}

async function main() {
  console.log('🌍 Начинаем импорт ЗАРУБЕЖНЫХ хитов с KissVK...\n');

  let totalAdded = 0;
  let totalDuplicates = 0;
  let totalProcessed = 0;
  const processedUrls = new Set();

  for (const query of foreignSearchQueries) {
    try {
      console.log(`\n🔍 Поиск: "${query}"`);
      
      const searchResult = await kissvk.searchAlbums(query, 10);
      
      if (!searchResult.success || !searchResult.albums || searchResult.albums.length === 0) {
        console.log(`⚠️ Ничего не найдено для "${query}"`);
        continue;
      }

      console.log(`📀 Найдено альбомов: ${searchResult.albums.length}`);

      for (const album of searchResult.albums) {
        if (processedUrls.has(album.url)) {
          continue;
        }

        processedUrls.add(album.url);

        try {
          console.log(`\n📀 Обработка: ${album.title} - ${album.author}`);
          
          const result = await kissvk.extractTracks(album.url);
          
          if (!result.success || !result.tracks || result.tracks.length === 0) {
            console.log(`⚠️ Нет треков в альбоме`);
            continue;
          }

          console.log(`🎵 Найдено треков: ${result.tracks.length}`);
          
          const decryptedTracks = await kissvk.decryptTracks(result.tracks);
          
          if (decryptedTracks.length === 0) {
            console.log(`⚠️ Не удалось расшифровать треки`);
            continue;
          }

          console.log(`🔓 Расшифровано: ${decryptedTracks.length}`);

          const { added, duplicates } = await saveTracks(decryptedTracks);
          
          totalAdded += added;
          totalDuplicates += duplicates;
          totalProcessed++;

          console.log(`📊 Добавлено: ${added}, дубликатов: ${duplicates}`);

          // Проверяем текущее количество треков
          const currentCount = await Track.count();
          console.log(`📈 Всего треков в базе: ${currentCount}`);

          // Останавливаемся если добавили достаточно зарубежных треков
          if (totalAdded >= 300) {
            console.log('\n✅ Достигнут лимит в 300 зарубежных треков. Останавливаемся.');
            break;
          }

          // Небольшая задержка между альбомами
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ Ошибка обработки альбома "${album.title}":`, error.message);
        }
      }

      if (totalAdded >= 300) {
        break;
      }

      // Задержка между поисковыми запросами
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`❌ Ошибка поиска "${query}":`, error.message);
    }
  }

  const finalCount = await Track.count();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('='.repeat(50));
  console.log(`✅ Обработано альбомов: ${totalProcessed}`);
  console.log(`✅ Добавлено новых треков: ${totalAdded}`);
  console.log(`⚠️ Пропущено дубликатов: ${totalDuplicates}`);
  console.log(`📀 Всего треков в базе: ${finalCount}`);
  console.log('='.repeat(50));
  console.log('✨ Импорт завершен!');

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
