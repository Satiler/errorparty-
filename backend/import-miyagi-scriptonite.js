/**
 * Импорт всех альбомов Мияги и Скриптонита
 */
const axios = require('axios');
const cheerio = require('cheerio');
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');

async function importMiyagiAndScriptOnit() {
  console.log('\n🎵 ИМПОРТ МИЯГИ И СКРИПТОНИТА');
  console.log('=' .repeat(80));
  
  const service = kissvkService.getInstance();
  
  const artists = [
    { name: 'Мияги', searchTerms: ['Мияги', 'MiyaGi', 'Miyagi'] },
    { name: 'Скриптонит', searchTerms: ['Скриптонит', 'Скриптонит', 'Scryptonite'] }
  ];
  
  let totalNew = 0;
  let totalUpdated = 0;
  
  for (const artist of artists) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎤 Поиск: ${artist.name}`);
    console.log('='.repeat(80));
    
    // Создаем отдельный альбом для каждого исполнителя
    let artistAlbum = await Album.findOne({
      where: {
        source: 'kissvk',
        title: `KissVK - ${artist.name}`
      }
    });
    
    if (!artistAlbum) {
      artistAlbum = await Album.create({
        title: `KissVK - ${artist.name}`,
        artist: artist.name,
        description: `Все треки ${artist.name} из kissvk.top`,
        totalTracks: 0,
        isPublic: true,
        source: 'kissvk',
        provider: 'kissvk',
        sourceUrl: 'https://kissvk.top'
      });
      console.log(`✅ Создан альбом (ID: ${artistAlbum.id})`);
    } else {
      console.log(`✅ Альбом существует (ID: ${artistAlbum.id})`);
    }
    
    // Пробуем разные варианты поиска
    for (const searchTerm of artist.searchTerms) {
      console.log(`\n🔍 Поиск по: "${searchTerm}"`);
      
      try {
        const searchUrl = `/search?q=${encodeURIComponent(searchTerm)}`;
        const result = await service.extractTracks(searchUrl, 100);
        
        if (!result.success || !result.tracks?.length) {
          console.log(`   ⚠️ Не найдено`);
          continue;
        }
        
        console.log(`   Найдено: ${result.tracks.length} треков`);
        
        const decrypted = await service.decryptTracks(result.tracks);
        const validTracks = decrypted.filter(t => t.streamUrl);
        console.log(`   Расшифровано: ${validTracks.length}/${result.tracks.length}`);
        
        let newCount = 0;
        let updateCount = 0;
        
        for (const track of validTracks) {
          try {
            const existing = await Track.findOne({
              where: {
                provider: 'kissvk',
                providerTrackId: track.trackId
              }
            });
            
            if (existing) {
              await existing.update({
                streamUrl: track.streamUrl,
                albumId: artistAlbum.id,
                isVerified: true,
                lastChecked: new Date()
              });
              updateCount++;
            } else {
              await Track.create({
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                streamUrl: track.streamUrl,
                coverUrl: track.imageUrl,
                source: 'kissvk',
                provider: 'kissvk',
                providerTrackId: track.trackId,
                albumId: artistAlbum.id,
                uploadedBy: 1,
                isPublic: true,
                allowDownload: false,
                isVerified: true,
                lastChecked: new Date()
              });
              newCount++;
            }
          } catch (err) {
            // Skip
          }
        }
        
        totalNew += newCount;
        totalUpdated += updateCount;
        
        console.log(`   ✅ Новых: ${newCount}, обновлено: ${updateCount}`);
        
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (err) {
        console.log(`   ❌ Ошибка: ${err.message}`);
      }
    }
    
    // Поиск альбомов исполнителя на главной странице
    console.log(`\n📀 Поиск альбомов ${artist.name} на главной странице...`);
    
    try {
      const response = await axios.get('https://kissvk.top/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const foundAlbums = [];
      
      $('a[href^="/album-"]').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim().toLowerCase();
        
        if (text.includes(artist.name.toLowerCase()) || 
            text.includes(artist.searchTerms[0].toLowerCase())) {
          foundAlbums.push({ url: href, name: $(el).text().trim() });
        }
      });
      
      // Убираем дубликаты
      const uniqueAlbums = [];
      const seen = new Set();
      for (const album of foundAlbums) {
        if (!seen.has(album.url)) {
          seen.add(album.url);
          uniqueAlbums.push(album);
        }
      }
      
      if (uniqueAlbums.length > 0) {
        console.log(`   Найдено альбомов: ${uniqueAlbums.length}`);
        
        for (const album of uniqueAlbums) {
          console.log(`\n   📀 Импорт альбома: ${album.name}`);
          
          try {
            const result = await service.extractTracks(album.url, 100);
            
            if (!result.success || !result.tracks?.length) {
              console.log(`      ⚠️ Нет треков`);
              continue;
            }
            
            console.log(`      Получено: ${result.tracks.length} треков`);
            
            const decrypted = await service.decryptTracks(result.tracks);
            const validTracks = decrypted.filter(t => t.streamUrl);
            
            let newCount = 0;
            let updateCount = 0;
            
            for (const track of validTracks) {
              try {
                const existing = await Track.findOne({
                  where: {
                    provider: 'kissvk',
                    providerTrackId: track.trackId
                  }
                });
                
                if (existing) {
                  await existing.update({
                    streamUrl: track.streamUrl,
                    albumId: artistAlbum.id,
                    isVerified: true,
                    lastChecked: new Date()
                  });
                  updateCount++;
                } else {
                  await Track.create({
                    title: track.title,
                    artist: track.artist,
                    duration: track.duration,
                    streamUrl: track.streamUrl,
                    coverUrl: track.imageUrl,
                    source: 'kissvk',
                    provider: 'kissvk',
                    providerTrackId: track.trackId,
                    albumId: artistAlbum.id,
                    uploadedBy: 1,
                    isPublic: true,
                    allowDownload: false,
                    isVerified: true,
                    lastChecked: new Date()
                  });
                  newCount++;
                }
              } catch (err) {
                // Skip
              }
            }
            
            totalNew += newCount;
            totalUpdated += updateCount;
            
            console.log(`      ✅ Новых: ${newCount}, обновлено: ${updateCount}`);
            
            await new Promise(r => setTimeout(r, 2000));
            
          } catch (err) {
            console.log(`      ❌ Ошибка: ${err.message}`);
          }
        }
      } else {
        console.log(`   ⚠️ Альбомы не найдены`);
      }
      
    } catch (err) {
      console.log(`   ❌ Ошибка поиска альбомов: ${err.message}`);
    }
    
    // Обновляем количество треков
    const tracksCount = await Track.count({ where: { albumId: artistAlbum.id } });
    await artistAlbum.update({ totalTracks: tracksCount });
    
    console.log(`\n📊 Итого ${artist.name}: ${tracksCount} треков в альбоме`);
  }
  
  // Финальная статистика
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 ФИНАЛЬНАЯ СТАТИСТИКА');
  console.log('='.repeat(80));
  console.log(`   Новых треков: ${totalNew}`);
  console.log(`   Обновлено: ${totalUpdated}`);
  
  const total = await Track.count();
  const kissvk = await Track.count({ where: { source: 'kissvk' } });
  
  console.log(`\n   Всего в БД: ${total}`);
  console.log(`   Из kissvk: ${kissvk}`);
  
  // Показываем примеры треков каждого исполнителя
  for (const artist of artists) {
    const artistAlbum = await Album.findOne({
      where: { source: 'kissvk', title: `KissVK - ${artist.name}` }
    });
    
    if (artistAlbum) {
      console.log(`\n🎵 Примеры треков ${artist.name}:`);
      const tracks = await Track.findAll({
        where: { albumId: artistAlbum.id },
        limit: 10,
        order: [['id', 'DESC']]
      });
      
      tracks.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.artist} - ${t.title}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
}

importMiyagiAndScriptOnit();
