/**
 * Импорт самых популярных российских и зарубежных альбомов
 */
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');
const fs = require('fs');
const path = require('path');

async function importPopularAlbums() {
  console.log('\n🎵 ИМПОРТ ПОПУЛЯРНЫХ АЛЬБОМОВ ИЗ KISSVK');
  console.log('=' .repeat(80));
  
  const startTime = Date.now();
  const service = kissvkService.getInstance();
  
  let totalImported = 0;
  let totalFailed = 0;
  const importedAlbums = [];
  
  try {
    // Загружаем найденные альбомы из JSON
    let albumsData = { russian: [], foreign: [] };
    
    if (fs.existsSync('./popular-albums-data.json')) {
      console.log('\n📂 Загрузка данных из popular-albums-data.json...');
      albumsData = JSON.parse(fs.readFileSync('./popular-albums-data.json', 'utf8'));
      console.log(`   🇷🇺 Российских: ${albumsData.russian.length}`);
      console.log(`   🌍 Зарубежных: ${albumsData.foreign.length}`);
    }
    
    // Объединяем все альбомы для импорта
    const allAlbumsToImport = [
      ...albumsData.russian,
      ...albumsData.foreign
    ];
    
    console.log(`\n📦 Всего альбомов к импорту: ${allAlbumsToImport.length}`);
    
    if (allAlbumsToImport.length === 0) {
      console.log('\n⚠️  Список альбомов пуст! Добавляю популярные вручную...\n');
      
      // Добавляем популярные российские альбомы вручную (из найденных)
      allAlbumsToImport.push(
        { url: '/album-2000111599_26111599', name: 'ARTIK & ASTI - VK Акустика' },
        { url: '/album-2000121763_26121763', name: 'Словетский, ROMA ZOTTI - Поборол' },
        { url: '/album-2000182551_26182551', name: 'SCHOKK, CzarBTMG' },
        { url: '/album-2000096897_26096897', name: 'КОСМОНАВТОВ НЕТ - АНТИПОЭТИКА' },
        { url: '/album-2000106205_26106205', name: 'пазнякс, xxxsanek - большие дети' },
        { url: '/album-2000029538_26029538', name: 'ДЖЕЙЛО - GRUNGE BO! X) 2' },
        { url: '/album-2000162442_26162442', name: 'Аркайда - Первый диск моего бати' },
        { url: '/album-2000095430_26095430', name: 'мартинс - новым годом, не звони мне' },
        { url: '/album-2000120195_26120195', name: 'Young P&H - Человек в железной маске' },
        { url: '/album-2000036760_26036760', name: 'Султан-Ураган - Понаехали' },
        { url: '/album-2000095883_26095883', name: 'By - Индияедва знакомы' }
      );
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('🚀 НАЧАЛО ИМПОРТА');
    console.log('=' .repeat(80));
    
    for (let i = 0; i < allAlbumsToImport.length; i++) {
      const albumData = allAlbumsToImport[i];
      
      try {
        console.log(`\n[${i + 1}/${allAlbumsToImport.length}] ${albumData.name}`);
        console.log(`   URL: https://kissvk.top${albumData.url}`);
        
        // Извлекаем название и исполнителя из имени
        const nameParts = albumData.name.split(' - ');
        const artistName = nameParts[0] || 'Various Artists';
        const albumTitle = nameParts[1] || albumData.name;
        
        // Создаём или находим альбом
        let album = await Album.findOne({
          where: {
            source: 'kissvk',
            sourceUrl: albumData.url
          }
        });
        
        if (!album) {
          album = await Album.create({
            title: albumTitle,
            artist: artistName,
            description: `Импортировано с kissvk.top`,
            totalTracks: 0,
            isPublic: true,
            source: 'kissvk',
            provider: 'kissvk',
            sourceUrl: albumData.url,
            cover: null
          });
          console.log(`   📀 Создан альбом (ID: ${album.id})`);
        } else {
          console.log(`   📀 Используется существующий альбом (ID: ${album.id})`);
        }
        
        // Извлекаем треки со страницы альбома
        const result = await service.extractTracks(albumData.url, 50);
        
        if (!result.success) {
          console.log(`   ❌ Ошибка извлечения треков: ${result.error}`);
          totalFailed++;
          continue;
        }
        
        console.log(`   🔍 Найдено треков: ${result.tracks.length}`);
        
        if (result.tracks.length === 0) {
          console.log(`   ⚠️  Нет треков для импорта`);
          continue;
        }
        
        // Расшифровываем URL треков
        const decryptedTracks = await service.decryptTracks(result.tracks);
        const validTracks = decryptedTracks.filter(t => t.isDecrypted);
        
        console.log(`   🔓 Расшифровано URL: ${validTracks.length}/${result.tracks.length}`);
        
        // Сохраняем треки в базу
        let importedCount = 0;
        let updatedCount = 0;
        
        for (const trackData of validTracks) {
          try {
            // Проверяем существование трека
            let track = await Track.findOne({
              where: {
                source: 'kissvk',
                sourceTrackId: trackData.trackId
              }
            });
            
            if (!track) {
              // Создаём новый трек
              track = await Track.create({
                title: trackData.title,
                artist: trackData.artist,
                duration: trackData.duration,
                albumId: album.id,
                fileUrl: trackData.streamUrl,
                source: 'kissvk',
                sourceTrackId: trackData.trackId,
                provider: 'kissvk',
                isPublic: true,
                playCount: 0
              });
              importedCount++;
            } else {
              // Обновляем существующий
              await track.update({
                fileUrl: trackData.streamUrl,
                albumId: album.id,
                duration: trackData.duration
              });
              updatedCount++;
            }
            
          } catch (error) {
            console.error(`   ⚠️  Ошибка сохранения трека "${trackData.title}": ${error.message}`);
          }
        }
        
        // Обновляем счётчик треков в альбоме
        await album.update({
          totalTracks: await Track.count({ where: { albumId: album.id } })
        });
        
        totalImported += importedCount;
        
        console.log(`   ✅ Импортировано: ${importedCount} новых, ${updatedCount} обновлено`);
        
        importedAlbums.push({
          name: albumData.name,
          tracks: importedCount,
          updated: updatedCount,
          albumId: album.id
        });
        
        // Пауза между альбомами
        if (i < allAlbumsToImport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        totalFailed++;
        console.log(`   ❌ Ошибка импорта: ${error.message}`);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '=' .repeat(80));
    console.log('✅ ИМПОРТ ЗАВЕРШЁН');
    console.log('=' .repeat(80));
    console.log(`⏱️  Время выполнения: ${duration}s`);
    console.log(`✅ Новых треков импортировано: ${totalImported}`);
    console.log(`❌ Ошибок: ${totalFailed}`);
    console.log(`📀 Альбомов обработано: ${allAlbumsToImport.length}`);
    
    if (importedAlbums.length > 0) {
      console.log('\n📊 ДЕТАЛЬНАЯ СТАТИСТИКА:');
      importedAlbums.forEach((album, i) => {
        console.log(`${i + 1}. ${album.name}`);
        console.log(`   Новых: ${album.tracks}, Обновлено: ${album.updated}, Album ID: ${album.albumId}`);
      });
    }
    
    // Сохраняем отчёт
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      totalNewTracks: totalImported,
      totalAlbums: allAlbumsToImport.length,
      failed: totalFailed,
      albums: importedAlbums
    };
    
    fs.writeFileSync(
      './import-popular-albums-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Отчёт сохранён: import-popular-albums-report.json');
    console.log('\n🎵 Новые треки доступны на https://errorparty.ru/music');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

importPopularAlbums().catch(console.error);
