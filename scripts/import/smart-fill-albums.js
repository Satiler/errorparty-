/**
 * Умное заполнение альбомов треками
 * 
 * Стратегия:
 * 1. VK API (поиск по альбому) - быстро, но может не иметь URL
 * 2. Lmusic.kz (поиск по треку) - для получения streamUrl
 * 3. Musify (резервный) - если Lmusic не нашел
 * 
 * Защита от блокировок:
 * - Умные задержки 2-5 секунд между запросами
 * - Максимум 50 альбомов за раз
 * - Автоматическая остановка при капче
 */

const { Album, Track } = require('./src/models');
const vkService = require('./src/services/vk-music.service');
const lmusicService = require('./src/modules/music/lmusic-kz.service');
const musifyService = require('./src/services/musify.service');

// Умная задержка с рандомизацией
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const smartDelay = () => sleep(2000 + Math.random() * 3000); // 2-5 секунд

async function findTracksForAlbum(album) {
  const query = `${album.artist} ${album.title}`;
  console.log(`\n🔍 Поиск: ${query}`);
  
  const tracks = [];
  
  // Шаг 1: Попробуем VK для получения списка треков
  try {
    console.log('  📱 Поиск в VK...');
    const vkTracks = await vkService.searchTracks(query, 15);
    
    if (vkTracks && vkTracks.length > 0) {
      console.log(`  ✅ VK нашел ${vkTracks.length} треков`);
      
      // Фильтруем треки этого же исполнителя
      const relevantTracks = vkTracks.filter(t => 
        t.artist && t.artist.toLowerCase().includes(album.artist.toLowerCase().split(' ')[0])
      );
      
      if (relevantTracks.length > 0) {
        console.log(`  🎯 Релевантных: ${relevantTracks.length}`);
        
        // Для каждого трека из VK ищем streamUrl
        for (const vkTrack of relevantTracks.slice(0, 10)) {
          await smartDelay();
          
          const trackQuery = `${vkTrack.artist} ${vkTrack.title}`;
          console.log(`    🎵 ${trackQuery}`);
          
          // Сначала Lmusic
          let streamUrl = null;
          let duration = vkTrack.duration || 0;
          let source = 'unknown';
          
          try {
            const lmusicResults = await lmusicService.searchTracks(trackQuery, 1);
            if (lmusicResults && lmusicResults[0]?.streamUrl) {
              streamUrl = lmusicResults[0].streamUrl;
              duration = lmusicResults[0].duration || duration;
              source = 'lmusic.kz';
              console.log(`      ✅ Lmusic: ${streamUrl}`);
            }
          } catch (e) {
            console.log(`      ⚠️  Lmusic: ${e.message}`);
          }
          
          // Если Lmusic не нашел, пробуем Musify
          if (!streamUrl) {
            await smartDelay();
            try {
              const musifyResults = await musifyService.searchTracks(trackQuery, 1);
              if (musifyResults && musifyResults[0]?.streamUrl) {
                streamUrl = musifyResults[0].streamUrl;
                duration = musifyResults[0].duration || duration;
                source = 'musify.club';
                console.log(`      ✅ Musify: ${streamUrl}`);
              }
            } catch (e) {
              console.log(`      ⚠️  Musify: ${e.message}`);
            }
          }
          
          // Если нашли URL, добавляем трек
          if (streamUrl) {
            tracks.push({
              title: vkTrack.title,
              artist: vkTrack.artist,
              duration,
              streamUrl,
              source,
              albumId: album.id
            });
          } else {
            console.log(`      ❌ URL не найден`);
          }
        }
      }
    } else {
      console.log('  ℹ️  VK ничего не нашел');
    }
  } catch (error) {
    console.log(`  ❌ VK ошибка: ${error.message}`);
    
    // Если капча - прерываем
    if (error.message.includes('captcha') || error.message.includes('Captcha')) {
      throw new Error('VK_CAPTCHA_DETECTED');
    }
  }
  
  // Шаг 2: Если VK не помог, ищем напрямую в Lmusic
  if (tracks.length === 0) {
    console.log('  🔄 Прямой поиск в Lmusic...');
    await smartDelay();
    
    try {
      const lmusicTracks = await lmusicService.searchTracks(query, 10);
      if (lmusicTracks && lmusicTracks.length > 0) {
        console.log(`  ✅ Lmusic нашел ${lmusicTracks.length} треков`);
        
        for (const track of lmusicTracks) {
          if (track.streamUrl) {
            tracks.push({
              title: track.title,
              artist: track.artist,
              duration: track.duration,
              streamUrl: track.streamUrl,
              source: 'lmusic.kz',
              albumId: album.id
            });
          }
        }
      }
    } catch (e) {
      console.log(`  ⚠️  Lmusic: ${e.message}`);
    }
  }
  
  return tracks;
}

