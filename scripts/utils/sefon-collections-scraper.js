#!/usr/bin/env node
/**
 * Sefon.pro Collections & Artists Scraper
 * Извлекает исполнителей (/artists/) и подборки (/collections/)
 * 
 * Использование:
 *   node sefon-collections-scraper.js --url=/artists/ --output=artists.json
 *   node sefon-collections-scraper.js --url=/collections/ --output=collections.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Парсинг аргументов
function parseArgs() {
  const args = {
    url: '/artists/',        // /artists/ или /collections/
    output: null,            // Путь для сохранения JSON
    headless: true,          // Headless режим
    proxy: null,             // Прокси
    timeout: 30000,          // Таймаут загрузки
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--url=')) args.url = arg.split('=')[1];
    else if (arg.startsWith('--output=')) args.output = arg.split('=')[1];
    else if (arg === '--no-headless') args.headless = false;
    else if (arg.startsWith('--proxy=')) args.proxy = arg.split('=')[1];
    else if (arg.startsWith('--timeout=')) args.timeout = parseInt(arg.split('=')[1]);
  }

  return args;
}

// Извлечение исполнителей (выполняется в браузере)
async function extractArtists() {
  const artists = [];
  const artistElements = document.querySelectorAll('.b_list_artists .li a');
  
  for (const link of artistElements) {
    try {
      const href = link.getAttribute('href');
      const nameEl = link.querySelector('.name');
      const name = nameEl ? nameEl.textContent.trim() : '';
      const imgEl = link.querySelector('img');
      const photo = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : null;
      
      if (href && name) {
        artists.push({
          name,
          url: 'https://sefon.pro' + href,
          photoUrl: photo ? (photo.startsWith('http') ? photo : 'https://sefon.pro' + photo) : null,
          source: 'sefon.pro',
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[extractArtists] Ошибка:', err.message);
    }
  }
  
  return artists;
}

// Извлечение подборок (выполняется в браузере)
async function extractCollections() {
  const collections = [];
  
  // Ищем все ссылки, которые ведут на /collections/...
  const allLinks = document.querySelectorAll('a[href^="/collections/"]');
  
  const seen = new Set();
  
  for (const link of allLinks) {
    try {
      const href = link.getAttribute('href');
      
      // Пропускаем дубликаты и саму страницу /collections/
      if (!href || href === '/collections/' || seen.has(href)) continue;
      seen.add(href);
      
      // Извлекаем название
      let title = link.textContent.trim();
      
      // Если ссылка внутри li или другого контейнера, берём текст из span/div
      const titleEl = link.querySelector('span, .title, .name');
      if (titleEl) {
        title = titleEl.textContent.trim();
      }
      
      // Ищем изображение
      let imgUrl = null;
      const img = link.querySelector('img');
      if (img) {
        imgUrl = img.getAttribute('data-src') || img.getAttribute('src');
      }
      
      if (title && title.length > 0) {
        collections.push({
          title,
          url: 'https://sefon.pro' + href,
          imageUrl: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : 'https://sefon.pro' + imgUrl) : null,
          source: 'sefon.pro',
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[extractCollections] Ошибка:', err.message);
    }
  }
  
  return collections;
}

// Главная функция скрейпинга
async function scrapeSefonCollections(args) {
  let browser;
  
  try {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  Sefon.pro Collections/Artists Scraper');
    console.log('═══════════════════════════════════════════════\n');
    
    console.log(`[scrape] URL: ${args.url}`);
    
    // Запуск браузера
    const launchOptions = {
      headless: args.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    };
    
    if (args.proxy) {
      launchOptions.args.push(`--proxy-server=${args.proxy}`);
      console.log(`[scrape] Используется прокси: ${args.proxy}`);
    }
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const fullUrl = `https://sefon.pro${args.url}`;
    console.log(`[scrape] Загрузка: ${fullUrl}`);
    
    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: args.timeout,
    });
    
    // Проверка гео-блокировки
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('не работает в вашей стране')) {
      console.error('[scrape] ❌ Сайт заблокирован. Используйте VPN/прокси.');
      return [];
    }
    
    // Определяем тип страницы и извлекаем данные
    let data = [];
    
    if (args.url.includes('/artists')) {
      console.log('[scrape] Извлечение исполнителей...');
      await page.waitForSelector('.b_list_artists .li', { timeout: 10000 });
      data = await page.evaluate(extractArtists);
      console.log(`[scrape] Извлечено исполнителей: ${data.length}`);
    } else if (args.url.includes('/collections')) {
      console.log('[scrape] Извлечение подборок...');
      // Ждём загрузки страницы (подборки могут быть в различных структурах)
      await new Promise(resolve => setTimeout(resolve, 2000));
      data = await page.evaluate(extractCollections);
      console.log(`[scrape] Извлечено подборок: ${data.length}`);
    } else {
      console.error('[scrape] ❌ Неизвестный тип URL. Используйте /artists/ или /collections/');
    }
    
    return data;
    
  } catch (err) {
    console.error(`[scrape] Ошибка: ${err.message}`);
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Главная функция
async function main() {
  try {
    const args = parseArgs();
    const data = await scrapeSefonCollections(args);
    
    // Вывод результата
    if (args.output) {
      const outputPath = path.resolve(args.output);
      await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`\n✅ Данные сохранены в: ${outputPath}`);
      console.log(`📊 Всего записей: ${data.length}\n`);
    } else {
      console.log('\n📋 Результат (JSON):\n');
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('\n✅ Готово!');
    process.exit(0);
    
  } catch (err) {
    console.error(`\n❌ Ошибка: ${err.message}`);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  main();
}

module.exports = { scrapeSefonCollections, extractArtists, extractCollections };
