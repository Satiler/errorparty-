const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('./src/config/database');
const { Album, Track } = require('./src/models');
const itunesService = require('./src/services/lastfm.service');
const musifyService = require('./src/services/musify.service');
const hitmoService = require('./src/services/hitmo.service');

/**
 * Импорт топ-альбомов из iTunes RSS
 */
async function importAlbumsFromItunes() {
  try {
    console.log('\n💿 === ИМПОРТ АЛЬБОМОВ ИЗ iTunes RSS ===\n');
    
    // Получаем топ-альбомы из разных стран
    const countries = [
      { code: 'us', limit: 50 },
      { code: 'gb', limit: 30 },
      { code: 'de', limit: 20 },
      { code: 'ru', limit: 20 }
    ];
    
    const allAlbums = [];
    
    for (const { code, limit } of countries) {
      try {
        const albums = await itunesService.getTopAlbums(code, limit);
        allAlbums.push(...albums);
        console.log(`✅ ${code.toUpperCase()}: ${albums.length} альбомов`);
      } catch (error) {
        console.error(`❌ Ошибка загрузки из ${code}:`, error.message);
      }
    }
    
    console.log(`\n📊 Всего альбомов получено: ${allAlbums.length}`);
    
    // Убираем дубликаты
    const uniqueAlbums = itunesService.removeDuplicateAlbums(allAlbums);
    console.log(`🔄 Уникальных альбомов: ${uniqueAlbums.length}\n`);
    
    let importedCount = 0;
    let skippedCount = 0;
    let tracksFoundCount = 0;
    
    for (const albumData of uniqueAlbums) {
      try {
        // Проверяем, существует ли альбом
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
        const newAlbum = await Album.create({
          artist: albumData.artist,
          title: albumData.title,
          releaseYear: albumData.year,
          coverUrl: albumData.coverUrl,
          genre: albumData.genre,
          importSource: 'itunes-charts'
        });
        
        console.log(`✅ Альбом создан: ${albumData.artist} - ${albumData.title}`);
        importedCount++;
        
        // Пытаемся найти треки альбома в базе
        const foundTracks = await Track.findAll({
          where: {
            artist: { [Op.iLike]: `%${albumData.artist}%` },
            [Op.or]: [
              { album: { [Op.iLike]: `%${albumData.title}%` } },
              { title: { [Op.iLike]: `%${albumData.title}%` } }
            ]
          },
          limit: 20
        });
        
        // Привязываем найденные треки к альбому
        if (foundTracks.length > 0) {
          for (const track of foundTracks) {
            await track.update({ albumId: newAlbum.id });
          }
          tracksFoundCount += foundTracks.length;
          console.log(`   🎵 Найдено треков: ${foundTracks.length}`);
        }
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Ошибка импорта альбома ${albumData.artist} - ${albumData.title}:`, error.message);
      }
    }
    
    console.log('\n💿 === РЕЗУЛЬТАТЫ ИМПОРТА ===');
    console.log(`✅ Импортировано альбомов: ${importedCount}`);
    console.log(`⏭️  Пропущено (уже есть): ${skippedCount}`);
    console.log(`🎵 Найдено треков в базе: ${tracksFoundCount}`);
    console.log('');
    
    return {
      imported: importedCount,
      skipped: skippedCount,
      tracksFound: tracksFoundCount
    };
    
  } catch (error) {
    console.error('❌ Критическая ошибка импорта альбомов:', error);
    throw error;
  }
}

/**
 * Импорт треков из популярных альбомов
 */
async function importTracksFromAlbums(limit = 10) {
  try {
    console.log('\n🎵 === ИМПОРТ ТРЕКОВ ИЗ АЛЬБОМОВ ===\n');
    
    // Получаем альбомы без треков
    const albums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit
    });
    
    let tracksImported = 0;
    
    for (const album of albums) {
      if (album.tracks && album.tracks.length > 0) {
        console.log(`⏭️  ${album.artist} - ${album.title} (треки уже есть)`);
        continue;
      }
      
      console.log(`🔍 Ищем треки: ${album.artist} - ${album.title}`);
      
      // Поиск на musify.club
      try {
        const musifyResults = await musifyService.getTopHits(20);
        
        // Фильтруем по исполнителю
        const relevantTracks = musifyResults.filter(track => 
          track.artist.toLowerCase().includes(album.artist.toLowerCase()) ||
          album.artist.toLowerCase().includes(track.artist.toLowerCase())
        );
        
        if (relevantTracks.length > 0) {
          console.log(`   💚 musify.club: найдено ${relevantTracks.length} треков`);
          
          for (const trackData of relevantTracks.slice(0, 10)) {
            try {
              const [track, created] = await Track.findOrCreate({
                where: {
                  artist: { [Op.iLike]: trackData.artist },
                  title: { [Op.iLike]: trackData.title }
                },
                defaults: {
                  ...trackData,
                  albumId: album.id,
                  album: album.title,
                  genre: album.genre
                }
              });
              
              if (!created && !track.albumId) {
                await track.update({ albumId: album.id });
              }
              
              if (created) tracksImported++;
              
            } catch (error) {
              console.error(`   ❌ Ошибка сохранения трека:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error(`   ❌ musify.club error:`, error.message);
      }
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ Импортировано треков: ${tracksImported}\n`);
    return { tracksImported };
    
  } catch (error) {
    console.error('❌ Ошибка импорта треков:', error);
    throw error;
  }
}

// Запуск
(async () => {
  try {
    // Простая проверка подключения
    await sequelize.query('SELECT 1+1 AS result');
    console.log('✅ Подключение к БД успешно\n');
    
    // Импортируем альбомы
    const albumResults = await importAlbumsFromItunes();
    
    // Если импортированы новые альбомы, пытаемся найти треки
    if (albumResults.imported > 0) {
      console.log('\n⏳ Пауза 2 секунды перед поиском треков...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await importTracksFromAlbums(Math.min(albumResults.imported, 20));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
  }
})();
