const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('./src/config/database');
const { Album, Track, PlaylistTrack } = require('./src/models');
const itunesService = require('./src/services/lastfm.service');
const vkMusicService = require('./src/services/vk-music.service');
const musifyService = require('./src/services/musify.service');

/**
 * Импорт альбомов из iTunes + VK Music (русские)
 */
async function importAlbumsWithRussian() {
  try {
    console.log('\n💿 === ИМПОРТ АЛЬБОМОВ (iTunes + VK Music) ===\n');
    
    const allAlbums = [];
    
    // 1. Импорт из iTunes (международные)
    console.log('🌍 Загрузка международных альбомов из iTunes...\n');
    const countries = [
      { code: 'us', limit: 30 },
      { code: 'gb', limit: 20 },
      { code: 'de', limit: 15 }
    ];
    
    for (const { code, limit } of countries) {
      try {
        const albums = await itunesService.getTopAlbums(code, limit);
        allAlbums.push(...albums.map(a => ({ ...a, source: 'itunes' })));
        console.log(`✅ ${code.toUpperCase()}: ${albums.length} альбомов`);
      } catch (error) {
        console.error(`❌ Ошибка iTunes ${code}:`, error.message);
      }
    }
    
    // 2. Импорт русских альбомов из VK Music
    console.log('\n🇷🇺 Загрузка русских альбомов из VK Music...\n');
    try {
      const vkAlbums = await vkMusicService.getRussianTopAlbums(50);
      allAlbums.push(...vkAlbums.map(a => ({ ...a, source: 'vk-music' })));
      console.log(`✅ VK Music: ${vkAlbums.length} русских альбомов`);
      
      const vkNewReleases = await vkMusicService.getNewRussianReleases(30);
      allAlbums.push(...vkNewReleases.map(a => ({ ...a, source: 'vk-music-new' })));
      console.log(`✅ VK Music: ${vkNewReleases.length} новых релизов`);
    } catch (error) {
      console.error('❌ Ошибка VK Music:', error.message);
    }
    
    console.log(`\n📊 Всего альбомов получено: ${allAlbums.length}`);
    
    // Убираем дубликаты
    const uniqueAlbums = removeDuplicateAlbums(allAlbums);
    console.log(`🔄 Уникальных альбомов: ${uniqueAlbums.length}\n`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const albumData of uniqueAlbums) {
      try {
        // Проверяем существование
        const existingAlbum = await Album.findOne({
          where: {
            artist: { [Op.iLike]: albumData.artist },
            title: { [Op.iLike]: albumData.title }
          }
        });
        
        if (existingAlbum) {
          skippedCount++;
          continue;
        }
        
        // Создаем альбом
        await Album.create({
          artist: albumData.artist,
          title: albumData.title,
          releaseYear: albumData.year || new Date().getFullYear(),
          coverUrl: albumData.coverUrl || null,
          genre: albumData.genre || 'Unknown',
          importSource: albumData.source || 'manual'
        });
        
        const sourceIcon = albumData.source === 'vk-music' || albumData.source === 'vk-music-new' ? '🇷🇺' : '🌍';
        console.log(`✅ ${sourceIcon} ${albumData.artist} - ${albumData.title}`);
        importedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Ошибка: ${albumData.artist} - ${albumData.title}:`, error.message);
      }
    }
    
    console.log('\n💿 === РЕЗУЛЬТАТЫ ИМПОРТА ===');
    console.log(`✅ Импортировано альбомов: ${importedCount}`);
    console.log(`⏭️  Пропущено (уже есть): ${skippedCount}`);
    console.log(`🇷🇺 Русских альбомов: ${uniqueAlbums.filter(a => a.source && a.source.includes('vk')).length}`);
    console.log('');
    
    return { imported: importedCount, skipped: skippedCount };
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  }
}

/**
 * Убрать дубликаты альбомов
 */
function removeDuplicateAlbums(albums) {
  const seen = new Map();
  
  return albums.filter(album => {
    const key = `${album.artist.toLowerCase()}-${album.title.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, true);
    return true;
  });
}

/**
 * Исправить дубликаты треков в плейлистах
 */
async function fixPlaylistDuplicates() {
  try {
    console.log('\n🔧 === ИСПРАВЛЕНИЕ ДУБЛИКАТОВ В ПЛЕЙЛИСТАХ ===\n');
    
    // Найти все PlaylistTrack с дубликатами
    const [duplicates] = await sequelize.query(`
      SELECT "playlistId", "trackId", COUNT(*) as count
      FROM "PlaylistTracks"
      GROUP BY "playlistId", "trackId"
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length === 0) {
      console.log('✅ Дубликаты не найдены!\n');
      return { fixed: 0 };
    }
    
    console.log(`⚠️  Найдено ${duplicates.length} дубликатов\n`);
    
    let fixedCount = 0;
    
    for (const dup of duplicates) {
      try {
        // Получаем все записи для этой комбинации
        const playlistTracks = await PlaylistTrack.findAll({
          where: {
            playlistId: dup.playlistId,
            trackId: dup.trackId
          },
          order: [['createdAt', 'ASC']]
        });
        
        // Оставляем первую, удаляем остальные
        for (let i = 1; i < playlistTracks.length; i++) {
          await playlistTracks[i].destroy();
          fixedCount++;
        }
        
        console.log(`✅ Плейлист ${dup.playlistId}, трек ${dup.trackId}: удалено ${playlistTracks.length - 1} дубликатов`);
        
      } catch (error) {
        console.error(`❌ Ошибка исправления дубликата:`, error.message);
      }
    }
    
    console.log(`\n🔧 === РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЯ ===`);
    console.log(`✅ Удалено дубликатов: ${fixedCount}`);
    console.log('');
    
    return { fixed: fixedCount };
    
  } catch (error) {
    console.error('❌ Ошибка исправления дубликатов:', error);
    throw error;
  }
}

// Запуск
(async () => {
  try {
    await sequelize.query('SELECT 1+1 AS result');
    console.log('✅ Подключение к БД успешно\n');
    
    // 1. Исправляем дубликаты в плейлистах
    await fixPlaylistDuplicates();
    
    // 2. Импортируем альбомы
    await importAlbumsWithRussian();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
  }
})();
