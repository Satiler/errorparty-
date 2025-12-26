/**
 * Массовый импорт треков из KissVK
 * Попытка импортировать максимально доступное количество треков
 */
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');

async function massImport() {
  console.log('\n🎵 МАССОВЫЙ ИМПОРТ ТРЕКОВ ИЗ KISSVK');
  console.log('=' .repeat(80));
  
  const startTime = Date.now();
  let totalImported = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  
  try {
    const service = kissvkService.getInstance();
    
    // Создание альбома для массового импорта
    console.log('\n1️⃣ Создание альбома для массового импорта...');
    let album = await Album.findOne({
      where: {
        source: 'kissvk',
        title: 'KissVK Mass Import'
      }
    });
    
    if (!album) {
      album = await Album.create({
        title: 'KissVK Mass Import',
        artist: 'Various Artists',
        description: 'Массовый импорт треков из kissvk.top',
        totalTracks: 0,
        isPublic: true,
        source: 'kissvk',
        provider: 'kissvk',
        sourceUrl: 'https://kissvk.top'
      });
      console.log(`✅ Создан новый альбом (ID: ${album.id})`);
    } else {
      console.log(`✅ Используется существующий альбом (ID: ${album.id})`);
    }
    
    // Несколько попыток импорта с разными страницами
    const attempts = [
      { url: '/', limit: 100, name: 'Главная страница (топ)' },
      { url: '/?page=2', limit: 100, name: 'Страница 2' },
      { url: '/?page=3', limit: 100, name: 'Страница 3' },
      { url: '/?page=4', limit: 100, name: 'Страница 4' },
      { url: '/?page=5', limit: 100, name: 'Страница 5' }
    ];
    
    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      console.log(`\n${i + 2}️⃣ Импорт из: ${attempt.name}...`);
      
      try {
        // Получение треков
        const result = await service.extractTracks(attempt.url, attempt.limit);
        
        if (!result.success || !result.tracks || result.tracks.length === 0) {
          console.log(`⚠️ Треки не найдены на ${attempt.name}`);
          continue;
        }
        
        console.log(`   Получено ${result.tracks.length} треков`);
        
        // Расшифровка URL
        const decryptedTracks = await service.decryptTracks(result.tracks);
        const successCount = decryptedTracks.filter(t => t.streamUrl).length;
        console.log(`   Расшифровано ${successCount}/${decryptedTracks.length} треков`);
        
        // Импорт треков
        let imported = 0;
        let updated = 0;
        let failed = 0;
        
        for (const track of decryptedTracks) {
          if (!track.streamUrl) {
            failed++;
            continue;
          }
          
          try {
            // Проверка существования
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
              updated++;
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
              imported++;
            }
          } catch (err) {
            console.error(`   ❌ Ошибка: ${track.title} - ${err.message}`);
            failed++;
          }
        }
        
        totalImported += imported;
        totalUpdated += updated;
        totalFailed += failed;
        
        console.log(`   Результат: новых ${imported}, обновлено ${updated}, ошибок ${failed}`);
        
        // Задержка между запросами (2 секунды)
        if (i < attempts.length - 1) {
          console.log('   ⏳ Пауза 2 секунды...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`   ❌ Ошибка импорта ${attempt.name}:`, error.message);
      }
    }
    
    // Обновление статистики альбома
    const totalTracksInAlbum = await Track.count({
      where: { albumId: album.id }
    });
    
    await album.update({ totalTracks: totalTracksInAlbum });
    
    // Финальная статистика
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ МАССОВЫЙ ИМПОРТ ЗАВЕРШЕН!');
    console.log('='.repeat(80));
    console.log(`   • Новых треков: ${totalImported}`);
    console.log(`   • Обновлено: ${totalUpdated}`);
    console.log(`   • Ошибок: ${totalFailed}`);
    console.log(`   • Время выполнения: ${duration}с`);
    
    // Общая статистика по БД
    console.log('\n📊 Общая статистика базы данных:');
    const totalTracks = await Track.count();
    const kissvkTracks = await Track.count({ where: { source: 'kissvk' } });
    const manualTracks = await Track.count({ where: { source: 'manual' } });
    
    console.log(`   Всего треков: ${totalTracks}`);
    console.log(`   • manual: ${manualTracks}`);
    console.log(`   • kissvk: ${kissvkTracks}`);
    
    // Примеры последних импортированных треков
    if (totalImported > 0) {
      console.log('\n🎵 Последние импортированные треки:');
      const latestTracks = await Track.findAll({
        where: { source: 'kissvk' },
        order: [['id', 'DESC']],
        limit: 5
      });
      
      latestTracks.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.artist} - ${t.title}`);
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

massImport();