async function smartFillAlbums(limit = 50) {
  console.log('\n🎵 === УМНОЕ ЗАПОЛНЕНИЕ АЛЬБОМОВ ===');
  console.log(`⚙️  Лимит: ${limit} альбомов`);
  console.log('🛡️  Защита: 2-5 сек задержки + тройная стратегия\n');
  
  try {
    // Находим пустые альбомы
    const allAlbums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false,
        attributes: ['id']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    const emptyAlbums = allAlbums.filter(album => !album.tracks || album.tracks.length === 0);
    console.log(`📊 Найдено пустых альбомов: ${emptyAlbums.length}`);
    
    if (emptyAlbums.length === 0) {
      console.log('✅ Все альбомы уже заполнены!');
      return;
    }
    
    const toProcess = emptyAlbums.slice(0, limit);
    console.log(`🎯 Будет обработано: ${toProcess.length}\n`);
    
    let stats = {
      processed: 0,
      successful: 0,
      totalTracks: 0,
      failed: 0
    };
    
    for (const album of toProcess) {
      stats.processed++;
      
      console.log(`\n[${stats.processed}/${toProcess.length}] 📀 ${album.artist} - ${album.title}`);
      
      try {
        const tracks = await findTracksForAlbum(album);
        
        if (tracks.length > 0) {
          // Сохраняем треки в БД
          await Track.bulkCreate(tracks, {
            ignoreDuplicates: true
          });
          
          stats.successful++;
          stats.totalTracks += tracks.length;
          console.log(`  ✅ Добавлено ${tracks.length} треков`);
        } else {
          stats.failed++;
          console.log(`  ❌ Треки не найдены`);
        }
        
        // Задержка между альбомами
        if (stats.processed < toProcess.length) {
          await smartDelay();
        }
        
      } catch (error) {
        if (error.message === 'VK_CAPTCHA_DETECTED') {
          console.log('\n⛔ ОБНАРУЖЕНА КАПЧА VK! Останавливаем обработку...');
          console.log('💡 Подождите 30-60 минут и запустите снова');
          break;
        }
        
        stats.failed++;
        console.log(`  ❌ Ошибка: ${error.message}`);
      }
    }
    
    // Итоги
    console.log('\n\n📊 === ИТОГИ ===');
    console.log(`Обработано альбомов: ${stats.processed}`);
    console.log(`Успешно заполнено: ${stats.successful}`);
    console.log(`Не удалось заполнить: ${stats.failed}`);
    console.log(`Всего треков добавлено: ${stats.totalTracks}`);
    console.log(`Среднее треков на альбом: ${stats.successful > 0 ? Math.round(stats.totalTracks / stats.successful) : 0}`);
    
    // Финальная статистика
    const remainingEmpty = emptyAlbums.length - stats.successful;
    console.log(`\n📈 Осталось пустых альбомов: ${remainingEmpty}`);
    
    if (remainingEmpty > 0) {
      console.log(`💡 Запустите скрипт еще раз для продолжения`);
    } else {
      console.log(`🎉 Все альбомы заполнены!`);
    }
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
  } finally {
    process.exit(0);
  }
}

// Запуск
const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
smartFillAlbums(limit);
