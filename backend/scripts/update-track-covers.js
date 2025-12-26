#!/usr/bin/env node
/**
 * Скрипт для массового обновления обложек треков
 * 
 * Стратегии:
 * 1. Треки с альбомом → копировать coverUrl из альбома
 * 2. Треки KissVK → попытаться получить coverUrl из источника (если есть API)
 * 3. Остальные → установить placeholder
 * 
 * Использование:
 *   node scripts/update-track-covers.js
 *   node scripts/update-track-covers.js --dry-run
 *   node scripts/update-track-covers.js --source=kissvk
 */

const { Track, Album } = require('../src/models');
const { Op } = require('sequelize');

// Парсинг аргументов
const args = {
  dryRun: process.argv.includes('--dry-run'),
  source: process.argv.find(arg => arg.startsWith('--source='))?.split('=')[1] || null,
  verbose: process.argv.includes('--verbose')
};

async function updateTrackCovers() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  🖼️  Массовое обновление обложек треков');
  console.log('═══════════════════════════════════════════════\n');
  
  if (args.dryRun) {
    console.log('🧪 DRY RUN режим - изменения не будут сохранены\n');
  }
  
  const stats = {
    total: 0,
    fromAlbum: 0,
    placeholder: 0,
    skipped: 0,
    errors: 0
  };

  try {
    // Поиск треков без обложек
    const whereCondition = {
      [Op.or]: [
        { coverUrl: null },
        { coverUrl: '' }
      ]
    };
    
    if (args.source) {
      whereCondition.source = args.source;
      console.log(`🎯 Фильтр по источнику: ${args.source}\n`);
    }

    const tracksWithoutCovers = await Track.findAll({
      where: whereCondition,
      include: [{
        model: Album,
        as: 'album',
        attributes: ['id', 'title', 'coverUrl'],
        required: false
      }],
      order: [['id', 'ASC']]
    });

    stats.total = tracksWithoutCovers.length;
    console.log(`📊 Найдено треков без обложек: ${stats.total}\n`);

    if (stats.total === 0) {
      console.log('✅ Все треки уже имеют обложки!\n');
      return;
    }

    // Обработка треков
    console.log('🔄 Обновление обложек...\n');
    
    for (const track of tracksWithoutCovers) {
      try {
        let newCoverUrl = null;
        let strategy = '';

        // Стратегия 1: Взять обложку из альбома
        if (track.album && track.album.coverUrl) {
          newCoverUrl = track.album.coverUrl;
          strategy = 'from-album';
          stats.fromAlbum++;
        }
        // Стратегия 2: Placeholder (можно добавить получение из API)
        else {
          // Для production можно использовать CDN с placeholder
          // newCoverUrl = 'https://via.placeholder.com/300x300/1f2937/10b981?text=🎵';
          // Пока оставляем null - обложка будет браться из альбома на фронтенде
          strategy = 'placeholder';
          stats.placeholder++;
        }

        // Обновление трека
        if (newCoverUrl && !args.dryRun) {
          await track.update({ coverUrl: newCoverUrl });
        }

        if (args.verbose || stats.fromAlbum % 100 === 0) {
          console.log(`[${stats.fromAlbum + stats.placeholder}/${stats.total}] ` +
            `${strategy.padEnd(15)} | ${track.artist} - ${track.title}`);
        }

      } catch (error) {
        console.error(`❌ Ошибка обновления трека ${track.id}:`, error.message);
        stats.errors++;
      }
    }

    // Финальная статистика
    console.log('\n═══════════════════════════════════════════════');
    console.log('  📊 Статистика обновления');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`✅ Обновлено из альбомов:  ${stats.fromAlbum}`);
    console.log(`⚠️  Placeholder (null):     ${stats.placeholder}`);
    console.log(`❌ Ошибок:                 ${stats.errors}`);
    console.log(`📊 Всего обработано:       ${stats.total}\n`);

    if (args.dryRun) {
      console.log('🧪 DRY RUN - изменения не были сохранены\n');
    } else {
      console.log('💾 Изменения сохранены в базу данных\n');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск
updateTrackCovers()
  .then(() => {
    console.log('✅ Скрипт успешно выполнен\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка выполнения:', error);
    process.exit(1);
  });
