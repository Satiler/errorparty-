#!/usr/bin/env node
/**
 * KissVK.top Scraper — извлекает треки с VK Music через kissvk.top
 * Использует Puppeteer для выполнения JS-декодера VK Audio
 * 
 * Использование:
 *   node kissvk-scraper.js --url=/tracks_chart --limit=20 --output=tracks.json
 *   node kissvk-scraper.js --url=/albums_chart --limit=10
 *   node kissvk-scraper.js --url=/playlist-2000753343_25753343_ce3a98a09f3a21c9e0 --output=album.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Парсинг аргументов командной строки
function parseArgs() {
  const args = {
    url: '/tracks_chart',    // Страница для скрейпинга
    limit: 50,               // Лимит треков
    output: null,            // Путь для сохранения JSON (если null — вывод в консоль)
    headless: true,          // Headless режим браузера
    timeout: 60000,          // Таймаут загрузки страницы (мс)
    waitForDecode: 5000,     // Время ожидания декодирования (мс)
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--url=')) args.url = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) args.limit = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--output=')) args.output = arg.split('=')[1];
    else if (arg === '--no-headless') args.headless = false;
    else if (arg.startsWith('--timeout=')) args.timeout = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--wait=')) args.waitForDecode = parseInt(arg.split('=')[1]);
  }

  return args;
}

// Декодирование VK Audio data-audio атрибута (выполняется в браузере)
function decodeVkAudio(encodedString) {
  try {
    // Эта функция будет вызвана в контексте страницы kissvk.top,
    // где уже загружены /js/cr.js и /js/cr-format.js
    if (typeof window.vkDecode === 'function') {
      return window.vkDecode(encodedString);
    }
    // Если декодер не найден, возвращаем null
    return null;
  } catch (error) {
    console.error('Ошибка декодирования:', error);
    return null;
  }
}

// Извлечение треков со страницы (выполняется в контексте браузера)
async function extractTracksFromPage() {
  const tracks = [];
  
  // Ждём загрузки аудио элементов
  const audioElements = document.querySelectorAll('.audio[data-id][data-audio]');
  
  for (const audioEl of audioElements) {
    try {
      const trackId = audioEl.getAttribute('data-id');
      const encodedAudio = audioEl.getAttribute('data-audio');
      const coverUrl = audioEl.getAttribute('data-cover');
      
      // Artist
      const authorEl = audioEl.querySelector('.author');
      let artist = 'Unknown Artist';
      if (authorEl) {
        const artistLinks = authorEl.querySelectorAll('a');
        artist = Array.from(artistLinks).map(a => a.textContent.trim()).join(', ');
      }
      
      // Title
      const titleEl = audioEl.querySelector('.info .title');
      const title = titleEl ? titleEl.textContent.trim() : 'Unknown Track';
      
      // Duration
      const durationEl = audioEl.querySelector('.duration');
      const duration = durationEl ? durationEl.textContent.trim() : '00:00';
      const durationSeconds = durationEl ? parseInt(durationEl.getAttribute('data-duration')) : 0;
      
      // Chart position (если есть)
      const chartPosEl = audioEl.querySelector('.chart_position');
      const chartPosition = chartPosEl ? parseInt(chartPosEl.textContent.trim()) : null;
      
      // Декодирование URL (если доступен декодер на странице)
      let streamUrl = null;
      
      // Попытка 1: Использовать встроенный декодер kissvk.top
      if (encodedAudio && window.cr && typeof window.cr === 'function') {
        try {
          streamUrl = window.cr(encodedAudio);
        } catch (e) {
          console.log('Не удалось декодировать через cr()');
        }
      }
      
      // Попытка 2: Проверить атрибут src у audio элемента
      if (!streamUrl) {
        const audioPlayer = document.querySelector('#audio');
        if (audioPlayer && audioPlayer.src && audioPlayer.src.startsWith('http')) {
          // Если плеер уже загрузил этот трек
          const currentPlayingId = audioPlayer.getAttribute('data-current-id');
          if (currentPlayingId === trackId) {
            streamUrl = audioPlayer.src;
          }
        }
      }
      
      tracks.push({
        trackId,
        artist,
        title,
        duration,
        durationSeconds,
        chartPosition,
        streamUrl,
        encodedAudio: streamUrl ? null : encodedAudio, // Сохраняем зашифрованный URL если не удалось декодировать
        coverUrl,
        source: 'kissvk.top',
        scrapedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Ошибка обработки трека:', error);
    }
  }
  
  return tracks;
}

// Основная функция скрейпинга
async function scrapeKissVK(args) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  KissVK.top Scraper (VK Music)');
  console.log('═══════════════════════════════════════════════\n');
  
  console.log(`[scrapeKissVK] Запуск скрейпера kissvk.top`);
  console.log(`[scrapeKissVK] URL: ${args.url}, Лимит: ${args.limit}`);
  
  const browser = await puppeteer.launch({
    headless: args.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Устанавливаем User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const fullUrl = `https://kissvk.top${args.url}`;
  console.log(`[scrapeKissVK] Загрузка страницы: ${fullUrl}`);
  
  try {
    // Загружаем страницу
    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: args.timeout
    });
    
    console.log(`[scrapeKissVK] Ожидание декодирования треков (${args.waitForDecode}мс)...`);
    
    // Ждём загрузки JS декодера и выполнения скриптов
    await page.waitForTimeout(args.waitForDecode);
    
    // Извлекаем треки
    console.log(`[scrapeKissVK] Извлечение треков...`);
    const tracks = await page.evaluate(extractTracksFromPage);
    
    console.log(`[scrapeKissVK] Извлечено треков: ${tracks.length}`);
    
    // Ограничиваем по лимиту
    const limitedTracks = tracks.slice(0, args.limit);
    console.log(`[scrapeKissVK] Применён лимит: ${limitedTracks.length} треков`);
    
    await browser.close();
    
    // Статистика
    const withUrls = limitedTracks.filter(t => t.streamUrl).length;
    const withEncoded = limitedTracks.filter(t => t.encodedAudio).length;
    
    console.log(`\n📊 Статистика:`);
    console.log(`   • Треков с расшифрованным URL: ${withUrls}`);
    console.log(`   • Треков с зашифрованным URL: ${withEncoded}`);
    
    // Сохранение или вывод
    if (args.output) {
      const outputPath = path.resolve(args.output);
      await fs.writeFile(outputPath, JSON.stringify(limitedTracks, null, 2));
      console.log(`\n✅ Треки сохранены в: ${outputPath}`);
    } else {
      console.log('\n📄 JSON результат:\n');
      console.log(JSON.stringify(limitedTracks, null, 2));
    }
    
    console.log(`\n📊 Всего треков: ${limitedTracks.length}\n`);
    console.log('✅ Готово!');
    
    return limitedTracks;
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    await browser.close();
    throw error;
  }
}

// Запуск
if (require.main === module) {
  const args = parseArgs();
  scrapeKissVK(args).catch(error => {
    console.error('Фатальная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { scrapeKissVK };
