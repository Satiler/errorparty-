/**
 * Тест импорта 50 треков из KissVK
 */
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');

async function testImport() {
  console.log('\n🎵 ТЕСТ ИМПОРТА 50 ТРЕКОВ ИЗ KISSVK');
  console.log('=' .repeat(80));
  
  try {
    const service = kissvkService.getInstance();
    
    // 1. Получение треков
    console.log('\n1️⃣ Получение топ-50 треков...');
    const result = await service.extractTracks('/', 50);
    
    if (!result.success) {
      console.error('❌ Ошибка получения треков:', result.message);
      return;
    }
    
    console.log(`✅ Получено ${result.tracks.length} треков`);
    
    // 2. Расшифровка URL
    console.log('\n2️⃣ Расшифровка URL треков...');
    const decryptedTracks = await service.decryptTracks(result.tracks);
    const successCount = decryptedTracks.filter(t => t.streamUrl).length;
    console.log(`✅ Расшифровано ${successCount}/${decryptedTracks.length} треков`);
    
    // 3. Создание альбома
    console.log('\n3️⃣ Создание альбома...');
    const album = await Album.create({
      title: `KissVK Top 50 - ${new Date().toLocaleDateString('ru-RU')}`,
      artist: 'Various Artists',
      description: 'Автоматический импорт топ-50 треков из kissvk.top',
      totalTracks: decryptedTracks.length,
      isPublic: true,
      source: 'kissvk',
      provider: 'kissvk',
      sourceUrl: 'https://kissvk.top'
    });
    console.log(`✅ Альбом создан (ID: ${album.id})`);
    
    // 4. Импорт треков
    console.log('\n4️⃣ Импорт треков в базу данных...');
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    
    for (let i = 0; i < decryptedTracks.length; i++) {
      const track = decryptedTracks[i];
      
      if (!track.streamUrl) {
        failed++;
        continue;
      }
      
      try {
        // Проверка дубликата
        const existing = await Track.findOne({
          where: {
            provider: 'kissvk',
            providerTrackId: track.trackId
          }
        });
        
        if (existing) {
          // Обновляем только URL и альбом
          await existing.update({
            streamUrl: track.streamUrl,
            albumId: album.id,
            isVerified: true,
            lastChecked: new Date()
          });
          skipped++;
        } else {
          // Создаем новый трек
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
            trackNumber: i + 1,
            uploadedBy: 1,
            isPublic: true,
            allowDownload: false,
            isVerified: true,
            lastChecked: new Date()
          });
          imported++;
        }
        
        // Прогресс каждые 10 треков
        if ((i + 1) % 10 === 0) {
          console.log(`   Обработано: ${i + 1}/${decryptedTracks.length} (новых: ${imported}, обновлено: ${skipped}, ошибок: ${failed})`);
        }
        
      } catch (err) {
        console.error(`   ❌ Ошибка импорта трека "${track.title}":`, err.message);
        failed++;
      }
    }
    
    console.log(`\n✅ Импорт завершен!`);
    console.log(`   • Новых треков: ${imported}`);
    console.log(`   • Обновлено: ${skipped}`);
    console.log(`   • Ошибок: ${failed}`);
    
    // 5. Финальная статистика
    console.log('\n5️⃣ Финальная статистика...');
    const totalTracks = await Track.count();
    const kissvkTracks = await Track.count({ where: { source: 'kissvk' } });
    const manualTracks = await Track.count({ where: { source: 'manual' } });
    
    console.log(`   Всего треков в БД: ${totalTracks}`);
    console.log(`   • manual: ${manualTracks}`);
    console.log(`   • kissvk: ${kissvkTracks}`);
    
    // 6. Примеры импортированных треков
    console.log('\n6️⃣ Примеры импортированных треков:');
    const examples = await Track.findAll({
      where: { source: 'kissvk' },
      order: [['id', 'DESC']],
      limit: 5
    });
    
    examples.forEach(t => {
      console.log(`   • ${t.artist} - ${t.title}`);
      console.log(`     ID: ${t.id}, Provider: ${t.provider}, Track: ${t.providerTrackId}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ТЕСТ УСПЕШНО ЗАВЕРШЕН!');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testImport();
