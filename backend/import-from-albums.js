/**
 * Импорт из конкретных альбомов/плейлистов
 */
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');

async function importFromAlbums() {
  console.log('\n🎵 ИМПОРТ ИЗ АЛЬБОМОВ/ПЛЕЙЛИСТОВ');
  console.log('=' .repeat(80));
  
  const service = kissvkService.getInstance();
  
  // Список URL альбомов/плейлистов из главной страницы
  const sources = [
    { url: '/playlist-147845620_3396_f26cc2dd829eb57254', name: 'Плейлист CULT' },
    { url: '/album-2000095883_26095883', name: 'By Индиаедва знакомы' },
    { url: '/album-2000106205_26106205', name: 'пазнякс, xxxsanek' },
    { url: '/album-2000121763_26121763', name: 'Словетский, ROMA ZOTTI' },
    { url: '/album-2000096897_26096897', name: 'КОСМОНАВТОВ' },
    { url: '/album-2000029538_26029538', name: 'ДЖЕЙЛGRUNGE BO!' },
    { url: '/tracks_chart', name: 'Чарт треков' }
  ];
  
  let totalNew = 0;
  let totalUpdated = 0;
  
  const album = await Album.findOne({
    where: { source: 'kissvk', title: 'KissVK Mass Import' }
  }) || await Album.create({
    title: 'KissVK Mass Import',
    artist: 'Various Artists',
    description: 'Импорт из альбомов и плейлистов kissvk.top',
    totalTracks: 0,
    isPublic: true,
    source: 'kissvk',
    provider: 'kissvk',
    sourceUrl: 'https://kissvk.top'
  });
  
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`\n${i + 1}/${sources.length} Импорт из: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    
    try {
      const result = await service.extractTracks(source.url, 100);
      
      if (!result.success || !result.tracks?.length) {
        console.log(`   ⚠️ Нет треков`);
        continue;
      }
      
      console.log(`   Получено ${result.tracks.length} треков`);
      const decrypted = await service.decryptTracks(result.tracks);
      const validTracks = decrypted.filter(t => t.streamUrl);
      console.log(`   Расшифровано ${validTracks.length}/${result.tracks.length} треков`);
      
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
              albumId: album.id,
              uploadedBy: 1,
              isPublic: true,
              allowDownload: false,
              isVerified: true,
              lastChecked: new Date()
            });
            newCount++;
          }
        } catch (err) {
          console.log(`   ❌ Ошибка сохранения "${track.title}": ${err.message}`);
        }
      }
      
      totalNew += newCount;
      totalUpdated += updateCount;
      console.log(`   ✅ Новых: ${newCount}, обновлено: ${updateCount}`);
      
      if (i < sources.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
      
    } catch (err) {
      console.log(`   ❌ Ошибка: ${err.message}`);
    }
  }
  
  await album.update({
    totalTracks: await Track.count({ where: { albumId: album.id } })
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log(`   Новых треков: ${totalNew}`);
  console.log(`   Обновлено: ${totalUpdated}`);
  
  const total = await Track.count();
  const kissvk = await Track.count({ where: { source: 'kissvk' } });
  console.log(`\n   Всего в БД: ${total}`);
  console.log(`   Из kissvk: ${kissvk}`);
  
  if (totalNew > 0) {
    console.log('\n🎵 Примеры новых треков:');
    const latest = await Track.findAll({
      where: { source: 'kissvk' },
      order: [['id', 'DESC']],
      limit: 10
    });
    latest.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.artist} - ${t.title}`);
    });
  }
  
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

importFromAlbums();
