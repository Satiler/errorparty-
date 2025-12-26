const axios = require('axios');
const cheerio = require('cheerio');

async function parseKissvkAlbums() {
  const albums = [];
  
  const pages = [
    { url: 'https://kissvk.top/albums_chart', name: 'Чарт альбомов' },
    { url: 'https://kissvk.top/new_albums', name: 'Новые альбомы' }
  ];

  for (const page of pages) {
    try {
      console.log(`\n📥 Парсинг: ${page.name}`);
      console.log(`   URL: ${page.url}`);
      
      const response = await axios.get(page.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Ищем ссылки на плейлисты (альбомы)
      $('a[href*="/playlist-"]').each((i, elem) => {
        const href = $(elem).attr('href');
        let fullText = $(elem).text().trim();
        
        if (!href || !fullText) return;
        if (albums.find(a => a.url === href)) return;
        
        // Убираем номер в начале (для чарта)
        fullText = fullText.replace(/^\d+/, '');
        
        // Ищем разделитель "·"
        const parts = fullText.split('·');
        if (parts.length < 2) return;
        
        const year = parts[parts.length - 1].trim();
        const mainPart = parts.slice(0, -1).join('·').trim();
        
        // В kissvk формат: "Название  Исполнитель Жанр"
        // Между названием и исполнителем - два пробела
        // Между исполнителем и жанром - один пробел (обычно слитно)
        
        // Пытаемся найти двойной пробел
        let title, artist, genre;
        
        if (mainPart.includes('  ')) {
          const doubleSplit = mainPart.split('  ');
          title = doubleSplit[0].trim();
          const artistGenre = doubleSplit[1].trim();
          
          // Последнее слово в artistGenre - это жанр
          // Но жанр может быть слитно с исполнителем: "MACANРэп"
          // Ищем границу между латиницей/кириллицей
          const match = artistGenre.match(/^(.+?)\s*([А-Яа-яA-Za-z\-]+)$/);
          if (match) {
            artist = match[1].trim() || 'Unknown';
            genre = match[2].trim();
          } else {
            artist = artistGenre;
            genre = 'Unknown';
          }
        } else {
          // Если нет двойного пробела, используем старую логику
          const words = mainPart.split(/\s+/);
          genre = words[words.length - 1];
          artist = words.slice(0, -1).join(' ') || 'Unknown';
          title = artist;
          artist = 'Unknown';
        }
        
        const fullUrl = href.startsWith('http') ? href : `https://kissvk.top${href}`;
        
        albums.push({
          url: fullUrl,
          title: title,
          artist: artist,
          genre: genre,
          year: year,
          source: page.name,
          rawText: fullText.trim()
        });
      });
      
      console.log(`   ✅ Найдено альбомов: ${albums.filter(a => a.source === page.name).length}`);
      
    } catch (error) {
      console.error(`   ❌ Ошибка парсинга ${page.name}:`, error.message);
    }
  }

  return albums;
}

async function main() {
  console.log('🎵 ПАРСИНГ ПОПУЛЯРНЫХ АЛЬБОМОВ С KISSVK\n');
  
  const albums = await parseKissvkAlbums();
  
  console.log(`\n📊 ИТОГО НАЙДЕНО: ${albums.length} альбомов\n`);
  
  // Группируем по жанрам
  const byGenre = albums.reduce((acc, album) => {
    const genre = album.genre;
    if (!acc[genre]) acc[genre] = [];
    acc[genre].push(album);
    return acc;
  }, {});
  
  console.log('📈 ПО ЖАНРАМ:');
  Object.entries(byGenre).forEach(([genre, list]) => {
    console.log(`   ${genre}: ${list.length} альбомов`);
  });
  
  // Выводим топ-20 альбомов из чарта
  console.log('\n🔥 ТОП-20 ИЗ ЧАРТА:');
  albums
    .filter(a => a.source === 'Чарт альбомов')
    .slice(0, 20)
    .forEach((album, idx) => {
      console.log(`   ${idx + 1}. ${album.artist} - ${album.title} (${album.year})`);
    });
  
  // Российские vs Зарубежные
  const russianKeywords = ['ЛСП', 'MACAN', 'ALBLAK', 'Aarne', 'Toxi$', 'Джиган', 'НЕДРЫ', 
                          'Монеточка', 'Скриптонит', 'Miyagi', 'Элджей', 'Pharaoh'];
  
  const russian = albums.filter(a => 
    russianKeywords.some(kw => a.artist.includes(kw)) ||
    /[А-Яа-я]/.test(a.artist)
  );
  
  const foreign = albums.filter(a => 
    !russianKeywords.some(kw => a.artist.includes(kw)) &&
    !/[А-Яа-я]/.test(a.artist)
  );
  
  console.log(`\n🇷🇺 Российских: ${russian.length}`);
  console.log(`🌍 Зарубежных: ${foreign.length}`);
  
  // Сохраняем в JSON
  const fs = require('fs');
  const outputData = {
    total: albums.length,
    russian: russian.length,
    foreign: foreign.length,
    albums: albums,
    russianAlbums: russian,
    foreignAlbums: foreign
  };
  
  fs.writeFileSync('kissvk-albums-list.json', JSON.stringify(outputData, null, 2));
  console.log('\n💾 Данные сохранены в kissvk-albums-list.json');
  
  return albums;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parseKissvkAlbums };
