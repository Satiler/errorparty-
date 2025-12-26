#!/usr/bin/env node
/**
 * Sefon.pro Scraper — извлекает треки со страниц /news/, /genres/, /top/, /artist/, /collections/
 * Использует Puppeteer для выполнения JS-декодера на стороне клиента
 * 
 * Использование:
 *   node sefon-scraper.js --url=/news/ --limit=10 --output=tracks.json
 *   node sefon-scraper.js --url=/genres/pop/ --pages=3
 *   node sefon-scraper.js --url=/artist/1324-eminem/ --limit=20 --output=eminem.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Парсинг аргументов командной строки
function parseArgs() {
  const args = {
    url: '/news/',           // Страница для скрейпинга
    limit: 50,               // Лимит треков
    pages: 1,                // Количество страниц
    output: null,            // Путь для сохранения JSON (если null — вывод в консоль)
    headless: true,          // Headless режим браузера
    proxy: null,             // Прокси (формат: http://ip:port или socks5://ip:port)
    timeout: 30000,          // Таймаут загрузки страницы (мс)
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--url=')) args.url = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) args.limit = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--pages=')) args.pages = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--output=')) args.output = arg.split('=')[1];
    else if (arg === '--no-headless') args.headless = false;
    else if (arg.startsWith('--proxy=')) args.proxy = arg.split('=')[1];
    else if (arg.startsWith('--timeout=')) args.timeout = parseInt(arg.split('=')[1]);
  }

  return args;
}

// Извлечение треков со страницы (выполняется в контексте браузера)
async function extractTracksFromPage() {
  const tracks = [];
  
  // Ждём загрузки треков
  const mp3Elements = document.querySelectorAll('.mp3[data-mp3_id]');
  
  for (const mp3El of mp3Elements) {
    try {
      const mp3Id = mp3El.getAttribute('data-mp3_id');
      
      // Artist
      const artistEl = mp3El.querySelector('.artist_name a');
      const artist = artistEl ? artistEl.textContent.trim() : 'Unknown Artist';
      
      // Title
      const titleEl = mp3El.querySelector('.song_name a');
      const title = titleEl ? titleEl.textContent.trim() : 'Unknown Track';
      
      // Duration
      const durationEl = mp3El.querySelector('.duration .value');
      const duration = durationEl ? durationEl.textContent.trim() : '00:00';
      
      // Date added
      const dateEl = mp3El.querySelector('.date_add');
      const dateAdded = dateEl ? dateEl.textContent.trim() : null;
      
      // Likes/Dislikes
      const likeEl = mp3El.querySelector('.like.like .count');
      const dislikeEl = mp3El.querySelector('.like.dislike .count');
      const likes = likeEl ? parseInt(likeEl.textContent.trim()) : 0;
      const dislikes = dislikeEl ? parseInt(dislikeEl.textContent.trim()) : 0;
      
      // Stream URL из span[data-url] (прямая ссылка на CDN)
      let streamUrl = null;
      const urlEl = mp3El.querySelector('.btns span[data-url]');
      if (urlEl) {
        const dataUrl = urlEl.getAttribute('data-url');
        if (dataUrl && dataUrl.startsWith('http')) {
          streamUrl = dataUrl;
        }
      }
      
      // Track page URL
      const trackPageEl = mp3El.querySelector('.song_name a');
      const trackPageUrl = trackPageEl ? 'https://sefon.pro' + trackPageEl.getAttribute('href') : null;
      
      // Cover image (если есть на странице трека)
      const coverUrl = null; // Будет извлечено позже при необходимости
      
      tracks.push({
        mp3Id,
        artist,
        title,
        duration,
        dateAdded,
        likes,
        dislikes,
        streamUrl,
        trackPageUrl,
        coverUrl,
        source: 'sefon.pro',
        scrapedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[extractTracksFromPage] Ошибка извлечения трека:`, err.message);
    }
  }
  
  return tracks;
}

// Основная функция скрейпинга
async function scrapeSefon(args) {
  console.log(`[scrapeSefon] Запуск скрейпера sefon.pro`);
  console.log(`[scrapeSefon] URL: ${args.url}, Лимит: ${args.limit}, Страниц: ${args.pages}`);
  
  const allTracks = [];
  let browser = null;
  
  try {
    // Настройки браузера
    const launchOptions = {
      headless: args.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security', // Для обхода CORS
      ],
    };
    
    // Добавляем прокси если указан
    if (args.proxy) {
      launchOptions.args.push(`--proxy-server=${args.proxy}`);
      console.log(`[scrapeSefon] Используется прокси: ${args.proxy}`);
    }
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // User-Agent (чтобы выглядеть как обычный браузер)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Обработка страниц
    for (let pageNum = 1; pageNum <= args.pages; pageNum++) {
      const pageUrl = pageNum === 1 
        ? `https://sefon.pro${args.url}` 
        : `https://sefon.pro${args.url}${pageNum}/`;
      
      console.log(`[scrapeSefon] Загрузка страницы ${pageNum}: ${pageUrl}`);
      
      try {
        // Переход на страницу
        await page.goto(pageUrl, {
          waitUntil: 'networkidle2',
          timeout: args.timeout,
        });
        
        // Проверка на гео-блокировку
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('не работает в вашей стране')) {
          console.error(`[scrapeSefon] ❌ Сайт заблокирован в вашей стране. Используйте VPN/прокси.`);
          break;
        }
        
        // Ждём загрузки треков
        await page.waitForSelector('.mp3[data-mp3_id]', { timeout: 10000 });
        
        // Извлекаем треки (URL доступны в data-url атрибутах)
        console.log(`[scrapeSefon] Извлечение треков...`);
        const tracks = await page.evaluate(extractTracksFromPage);
        console.log(`[scrapeSefon] Извлечено треков: ${tracks.length}`);
        
        allTracks.push(...tracks);
        
        // Проверка лимита
        if (allTracks.length >= args.limit) {
          console.log(`[scrapeSefon] Достигнут лимит треков: ${args.limit}`);
          break;
        }
        
        // Небольшая задержка между страницами
        if (pageNum < args.pages) {
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        }
        
      } catch (err) {
        console.error(`[scrapeSefon] Ошибка загрузки страницы ${pageNum}:`, err.message);
      }
    }
    
  } catch (err) {
    console.error(`[scrapeSefon] Критическая ошибка:`, err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Обрезаем до лимита
  const finalTracks = allTracks.slice(0, args.limit);
  
  console.log(`[scrapeSefon] Всего извлечено треков: ${finalTracks.length}`);
  
  return finalTracks;
}

// Главная функция
async function main() {
  const args = parseArgs();
  
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Sefon.pro Scraper`);
  console.log(`═══════════════════════════════════════════════\n`);
  
  const tracks = await scrapeSefon(args);
  
  // Вывод результата
  if (args.output) {
    const outputPath = path.resolve(args.output);
    await fs.writeFile(outputPath, JSON.stringify(tracks, null, 2), 'utf-8');
    console.log(`\n✅ Треки сохранены в: ${outputPath}`);
    console.log(`📊 Всего треков: ${tracks.length}\n`);
  } else {
    console.log(`\n📋 Результат (JSON):\n`);
    console.log(JSON.stringify(tracks, null, 2));
  }
  
  // Статистика
  const withStreamUrl = tracks.filter(t => t.streamUrl).length;
  const withoutStreamUrl = tracks.length - withStreamUrl;
  
  console.log(`\n📊 Статистика:`);
  console.log(`   • Треков с URL: ${withStreamUrl}`);
  console.log(`   • Треков без URL: ${withoutStreamUrl}`);
  
  if (withoutStreamUrl > 0) {
    console.log(`\n⚠️  Предупреждение: ${withoutStreamUrl} треков без streamUrl`);
    console.log(`   Возможные причины:`);
    console.log(`   • JS-декодер не успел выполниться (увеличьте waitForTimeout)`);
    console.log(`   • Изменилась структура страницы sefon.pro`);
    console.log(`   • Требуется авторизация для доступа к некоторым трекам`);
  }
  
  console.log(`\n✅ Готово!\n`);
}

// Запуск
if (require.main === module) {
  main().catch(err => {
    console.error(`\n❌ Фатальная ошибка:`, err);
    process.exit(1);
  });
}

module.exports = { scrapeSefon };
