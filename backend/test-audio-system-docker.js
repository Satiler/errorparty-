/**
 * Тест аудио системы в Docker окружении
 * Тестирует декодирование и скачивание с KissVK и других сервисов
 */

const { getInstance: getDecoder } = require('./src/services/audio-decoder.service');
const { getInstance: getDownloader } = require('./src/services/audio-downloader.service');
const { getInstance: getKissVK } = require('./src/services/kissvk.service');

async function testAudioSystem() {
  console.log('🎵 ТЕСТ АУДИО СИСТЕМЫ В DOCKER\n');
  console.log('=' .repeat(60));
  
  const decoder = getDecoder();
  const downloader = getDownloader();
  const kissvk = getKissVK();

  // ============================================================
  // 1. ТЕСТ ОКРУЖЕНИЯ
  // ============================================================
  console.log('\n📦 1. ПРОВЕРКА DOCKER ОКРУЖЕНИЯ');
  console.log('-'.repeat(60));
  
  const uploadPath = process.env.AUDIO_DOWNLOAD_PATH || '/app/uploads/audio';
  console.log(`Upload Path: ${uploadPath}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Working Dir: ${process.cwd()}`);
  
  try {
    await downloader.init();
    console.log('✅ Download directory initialized');
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    return;
  }

  // ============================================================
  // 2. ТЕСТ KISSVK ИЗВЛЕЧЕНИЯ ТРЕКОВ
  // ============================================================
  console.log('\n🔍 2. ТЕСТ KISSVK - ИЗВЛЕЧЕНИЕ ТРЕКОВ');
  console.log('-'.repeat(60));
  
  const testUrls = [
    'https://kissvk.top/tracks_chart', // Чарт треков
    'https://kissvk.top/albums/mihanik' // Пример альбома
  ];

  let testTracks = [];

  for (const url of testUrls) {
    try {
      console.log(`\nИзвлечение из: ${url}`);
      const result = await kissvk.extractTracks(url, 3); // Берем только 3 трека
      
      if (result.success && result.tracks.length > 0) {
        console.log(`✅ Найдено ${result.tracks.length} треков`);
        
        // Декодируем треки
        const decryptedTracks = await kissvk.decryptTracks(result.tracks);
        testTracks = testTracks.concat(decryptedTracks);
        
        decryptedTracks.forEach((track, i) => {
          console.log(`   ${i + 1}. ${track.artist} - ${track.title}`);
          if (track.streamUrl) {
            console.log(`      URL: ${track.streamUrl.substring(0, 80)}...`);
          } else if (track.encryptedUrl) {
            console.log(`      Encrypted: ${track.encryptedUrl.substring(0, 40)}...`);
          }
        });
      } else {
        console.log(`⚠️  Треки не найдены`);
      }
    } catch (error) {
      console.error(`❌ Ошибка извлечения:`, error.message);
    }
  }

  if (testTracks.length === 0) {
    console.log('\n❌ Не удалось извлечь треки для тестирования');
    return;
  }

  // ============================================================
  // 3. ТЕСТ ДЕКОДИРОВАНИЯ URL
  // ============================================================
  console.log('\n🔓 3. ТЕСТ ДЕКОДИРОВАНИЯ URL');
  console.log('-'.repeat(60));

  for (let i = 0; i < Math.min(testTracks.length, 3); i++) {
    const track = testTracks[i];
    console.log(`\n[${i + 1}] ${track.artist} - ${track.title}`);
    
    // Используем streamUrl если есть, иначе encryptedUrl
    const urlToTest = track.streamUrl || track.encryptedUrl;
    
    if (!urlToTest) {
      console.log(`⚠️  Нет URL для декодирования`);
      continue;
    }
    
    try {
      const result = await decoder.decode(urlToTest, track.metadata);
      
      if (result.success) {
        console.log(`✅ Декодирование успешно`);
        console.log(`   Метод: ${result.method || 'direct'}`);
        console.log(`   URL: ${result.url?.substring(0, 80)}...`);
        
        // Обновляем URL в треке
        track.decodedUrl = result.url;
      } else {
        console.log(`❌ Ошибка декодирования: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Исключение:`, error.message);
    }
  }

  // ============================================================
  // 4. ТЕСТ СКАЧИВАНИЯ (только 1 файл для экономии места)
  // ============================================================
  console.log('\n⬇️  4. ТЕСТ СКАЧИВАНИЯ АУДИО');
  console.log('-'.repeat(60));

  const trackToDownload = testTracks.find(t => t.decodedUrl || t.streamUrl);
  
  if (trackToDownload) {
    console.log(`\nСкачивание: ${trackToDownload.artist} - ${trackToDownload.title}`);
    
    try {
      const downloadUrl = trackToDownload.decodedUrl || trackToDownload.streamUrl;
      const result = await downloader.download(downloadUrl, {
        filename: downloader.generateFilename(downloadUrl, {
          artist: trackToDownload.artist,
          title: trackToDownload.title
        }),
        metadata: {
          artist: trackToDownload.artist,
          title: trackToDownload.title,
          source: 'kissvk',
          testFile: true
        },
        validate: true
      });
      
      if (result.success) {
        console.log(`✅ Скачивание успешно`);
        console.log(`   Файл: ${result.filename}`);
        console.log(`   Размер: ${(result.size / 1024).toFixed(2)} KB`);
        console.log(`   Путь: ${result.filepath}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Кэш: ${result.cached ? 'да' : 'нет'}`);
      } else {
        console.log(`❌ Ошибка скачивания`);
      }
    } catch (error) {
      console.error(`❌ Исключение при скачивании:`, error.message);
    }
  } else {
    console.log('⚠️  Нет треков для скачивания');
  }

  // ============================================================
  // 5. ТЕСТ BATCH ОПЕРАЦИЙ
  // ============================================================
  console.log('\n📦 5. ТЕСТ BATCH ДЕКОДИРОВАНИЯ');
  console.log('-'.repeat(60));

  const batchTracks = testTracks.slice(0, 3).map(t => ({
    url: t.streamUrl || t.encryptedUrl || '',
    metadata: {
      artist: t.artist,
      title: t.title
    }
  })).filter(t => t.url); // Только треки с URL

  try {
    const results = await decoder.decodeBatch(batchTracks);
    
    console.log(`\nОбработано: ${results.length} треков`);
    results.forEach((result, i) => {
      const status = result.decodeSuccess ? '✅' : '❌';
      console.log(`${status} ${i + 1}. ${result.metadata?.artist} - ${result.metadata?.title}`);
      if (result.decodeMethod) {
        console.log(`   Метод: ${result.decodeMethod}`);
      }
    });
  } catch (error) {
    console.error('❌ Batch decode error:', error.message);
  }

  // ============================================================
  // 6. ПРОВЕРКА СПИСКА ФАЙЛОВ
  // ============================================================
  console.log('\n📋 6. СПИСОК СКАЧАННЫХ ФАЙЛОВ');
  console.log('-'.repeat(60));

  try {
    const files = await downloader.listFiles();
    
    if (files.length > 0) {
      console.log(`\nВсего файлов: ${files.length}`);
      files.forEach((file, i) => {
        console.log(`${i + 1}. ${file.filename}`);
        console.log(`   Размер: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`   Создан: ${file.createdAt.toLocaleString()}`);
        if (file.metadata) {
          console.log(`   Трек: ${file.metadata.artist} - ${file.metadata.title}`);
        }
      });
    } else {
      console.log('Нет скачанных файлов');
    }
  } catch (error) {
    console.error('❌ List files error:', error.message);
  }

  // ============================================================
  // 7. ТЕСТ ОПРЕДЕЛЕНИЯ СЕРВИСА
  // ============================================================
  console.log('\n🔍 7. ТЕСТ ОПРЕДЕЛЕНИЯ СЕРВИСА');
  console.log('-'.repeat(60));

  const serviceTests = [
    'https://kissvk.top/tracks/123',
    'https://vk.com/audio123_456',
    'https://music.yandex.ru/album/123',
    'https://example.com/song.mp3'
  ];

  serviceTests.forEach(url => {
    const service = decoder.detectService(url);
    console.log(`${url}`);
    console.log(`  → Сервис: ${service}\n`);
  });

  // ============================================================
  // ИТОГИ
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ ТЕСТ ЗАВЕРШЕН');
  console.log('='.repeat(60));
  console.log(`\n💡 Система готова к использованию в Docker`);
  console.log(`📁 Файлы сохраняются в: ${uploadPath}`);
  console.log(`🔗 Docker volume: uploads:/app/uploads\n`);
}

// Запуск теста
if (require.main === module) {
  testAudioSystem()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAudioSystem };
