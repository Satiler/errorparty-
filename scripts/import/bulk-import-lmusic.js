#!/usr/bin/env node

/**
 * Массовый импорт музыки с lmusic.kz
 * Загружает по 50 треков каждого жанра
 */

const lmusicKzService = require('./src/modules/music/lmusic-kz.service');
const { Track } = require('./src/models');

const genres = [
  { name: 'Pop', slug: 'pop-music', limit: 100 },
  { name: 'Rock', slug: 'rock', limit: 80 },
  { name: 'Hip-Hop', slug: 'rap', limit: 80 },
  { name: 'Chanson', slug: 'chanson', limit: 60 },
  { name: 'Electronic', slug: 'electronic', limit: 70 },
  { name: 'Dance', slug: 'dance', limit: 70 },
  { name: 'Folk', slug: 'folk', limit: 50 },
  { name: 'Jazz', slug: 'jazz', limit: 50 },
  { name: 'Classical', slug: 'classical', limit: 40 },
  { name: 'Blues', slug: 'blues', limit: 30 },
  { name: 'Reggae', slug: 'reggae', limit: 30 },
  { name: 'Metal', slug: 'metal', limit: 40 }
];

const languages = ['rus', 'kz'];

async function importGenre(genreName, genreSlug, language, limit) {
  console.log(`\n📂 Импорт ${genreName} (${language})...`);
  
  try {
    const tracks = await lmusicKzService.parseGenrePage(genreSlug, language, 1);
    
    if (tracks.length === 0) {
      console.log(`  ⚠️  Нет треков для импорта`);
      return { imported: 0, skipped: 0 };
    }
    
    // Ограничиваем количество
    const tracksToImport = tracks.slice(0, limit);
    console.log(`  📥 Импортируем ${tracksToImport.length} из ${tracks.length} найденных`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const track of tracksToImport) {
      try {
        // Проверяем существование по externalId
        const externalId = `lmusic_${track.id}`;
        const existing = await Track.findOne({
          where: { externalId }
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Создаём трек
        await Track.create({
          title: track.title,
          artist: track.artist,
          album: genreName, // Используем жанр как альбом
          genre: genreName,
          duration: track.duration || 180, // По умолчанию 3 минуты
          fileUrl: track.downloadUrl,
          streamUrl: track.streamUrl,
          coverUrl: track.coverUrl,
          externalSource: 'lmusic.kz',
          externalId: externalId,
          isActive: true
        });
        
        imported++;
        process.stdout.write('.');
        
      } catch (error) {
        console.error(`\n    ❌ Ошибка импорта "${track.title}":`, error.message);
        skipped++;
      }
    }
    
    console.log(`\n  ✅ Импортировано: ${imported}, Пропущено: ${skipped}`);
    return { imported, skipped };
    
  } catch (error) {
    console.error(`  ❌ Ошибка парсинга:`, error.message);
    return { imported: 0, skipped: 0 };
  }
}

async function main() {
  console.log('🚀 Массовый импорт музыки с Lmusic.kz\n');
  console.log('============================================================\n');
  
  const stats = {
    totalImported: 0,
    totalSkipped: 0,
    byGenre: {}
  };
  
  // Импортируем каждый жанр
  for (const genre of genres) {
    for (const language of languages) {
      const result = await importGenre(genre.name, genre.slug, language, Math.floor(genre.limit / 2));
      
      if (!stats.byGenre[genre.name]) {
        stats.byGenre[genre.name] = { imported: 0, skipped: 0 };
      }
      
      stats.byGenre[genre.name].imported += result.imported;
      stats.byGenre[genre.name].skipped += result.skipped;
      stats.totalImported += result.imported;
      stats.totalSkipped += result.skipped;
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n============================================================');
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:\n');
  console.log(`✅ Всего импортировано: ${stats.totalImported}`);
  console.log(`⏭️  Всего пропущено: ${stats.totalSkipped}`);
  console.log('\nПо жанрам:');
  
  for (const [genreName, genreStats] of Object.entries(stats.byGenre)) {
    console.log(`  ${genreName}: ${genreStats.imported} треков`);
  }
  
  // Проверяем финальное количество
  const totalTracks = await Track.count({
    where: { externalSource: 'lmusic.kz' }
  });
  
  console.log(`\n🎵 Всего треков с lmusic.kz в базе: ${totalTracks}`);
  console.log('\n============================================================');
  console.log('✅ Импорт завершён!\n');
  
  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Критическая ошибка:', error);
  process.exit(1);
});
