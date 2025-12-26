/**
 * Расширенный массовый импорт из разных разделов kissvk.top
 */
const axios = require('axios');
const cheerio = require('cheerio');
const kissvkService = require('./src/services/kissvk.service');
const Track = require('./src/models/Track');
const Album = require('./src/models/Album');

async function exploreAndImport() {
  console.log('\n🔍 ИССЛЕДОВАНИЕ СТРУКТУРЫ KISSVK.TOP');
  console.log('=' .repeat(80));
  
  try {
    // Загрузим главную страницу и посмотрим структуру
    console.log('\n1️⃣ Анализ главной страницы...');
    const response = await axios.get('https://kissvk.top/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Ищем ссылки на категории/жанры
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && href.startsWith('/') && text) {
        links.push({ href, text });
      }
    });
    
    console.log(`   Найдено ссылок: ${links.length}`);
    
    // Выведем уникальные пути
    const uniquePaths = [...new Set(links.map(l => l.href))].slice(0, 20);
    console.log('\n📋 Доступные разделы:');
    uniquePaths.forEach((path, i) => {
      const link = links.find(l => l.href === path);
      console.log(`   ${i + 1}. ${path} - ${link ? link.text : ''}`);
    });
    
    console.log('\n2️⃣ Импорт из доступных разделов...');
    
    const service = kissvkService.getInstance();
    const album = await Album.findOne({
      where: { source: 'kissvk', title: 'KissVK Mass Import' }
    }) || await Album.create({
      title: 'KissVK Mass Import',
      artist: 'Various Artists',
      description: 'Массовый импорт из разных разделов kissvk.top',
      totalTracks: 0,
      isPublic: true,
      source: 'kissvk',
      provider: 'kissvk',
      sourceUrl: 'https://kissvk.top'
    });
    
    let totalNew = 0;
    let totalUpdated = 0;
    
    // Попробуем импортировать из главной страницы с разными параметрами
    const urls = ['/', '/new', '/popular', '/chart', '/trending'];
    
    for (const url of urls) {
      try {
        console.log(`\n   Импорт из ${url}...`);
        const result = await service.extractTracks(url, 50);
        
        if (!result.success || !result.tracks?.length) {
          console.log(`   ⚠️ Нет треков`);
          continue;
        }
        
        console.log(`   Получено ${result.tracks.length} треков`);
        const decrypted = await service.decryptTracks(result.tracks);
        console.log(`   Расшифровано ${decrypted.filter(t => t.streamUrl).length} треков`);
        
        let newCount = 0;
        let updateCount = 0;
        
        for (const track of decrypted) {
          if (!track.streamUrl) continue;
          
          const existing = await Track.findOne({
            where: { provider: 'kissvk', providerTrackId: track.trackId }
          });
          
          if (existing) {
            await existing.update({ streamUrl: track.streamUrl, lastChecked: new Date() });
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
        }
        
        totalNew += newCount;
        totalUpdated += updateCount;
        console.log(`   ✅ Новых: ${newCount}, обновлено: ${updateCount}`);
        
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (err) {
        console.log(`   ❌ Ошибка: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`   Новых треков: ${totalNew}`);
    console.log(`   Обновлено: ${totalUpdated}`);
    
    const total = await Track.count();
    const kissvk = await Track.count({ where: { source: 'kissvk' } });
    console.log(`\n   Всего в БД: ${total}`);
    console.log(`   Из kissvk: ${kissvk}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    process.exit(0);
  }
}

exploreAndImport();
