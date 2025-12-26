/**
 * Определяем самые популярные российские и зарубежные альбомы на kissvk
 */
const axios = require('axios');
const cheerio = require('cheerio');

async function findPopularAlbums() {
  console.log('\n🔍 ПОИСК ПОПУЛЯРНЫХ АЛЬБОМОВ НА KISSVK.TOP');
  console.log('=' .repeat(80));
  
  try {
    // 1. Проверяем топ-чарт
    console.log('\n1️⃣ Анализ топ-чарта (tracks_chart)...');
    const chartRes = await axios.get('https://kissvk.top/tracks_chart', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const $chart = cheerio.load(chartRes.data);
    const chartAlbums = new Map();
    
    $chart('a[href^="/album-"]').each((i, el) => {
      const href = $chart(el).attr('href');
      const text = $chart(el).text().trim();
      if (href && text && !chartAlbums.has(href)) {
        chartAlbums.set(href, { url: href, name: text });
      }
    });
    
    console.log(`   Найдено уникальных альбомов в топ-чарте: ${chartAlbums.size}`);
    
    // 2. Проверяем главную страницу
    console.log('\n2️⃣ Анализ главной страницы (свежие/популярные)...');
    const mainRes = await axios.get('https://kissvk.top/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const $main = cheerio.load(mainRes.data);
    const mainAlbums = new Map();
    
    $main('a[href^="/album-"]').each((i, el) => {
      const href = $main(el).attr('href');
      const text = $main(el).text().trim();
      if (href && text && !mainAlbums.has(href)) {
        mainAlbums.set(href, { url: href, name: text });
      }
    });
    
    console.log(`   Найдено уникальных альбомов на главной: ${mainAlbums.size}`);
    
    // 3. Объединяем и классифицируем
    const allAlbums = new Map([...chartAlbums, ...mainAlbums]);
    
    const russianAlbums = [];
    const foreignAlbums = [];
    
    allAlbums.forEach(album => {
      // Проверяем наличие кириллицы и латиницы
      const hasCyrillic = /[А-Яа-яЁё]/.test(album.name);
      const hasLatin = /[A-Za-z]/.test(album.name);
      
      // Популярные российские исполнители (для точной классификации)
      const russianArtists = [
        'MIYAGI', 'Scriptonite', 'GONE.Fludd', 'Моргенштерн', 'Элджей',
        'Скриптонит', 'Джиган', 'Тимати', 'Баста', 'Oxxxymiron', 'Оксимирон',
        'ARTIK', 'ASTI', 'Клава Кока', 'MACAN', 'FEDUK', 'Егор Крид',
        'НАZИМА', 'Слава Марлоу', 'Big Baby Tape', 'Boulevard Depo',
        'Словетский', 'Schokk', 'Markul', 'PHARAOH', 'ЛСП',
        'Каста', 'Гуф', 'Мот', 'Скриптонит', 'ENCLAVE', 'OG Buda',
        'UNNV', 'KIZARU', 'THOMAS MRAZ', 'Платина', 'FACE', 'Rocket',
        'Джарахов', 'XASSA', 'Heronwater', 'MAYOT', 'Sqwore'
      ];
      
      const isRussianArtist = russianArtists.some(artist => 
        album.name.toLowerCase().includes(artist.toLowerCase())
      );
      
      if (hasCyrillic || isRussianArtist) {
        russianAlbums.push(album);
      } else if (hasLatin) {
        foreignAlbums.push(album);
      }
    });
    
    console.log('\n' + '=' .repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ КЛАССИФИКАЦИИ:');
    console.log('=' .repeat(80));
    
    console.log(`\n🇷🇺 РОССИЙСКИЕ АЛЬБОМЫ (${russianAlbums.length}):\n`);
    russianAlbums.slice(0, 30).forEach((album, i) => {
      console.log(`${i + 1}. ${album.name}`);
      console.log(`   ${album.url}\n`);
    });
    
    console.log(`\n🌍 ЗАРУБЕЖНЫЕ АЛЬБОМЫ (${foreignAlbums.length}):\n`);
    foreignAlbums.slice(0, 30).forEach((album, i) => {
      console.log(`${i + 1}. ${album.name}`);
      console.log(`   ${album.url}\n`);
    });
    
    // 4. Дополнительные страницы для расширения списка
    console.log('\n3️⃣ Проверка дополнительных страниц для расширения списка...');
    for (let page = 2; page <= 5; page++) {
      try {
        const pageRes = await axios.get(`https://kissvk.top/?page=${page}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 5000
        });
        
        const $page = cheerio.load(pageRes.data);
        let pageAlbumCount = 0;
        
        $page('a[href^="/album-"]').each((i, el) => {
          const href = $page(el).attr('href');
          const text = $page(el).text().trim();
          
          if (href && text && !allAlbums.has(href)) {
            const hasCyrillic = /[А-Яа-яЁё]/.test(text);
            const hasLatin = /[A-Za-z]/.test(text);
            
            if (hasCyrillic && russianAlbums.length < 50) {
              russianAlbums.push({ url: href, name: text });
              pageAlbumCount++;
            } else if (hasLatin && foreignAlbums.length < 50) {
              foreignAlbums.push({ url: href, name: text });
              pageAlbumCount++;
            }
            
            allAlbums.set(href, { url: href, name: text });
          }
        });
        
        console.log(`   Страница ${page}: добавлено ${pageAlbumCount} новых альбомов`);
      } catch (e) {
        console.log(`   Страница ${page}: ошибка (${e.message})`);
      }
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('✅ ИТОГОВАЯ СТАТИСТИКА:');
    console.log('=' .repeat(80));
    console.log(`🇷🇺 Российских альбомов: ${russianAlbums.length}`);
    console.log(`🌍 Зарубежных альбомов: ${foreignAlbums.length}`);
    console.log(`📦 Всего уникальных альбомов: ${allAlbums.size}`);
    
    // Сохраняем списки для импорта
    const fs = require('fs');
    fs.writeFileSync(
      './popular-albums-data.json',
      JSON.stringify({
        russian: russianAlbums.slice(0, 30),
        foreign: foreignAlbums.slice(0, 30),
        timestamp: new Date().toISOString()
      }, null, 2)
    );
    
    console.log('\n💾 Данные сохранены в popular-albums-data.json');
    console.log('\nГотов к импорту! Запустите: node import-popular-albums.js');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    throw error;
  }
}

findPopularAlbums().catch(console.error);
