#!/usr/bin/env node
/**
 * Sefon.pro Import — импортирует треки из JSON в базу через API
 * 
 * Использование:
 *   node sefon-import.js --input=tracks.json --api=https://errorparty.ru/api
 *   node sefon-import.js --input=tracks.json --dry-run
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

// Парсинг аргументов
function parseArgs() {
  const args = {
    input: 'tracks.json',                           // Путь к JSON с треками
    api: 'https://errorparty.ru/api',               // Базовый URL API
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

// Конвертация duration (MM:SS) в секунды
function durationToSeconds(duration) {
  if (!duration) return 0;
  const parts = duration.split(':').map(p => parseInt(p));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Подготовка данных трека для API
function prepareTrackData(track) {
  return {
    title: track.title || 'Unknown Track',
    artist: track.artist || 'Unknown Artist',
    duration: durationToSeconds(track.duration),
    streamUrl: track.streamUrl,
    coverUrl: track.coverUrl || null,
    source: 'sefon.pro',
    externalId: track.mp3Id || null,
    metadata: {
      likes: track.likes || 0,
      dislikes: track.dislikes || 0,
      dateAdded: track.dateAdded,
      trackPageUrl: track.trackPageUrl,
      scrapedAt: track.scrapedAt,
    },
  };
}

// Импорт одного трека
async function importTrack(track, args) {
  const url = `${args.api}${args.endpoint}`;
  const trackData = prepareTrackData(track);
  
  if (args.dryRun) {
    console.log(`[DRY-RUN] POST ${url}`);
    console.log(`[DRY-RUN] Body:`, JSON.stringify(trackData, null, 2));
    return { success: true, dryRun: true };
  }
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (args.authToken) {
      headers['Authorization'] = `Bearer ${args.authToken}`;
    }
    
    const response = await httpRequest(url, {
      method: 'POST',
      headers,
      body: trackData,
    });
    
    if (response.status >= 200 && response.status < 300) {
      return { success: true, data: response.data };
    } else {
      return { success: false, error: response.data, status: response.status };
    }
    
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Импорт батча треков
async function importBatch(tracks, args) {
  const results = {
    total: tracks.length,
    success: 0,
    failed: 0,
    errors: [],
  };
  
  console.log(`\n[importBatch] Импорт ${tracks.length} треков (concurrent: ${args.concurrent})...`);
  
  // Разбиваем на батчи
  for (let i = 0; i < tracks.length; i += args.concurrent) {
    const batch = tracks.slice(i, i + args.concurrent);
    
    const promises = batch.map(async (track, idx) => {
      const globalIdx = i + idx + 1;
      console.log(`[${globalIdx}/${tracks.length}] Импорт: ${track.artist} - ${track.title}`);
      
      const result = await importTrack(track, args);
      
      if (result.success) {
        results.success++;
        console.log(`[${globalIdx}/${tracks.length}] ✅ Успешно`);
      } else {
        results.failed++;
        results.errors.push({
          track: `${track.artist} - ${track.title}`,
          error: result.error,
          status: result.status,
        });
        console.error(`[${globalIdx}/${tracks.length}] ❌ Ошибка:`, result.error);
      }
      
      return result;
    });
    
    await Promise.all(promises);
    
    // Задержка между батчами
    if (i + args.concurrent < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, args.delay));
    }
  }
  
  return results;
}

// Главная функция
async function main() {
  const args = parseArgs();
  
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Sefon.pro Import`);
  console.log(`═══════════════════════════════════════════════\n`);
  
  console.log(`📂 Загрузка треков из: ${args.input}`);
  
  // Загрузка JSON
  let tracks = [];
  try {
    const inputPath = path.resolve(args.input);
    const content = await fs.readFile(inputPath, 'utf-8');
    tracks = JSON.parse(content);
    
    if (!Array.isArray(tracks)) {
      throw new Error('JSON должен содержать массив треков');
    }
    
    console.log(`✅ Загружено треков: ${tracks.length}`);
    
  } catch (err) {
    console.error(`❌ Ошибка загрузки JSON:`, err.message);
    process.exit(1);
  }
  
  // Фильтрация треков без streamUrl
  const validTracks = tracks.filter(t => t.streamUrl);
  const invalidTracks = tracks.length - validTracks.length;
  
  if (invalidTracks > 0) {
    console.warn(`\n⚠️  Предупреждение: ${invalidTracks} треков без streamUrl (будут пропущены)`);
  }
  
  if (validTracks.length === 0) {
    console.error(`\n❌ Нет валидных треков для импорта`);
    process.exit(1);
  }
  
  console.log(`\n📊 Треков к импорт��: ${validTracks.length}`);
  console.log(`🔗 API: ${args.api}${args.endpoint}`);
  
  if (args.dryRun) {
    console.log(`\n🧪 DRY-RUN режим (запросы не будут отправлены)\n`);
  }
  
  // Импорт
  const results = await importBatch(validTracks, args);
  
  // Итоговая статистика
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Итоги импорта`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`✅ Успешно:  ${results.success}`);
  console.log(`❌ Ошибок:   ${results.failed}`);
  console.log(`📊 Всего:    ${results.total}`);
  
  if (results.errors.length > 0) {
    console.log(`\n📋 Детали ошибок:`);
    results.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.track}`);
      console.log(`   Статус: ${err.status || 'N/A'}`);
      console.log(`   Ошибка: ${JSON.stringify(err.error)}`);
    });
  }
  
  console.log(`\n✅ Импорт завершён!\n`);
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Запуск
if (require.main === module) {
  main().catch(err => {
    console.error(`\n❌ Фатальная ошибка:`, err);
    process.exit(1);
  });
}

module.exports = { importTrack, importBatch };
