#!/usr/bin/env node
/**
 * KissVK.top Import — импортирует треки из JSON в базу через API
 * 
 * Использование:
 *   node kissvk-import.js --input=tracks.json --api=http://localhost:3001/api
 *   node kissvk-import.js --input=tracks.json --dry-run
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

// Парсинг аргументов
function parseArgs() {
  const args = {
    input: 'tracks.json',                           // Путь к JSON с треками
    api: 'http://localhost:3001/api',               // Базовый URL API
    endpoint: '/music/tracks',                      // Endpoint для создания треков
    dryRun: false,                                  // Сухой прогон (не отправляет запросы)
    concurrent: 3,                                  // Количество одновременных запросов
    delay: 500,                                     // Задержка между батчами (мс)
    authToken: null,                                // JWT токен авторизации (если требуется)
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--input=')) args.input = arg.split('=')[1];
    else if (arg.startsWith('--api=')) args.api = arg.split('=')[1];
    else if (arg.startsWith('--endpoint=')) args.endpoint = arg.split('=')[1];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--concurrent=')) args.concurrent = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--delay=')) args.delay = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--token=')) args.authToken = arg.split('=')[1];
  }

  return args;
}

// HTTP(S) запрос (промисифицированный)
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    
    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Подготовка данных трека для API
function prepareTrackData(track) {
  return {
    title: track.title || 'Unknown Track',
    artist: track.artist || 'Unknown Artist',
    duration: track.durationSeconds || 0,
    streamUrl: track.streamUrl,
    coverUrl: track.coverUrl || null,
    source: 'kissvk.top',
    externalId: track.trackId || null,
    metadata: {
      chartPosition: track.chartPosition,
      encodedAudio: track.encodedAudio || null,
    }
  };
}

// Импорт треков
async function importTracks(args) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  KissVK.top Import');
  console.log('═══════════════════════════════════════════════\n');
  
  // Чтение JSON файла
  const inputPath = path.resolve(args.input);
  console.log(`[importTracks] Чтение файла: ${inputPath}`);
  
  const fileContent = await fs.readFile(inputPath, 'utf-8');
  const tracks = JSON.parse(fileContent);
  
  console.log(`[importTracks] Загружено треков: ${tracks.length}`);
  
  if (args.dryRun) {
    console.log('\n🧪 DRY RUN режим - запросы не будут отправлены\n');
  }
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  // Обработка батчами
  for (let i = 0; i < tracks.length; i += args.concurrent) {
    const batch = tracks.slice(i, i + args.concurrent);
    
    const promises = batch.map(async (track, idx) => {
      const trackNum = i + idx + 1;
      const trackData = prepareTrackData(track);
      
      // Пропускаем треки без URL
      if (!trackData.streamUrl) {
        console.log(`[${trackNum}/${tracks.length}] ⏭️  ПРОПУЩЕН: ${track.artist} - ${track.title} (нет URL)`);
        results.skipped++;
        return;
      }
      
      if (args.dryRun) {
        console.log(`[${trackNum}/${tracks.length}] 🧪 DRY: ${track.artist} - ${track.title}`);
        results.success++;
        return;
      }
      
      try {
        const url = args.api + args.endpoint;
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (args.authToken) {
          headers['Authorization'] = `Bearer ${args.authToken}`;
        }
        
        const response = await httpRequest(url, {
          method: 'POST',
          headers,
          body: trackData
        });
        
        if (response.status >= 200 && response.status < 300) {
          console.log(`[${trackNum}/${tracks.length}] ✅ OK: ${track.artist} - ${track.title}`);
          results.success++;
        } else {
          console.log(`[${trackNum}/${tracks.length}] ❌ FAIL (${response.status}): ${track.artist} - ${track.title}`);
          results.failed++;
          results.errors.push({
            track: `${track.artist} - ${track.title}`,
            status: response.status,
            error: response.data
          });
        }
      } catch (error) {
        console.log(`[${trackNum}/${tracks.length}] ❌ ERROR: ${track.artist} - ${track.title}`);
        console.log(`    Причина: ${error.message}`);
        results.failed++;
        results.errors.push({
          track: `${track.artist} - ${track.title}`,
          error: error.message
        });
      }
    });
    
    await Promise.all(promises);
    
    // Задержка между батчами
    if (i + args.concurrent < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, args.delay));
    }
  }
  
  // Итоговая статистика
  console.log('\n═══════════════════════════════════════════════');
  console.log('  📊 Статистика импорта');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`✅ Успешно импортировано: ${results.success}`);
  console.log(`❌ Ошибок: ${results.failed}`);
  console.log(`⏭️  Пропущено (нет URL): ${results.skipped}`);
  console.log(`📊 Всего обработано: ${tracks.length}\n`);
  
  if (results.errors.length > 0) {
    console.log('❌ Список ошибок:\n');
    results.errors.slice(0, 10).forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.track}`);
      console.log(`   Ошибка: ${JSON.stringify(err.error || err.status)}`);
    });
    
    if (results.errors.length > 10) {
      console.log(`\n... и ещё ${results.errors.length - 10} ошибок`);
    }
  }
  
  console.log('\n✅ Готово!');
}

// Запуск
if (require.main === module) {
  const args = parseArgs();
  importTracks(args).catch(error => {
    console.error('\n❌ Фатальная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { importTracks };
