/**
 * Поиск и импорт популярных зарубежных исполнителей
 */
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');

async function importPopularForeignArtists() {
  console.log('\n🌍 ИМПОРТ ПОПУЛЯРНЫХ ЗАРУБЕЖНЫХ ИСПОЛНИТЕЛЕЙ');
  console.log('=' .repeat(80));
  
  const service = kissvkService.getInstance();
  
  // Список популярных зарубежных исполнителей для поиска
  const foreignArtists = [
    'Weeknd', 'Drake', 'Billie Eilish', 'Ariana Grande', 'Taylor Swift',
    'Ed Sheeran', 'Dua Lipa', 'Justin Bieber', 'Post Malone', 'Travis Scott',
    'Eminem', '50 Cent', 'Snoop Dogg', 'Dr Dre', 'Kanye West',
    'Imagine Dragons', 'Coldplay', 'Maroon 5', 'OneRepublic', 'Linkin Park',
    'Rihanna', 'Beyonce', 'Lady Gaga', 'Adele', 'Sia',
    'Bruno Mars', 'Charlie Puth', 'Shawn Mendes', 'Zayn', 'The Weeknd'
  ];
  
  console.log(`\n📋 Список исполнителей для поиска (${foreignArtists.length}):`);
  foreignArtists.slice(0, 10).forEach((artist, i) => {
    console.log(`   ${i + 1}. ${artist}`);
  });
  console.log('   ...');
  
  // Создаем альбом
  let foreignAlbum = await Album.findOne({
    where: { source: 'kissvk', title: 'KissVK Foreign Hits' }
  }) || await Album.create({
    title: 'KissVK Foreign Hits',
    artist: 'Various Artists',
    description: 'Популярные зарубежные хиты',
    totalTracks: 0,
    isPublic: true,
    source: 'kissvk',
    provider: 'kissvk',
    sourceUrl: 'https://kissvk.top'
  });
  
  let totalNew = 0;
  let totalUpdated = 0;
  let foundArtists = 0;
  
  console.log('\n🔍 Поиск треков исполнителей...');
  
  for (let i = 0; i < Math.min(foreignArtists.length, 20); i++) {
    const artist = foreignArtists[i];
    
    try {
      console.log(`\n   [${i + 1}/20] Поиск: ${artist}`);
      
      // Пытаемся найти через поиск
      const searchUrl = `/search?q=${encodeURIComponent(artist)}`;
      const result = await service.extractTracks(searchUrl, 20);
      
      if (!result.success || !result.tracks?.length) {
        console.log(`      ⚠️ Не найдено`);
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      
      console.log(`      Найдено: ${result.tracks.length} треков`);
      foundArtists++;
      
      const decrypted = await service.decryptTracks(result.tracks);
      const validTracks = decrypted.filter(t => t.streamUrl);
      
      let newCount = 0;
      let updateCount = 0;
      
      for (const track of validTracks) {
        try {
          const existing = await Track.findOne({
            where: { provider: 'kissvk', providerTrackId: track.trackId }
          });
          
          if (existing) {
            await existing.update({
              streamUrl: track.streamUrl,
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
              albumId: foreignAlbum.id,
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
      
      if (newCount > 0 || updateCount > 0) {
        console.log(`      ✅ Новых: ${newCount}, обновлено: ${updateCount}`);
      }
      
      await new Promise(r => setTimeout(r, 1500));
      
    } catch (err) {
      console.log(`      ❌ Ошибка: ${err.message}`);
    }
  }
  
  await foreignAlbum.update({
    totalTracks: await Track.count({ where: { albumId: foreignAlbum.id } })
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('='.repeat(80));
  console.log(`   Найдено исполнителей: ${foundArtists}/20`);
  console.log(`   Новых треков: ${totalNew}`);
  console.log(`   Обновлено: ${totalUpdated}`);
  
  const total = await Track.count();
  const kissvk = await Track.count({ where: { source: 'kissvk' } });
  
  console.log(`\n   Всего в БД: ${total}`);
  console.log(`   Из kissvk: ${kissvk}`);
  
  if (totalNew > 0) {
    console.log('\n🎵 Последние добавленные треки:');
    const latest = await Track.findAll({
      where: { source: 'kissvk' },
      order: [['id', 'DESC']],
      limit: 15
    });
    latest.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.artist} - ${t.title}`);
    });
  }
  
  console.log('='.repeat(80) + '\n');
  process.exit(0);
}

importPopularForeignArtists();
