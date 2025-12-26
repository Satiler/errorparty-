#!/usr/bin/env node

/**
 * МАССИВНЫЙ импорт музыки с lmusic.kz
 * Загружает МАКСИМУМ треков со ВСЕХ страниц каждого жанра
 */

const lmusicKzService = require('./src/modules/music/lmusic-kz.service');
const { Track } = require('./src/models');

const genres = [
  { name: 'Pop', slug: 'pop-music', pages: 50 },
  { name: 'Rock', slug: 'rock', pages: 20 },
  { name: 'Hip-Hop', slug: 'rap', pages: 20 },
  { name: 'Chanson', slug: 'chanson', pages: 20 },
  { name: 'Electronic', slug: 'electronic', pages: 30 },
  { name: 'Dance', slug: 'dance', pages: 30 },
  { name: 'Folk', slug: 'folk', pages: 20 },
  { name: 'Jazz', slug: 'jazz', pages: 20 },
  { name: 'Classical', slug: 'classical', pages: 20 },
  { name: 'Blues', slug: 'blues', pages: 20 },
  { name: 'Reggae', slug: 'reggae', pages: 20 },
  { name: 'Metal', slug: 'metal', pages: 20 },
  { name: 'Country', slug: 'country', pages: 15 },
  { name: 'Soul', slug: 'soul', pages: 15 },
  { name: 'Funk', slug: 'funk', pages: 15 },
  { name: 'R&B', slug: 'rnb', pages: 15 },
  { name: 'Indie', slug: 'indie', pages: 15 },
  { name: 'Alternative', slug: 'alternative', pages: 15 },
  { name: 'Punk', slug: 'punk', pages: 10 },
  { name: 'Disco', slug: 'disco', pages: 10 }
];

const languages = ['rus', 'kz'];

async function importGenreAllPages(genreName, genreSlug, language, maxPages) {
  console.log(`\n📂 Импорт ${genreName} (${language}) - загрузка ${maxPages} страниц...`);
  
  let totalImported = 0;
  let totalSkipped = 0;
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      console.log(`  📄 Страница ${page}/${maxPages}...`);
      const tracks = await lmusicKzService.parseGenrePage(genreSlug, language, page);
      
      if (tracks.length === 0) {
        console.log(`  ⚠️  Страница ${page} пуста, останавливаем загрузку`);
        break;
      }
      
      console.log(`  ✅ Найдено ${tracks.length} треков на странице ${page}`);
      
      let imported = 0;
      let skipped = 0;
      
      for (const track of tracks) {
        try {
          const externalId = `lmusic_${track.id}`;
          const existing = await Track.findOne({
            where: { externalId }
          });
          
          if (existing) {
            skipped++;
            continue;
          }
          
          await Track.create({
            title: track.title,
            artist: track.artist,
            genre: genreName,
            duration: track.duration || 0,
            externalId,
            externalSource: 'lmusic.kz',
            fileUrl: track.downloadUrl,
            streamUrl: track.streamUrl || track.downloadUrl,
            coverUrl: track.coverUrl,
            metadata: {
              source: 'lmusic.kz',
              language,
              page
            }
          });
          
          imported++;
          process.stdout.write('.');
        } catch (error) {
          console.error(`\n  ❌ Ошибка импорта трека ${track.title}:`, error.message);
        }
      }
      
      totalImported += imported;
      totalSkipped += skipped;
      
      console.log(`\n  📊 Страница ${page}: +${imported} новых, пропущено ${skipped}`);
      
      // Задержка между страницами
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ❌ Ошибка загрузки страницы ${page}:`, error.message);
    }
  }
  
  return { imported: totalImported, skipped: totalSkipped };
}

async function main() {
  console.log('🚀 МАССИВНЫЙ импорт музыки с Lmusic.kz');
  console.log('============================================================\n');
  
  const stats = {};
  let grandTotalImported = 0;
  let grandTotalSkipped = 0;
  
  for (const genre of genres) {
    stats[genre.name] = { imported: 0, skipped: 0 };
    
    for (const language of languages) {
      const result = await importGenreAllPages(genre.name, genre.slug, language, genre.pages);
      stats[genre.name].imported += result.imported;
      stats[genre.name].skipped += result.skipped;
      grandTotalImported += result.imported;
      grandTotalSkipped += result.skipped;
    }
  }
  
  // Итоговая статистика
  console.log('\n============================================================');
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:\n');
  console.log(`✅ Всего импортировано: ${grandTotalImported}`);
  console.log(`⏭️  Всего пропущено: ${grandTotalSkipped}\n`);
  
  console.log('По жанрам:');
  for (const [genre, stat] of Object.entries(stats)) {
    console.log(`  ${genre}: ${stat.imported} новых треков (пропущено: ${stat.skipped})`);
  }
  
  // Общее количество треков
  const totalTracks = await Track.count({
    where: { externalSource: 'lmusic.kz' }
  });
  
  console.log(`\n🎵 Всего треков с lmusic.kz в базе: ${totalTracks}`);
  console.log('\n============================================================');
  console.log('✅ Импорт завершён!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
