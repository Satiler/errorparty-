/**
 * Импорт популярных зарубежных альбомов из kissvk.top
 */
const axios = require('axios');
const cheerio = require('cheerio');
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');

async function importForeignAlbums() {
  console.log('\n🌍 ИМПОРТ ЗАРУБЕЖНЫХ АЛЬБОМОВ');
  console.log('=' .repeat(80));
  
  const service = kissvkService.getInstance();
  
  try {
    // 1. Парсим главную страницу для поиска альбомов
    console.log('\n1️⃣ Поиск зарубежных альбомов на kissvk.top...');
    const response = await axios.get('https://kissvk.top/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Ищем все ссылки на альбомы
    const albumLinks = [];
    $('a[href^="/album-"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text) {
        albumLinks.push({ url: href, name: text });
      }
    });
    
    console.log(`   Найдено альбомов: ${albumLinks.length}`);
    
    // Фильтруем зарубежные (по латинским буквам в названии)
    const foreignAlbums = albumLinks.filter(album => {
      const hasLatin = /[A-Za-z]/.test(album.name);
      const hasCyrillic = /[А-Яа-яЁё]/.test(album.name);
      // Если есть латиница или только латиница
      return hasLatin;
    });
    
    console.log(`   Зарубежных альбомов: ${foreignAlbums.length}`);
    
    // Уникальные альбомы
    const uniqueAlbums = [];
    const seen = new Set();
    for (const album of foreignAlbums) {
      if (!seen.has(album.url)) {
        seen.add(album.url);
        uniqueAlbums.push(album);
      }
    }
    
    console.log(`   Уникальных: ${uniqueAlbums.length}`);
    
    // Показываем первые 10
    console.log('\n📋 Найденные зарубежные альбомы:');
    uniqueAlbums.slice(0, 10).forEach((album, i) => {
      console.log(`   ${i + 1}. ${album.name}`);
    });
    
    // 2. Создаем альбом для зарубежной музыки
    console.log('\n2️⃣ Создание альбома для зарубежной музыки...');
    let foreignMusicAlbum = await Album.findOne({
      where: {
        source: 'kissvk',
        title: 'KissVK Foreign Hits'
      }
    });
    
    if (!foreignMusicAlbum) {
      foreignMusicAlbum = await Album.create({
        title: 'KissVK Foreign Hits',
        artist: 'Various Artists',
        description: 'Популярные зарубежные треки из kissvk.top',
        totalTracks: 0,
        isPublic: true,
        source: 'kissvk',
        provider: 'kissvk',
        sourceUrl: 'https://kissvk.top'
      });
      console.log(`   ✅ Создан новый альбом (ID: ${foreignMusicAlbum.id})`);
    } else {
      console.log(`   ✅ Используется существующий альбом (ID: ${foreignMusicAlbum.id})`);
    }
    
    // 3. Импортируем треки из первых 15 альбомов
    const albumsToImport = uniqueAlbums.slice(0, 15);
    let totalNew = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    
    console.log(`\n3️⃣ Импорт треков из ${albumsToImport.length} альбомов...`);
    
    for (let i = 0; i < albumsToImport.length; i++) {
      const album = albumsToImport[i];
      console.log(`\n   [${i + 1}/${albumsToImport.length}] ${album.name}`);
      
      try {
        const result = await service.extractTracks(album.url, 100);
        
        if (!result.success || !result.tracks?.length) {
          console.log(`      ⚠️ Нет треков`);
          continue;
        }
        
        console.log(`      Получено: ${result.tracks.length} треков`);
        
        const decrypted = await service.decryptTracks(result.tracks);
        const validTracks = decrypted.filter(t => t.streamUrl);
        console.log(`      Расшифровано: ${validTracks.length}/${result.tracks.length}`);
        
        let newCount = 0;
        let updateCount = 0;
        let failedCount = 0;
        
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
                albumId: foreignMusicAlbum.id,
                uploadedBy: 1,
                isPublic: true,
                allowDownload: false,
                isVerified: true,
                lastChecked: new Date()
              });
              newCount++;
            }
          } catch (err) {
            failedCount++;
          }
        }
        
        totalNew += newCount;
        totalUpdated += updateCount;
        totalFailed += failedCount;
        
        console.log(`      ✅ Новых: ${newCount}, обновлено: ${updateCount}`);
        
        // Пауза между альбомами
        if (i < albumsToImport.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
        
      } catch (err) {
        console.log(`      ❌ Ошибка: ${err.message}`);
        totalFailed++;
      }
    }
    
    // Обновляем количество треков в альбоме
    await foreignMusicAlbum.update({
      totalTracks: await Track.count({ where: { albumId: foreignMusicAlbum.id } })
    });
    
    // 4. Финальная статистика
    console.log('\n' + '='.repeat(80));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(80));
    console.log(`   Обработано альбомов: ${albumsToImport.length}`);
    console.log(`   Новых треков: ${totalNew}`);
    console.log(`   Обновлено: ${totalUpdated}`);
    console.log(`   Ошибок: ${totalFailed}`);
    
    const total = await Track.count();
    const kissvk = await Track.count({ where: { source: 'kissvk' } });
    const manual = await Track.count({ where: { source: 'manual' } });
    
    console.log(`\n   Всего треков в БД: ${total}`);
    console.log(`   • manual: ${manual}`);
    console.log(`   • kissvk: ${kissvk}`);
    
    if (totalNew > 0) {
      console.log('\n🎵 Примеры новых зарубежных треков:');
      const latest = await Track.findAll({
        where: { 
          source: 'kissvk',
          albumId: foreignMusicAlbum.id
        },
        order: [['id', 'DESC']],
        limit: 15
      });
      
      latest.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.artist} - ${t.title}`);
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

importForeignAlbums();
