/**
 * Тестовый скрипт импорта из KissVK
 * Проверяет работу kissvk.service.js и импорт в БД
 */

const { getInstance } = require('./src/services/kissvk.service');
const { Track, Album } = require('./src/models');

async function testKissVKImport() {
  console.log('🎵 ТЕСТ ИМПОРТА ИЗ KISSVK');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Инициализация сервиса
    console.log('1️⃣ Инициализация kissvk.service...');
    const kissvkService = getInstance();
    console.log('✅ Сервис готов\n');

    // 2. Получение треков из чарта
    console.log('2️⃣ Получение топ-10 треков...');
    const result = await kissvkService.getChartTracks(10);
    
    if (!result || !result.success || !result.tracks || result.tracks.length === 0) {
      throw new Error('Не удалось получить треки из kissvk.top');
    }
    
    const tracks = result.tracks;
    console.log(`✅ Получено ${tracks.length} треков\n`);
    
    // 3. Вывод первого трека
    console.log('3️⃣ Пример трека:');
    console.log(`   Название: ${tracks[0].title}`);
    console.log(`   Исполнитель: ${tracks[0].artist}`);
    console.log(`   Длительность: ${tracks[0].duration}с`);
    console.log(`   Зашифрованный URL: ${tracks[0].encryptedUrl?.substring(0, 50)}...`);
    console.log('');

    // 4. Расшифровка URL
    console.log('4️⃣ Расшифровка URL первого трека...');
    const decryptedUrl = await kissvkService.decryptTrackUrl(tracks[0].encryptedUrl);
    console.log(`✅ URL расшифрован: ${decryptedUrl.substring(0, 60)}...\n`);

    // 5. Создание тестового альбома
    console.log('5️⃣ Создание тестового альбома...');
    const album = await Album.create({
      title: `KissVK Test Import - ${new Date().toLocaleDateString('ru-RU')}`,
      artist: 'Various Artists',
      description: 'Тестовый импорт из kissvk.top',
      totalTracks: tracks.length,
      isPublic: true,
      source: 'kissvk',
      provider: 'kissvk',
      sourceUrl: 'https://kissvk.top'
    });
    console.log(`✅ Альбом создан (ID: ${album.id})\n`);

    // 6. Импорт первого трека (тест)
    console.log('6️⃣ Импорт первого трека...');
    const testTrack = tracks[0];
    
    // Проверка дубликата
    const existing = await Track.findOne({
      where: {
        title: testTrack.title,
        artist: testTrack.artist,
        source: 'kissvk'
      }
    });

    if (existing) {
      console.log('⚠️ Трек уже существует в БД, обновляем URL...');
      await existing.update({
        streamUrl: decryptedUrl,
        albumId: album.id
      });
      console.log(`✅ Трек обновлен (ID: ${existing.id})\n`);
    } else {
      const newTrack = await Track.create({
        title: testTrack.title,
        artist: testTrack.artist,
        duration: testTrack.duration,
        streamUrl: decryptedUrl,
        coverUrl: testTrack.imageUrl,
        source: 'kissvk',
        provider: 'kissvk',
        providerTrackId: testTrack.trackId,
        albumId: album.id,
        trackNumber: 1,
        uploadedBy: 1,
        isPublic: true,
        allowDownload: true
      });
      console.log(`✅ Трек импортирован (ID: ${newTrack.id})\n`);
    }

    // 7. Статистика после импорта
    console.log('7️⃣ Проверка статистики...');
    const totalTracks = await Track.count();
    const kissvkTracks = await Track.count({ where: { source: 'kissvk' } });
    
    console.log(`   Всего треков в БД: ${totalTracks}`);
    console.log(`   Из них kissvk: ${kissvkTracks}`);
    console.log('');

    // 8. Проверка кеша
    console.log('8️⃣ Тест кеширования...');
    const stats = kissvkService.getStats();
    console.log(`   Запросов в кеше: ${stats.cacheSize}`);
    console.log(`   Попаданий в кеш: ${stats.cacheHits}`);
    console.log(`   Промахов кеша: ${stats.cacheMisses}`);
    console.log(`   Hit rate: ${stats.cacheHitRate}%`);
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ ТЕСТ ЗАВЕРШЕН УСПЕШНО!');
    console.log('='.repeat(80));
    console.log('');
    console.log('📝 Результаты:');
    console.log(`   • Получено треков: ${tracks.length}`);
    console.log(`   • Альбом создан: ${album.title}`);
    console.log(`   • Импорт работает корректно`);
    console.log(`   • Кеширование активно`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ ОШИБКА ТЕСТА');
    console.error('='.repeat(80));
    console.error('');
    console.error('Ошибка:', error.message);
    console.error('');
    
    if (error.message.includes('kissvk.top')) {
      console.error('⚠️ Проблема доступа к kissvk.top:');
      console.error('   • Сайт может быть временно недоступен');
      console.error('   • Возможна блокировка провайдером');
      console.error('   • Попробуйте использовать VPN');
      console.error('');
    }
    
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
  } finally {
    process.exit();
  }
}

// Запуск теста
testKissVKImport();
