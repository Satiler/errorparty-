const axios = require('axios');
const cheerio = require('cheerio');
const { Track, Album, User } = require('./src/models');
const { getInstance: getKissVKService } = require('./src/services/kissvk.service');

const kissvkService = getKissVKService();

console.log('\n🎵 ИМПОРТ ПОПУЛЯРНЫХ ТРЕКОВ ИЗ ITUNES CHARTS\n');
console.log('=' .repeat(80));

/**
 * Получить топ треки из iTunes
 */
async function getItunesCharts(country = 'us', limit = 50) {
  console.log(`\n📊 Загрузка iTunes Top ${limit} (${country.toUpperCase()})...`);
  
  try {
    // iTunes RSS Feed API
    const url = `https://itunes.apple.com/${country}/rss/topsongs/limit=${limit}/json`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const entries = response.data.feed.entry || [];
    const tracks = entries.map((entry, index) => ({
      position: index + 1,
      artist: entry['im:artist']?.label || 'Unknown Artist',
      title: entry['im:name']?.label || 'Unknown Track',
      album: entry['im:collection']?.['im:name']?.label || null,
      releaseDate: entry['im:releaseDate']?.label || null,
      genre: entry.category?.attributes?.label || null,
      artwork: entry['im:image']?.[2]?.label || null,
      itunesUrl: entry.link?.attributes?.href || null
    }));

    console.log(`✅ Получено ${tracks.length} треков из iTunes`);
    return tracks;
  } catch (error) {
    console.error('❌ Ошибка загрузки iTunes:', error.message);
    return [];
  }
}

/**
 * Поиск трека на KissVK
 */
async function searchOnKissVK(artist, title) {
  try {
    const searchQuery = `${artist} ${title}`.toLowerCase();
    const url = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const tracks = [];

    $('.track-item, .song-item, [class*="track"]').each((i, elem) => {
      if (i >= 3) return; // Берем только первые 3 результата

      const trackArtist = $(elem).find('[class*="artist"]').text().trim();
      const trackTitle = $(elem).find('[class*="title"], [class*="name"]').text().trim();
      const encryptedUrl = $(elem).find('[data-url], [data-src]').attr('data-url') || 
                          $(elem).find('[data-url], [data-src]').attr('data-src');

      if (encryptedUrl) {
        tracks.push({
          artist: trackArtist || artist,
          title: trackTitle || title,
          encryptedUrl: encryptedUrl
        });
      }
    });

    return tracks[0] || null; // Возвращаем первый результат
  } catch (error) {
    console.error(`   ❌ Ошибка поиска на KissVK: ${error.message}`);
    return null;
  }
}

/**
 * Основная функция импорта
 */
async function importFromItunes() {
  console.log('\n1️⃣ Получение чартов iTunes...\n');
  
  // Получаем треки из разных стран для разнообразия
  const countries = ['us', 'ru'];
  let allItunesTracks = [];

  for (const country of countries) {
    const tracks = await getItunesCharts(country, 30);
    allItunesTracks.push(...tracks.map(t => ({ ...t, country })));
    await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между запросами
  }

  console.log(`\n📊 Всего треков из iTunes: ${allItunesTracks.length}`);
  console.log(`   🇺🇸 US: ${allItunesTracks.filter(t => t.country === 'us').length}`);
  console.log(`   🇷🇺 RU: ${allItunesTracks.filter(t => t.country === 'ru').length}`);

  // Удаляем дубликаты
  const uniqueTracks = allItunesTracks.filter((track, index, self) =>
    index === self.findIndex(t => 
      t.artist.toLowerCase() === track.artist.toLowerCase() && 
      t.title.toLowerCase() === track.title.toLowerCase()
    )
  );

  console.log(`\n🔄 Уникальных треков: ${uniqueTracks.length}\n`);
  console.log('=' .repeat(80));

  let stats = {
    found: 0,
    imported: 0,
    updated: 0,
    errors: 0,
    notFound: []
  };

  // Получаем системного пользователя
  let systemUser = await User.findOne({ where: { username: 'system' } });
  if (!systemUser) {
    systemUser = await User.create({
      username: 'system',
      email: 'system@errorparty.ru',
      passwordHash: 'none'
    });
  }

  console.log('\n2️⃣ Поиск и импорт треков с KissVK...\n');

  for (let i = 0; i < Math.min(uniqueTracks.length, 50); i++) {
    const itunesTrack = uniqueTracks[i];
    const num = `[${(i + 1).toString().padStart(2)}/${Math.min(uniqueTracks.length, 50)}]`;
    
    console.log(`${num} ${itunesTrack.artist} - ${itunesTrack.title}`);
    console.log(`     🌍 ${itunesTrack.country.toUpperCase()} #${itunesTrack.position} | ${itunesTrack.genre || 'Unknown'}`);

    try {
      // Проверяем, есть ли уже такой трек
      const existingTrack = await Track.findOne({
        where: {
          artist: itunesTrack.artist,
          title: itunesTrack.title
        }
      });

      if (existingTrack) {
        console.log(`     ✅ Уже в базе (ID: ${existingTrack.id})`);
        stats.found++;
        continue;
      }

      // Ищем на KissVK
      console.log(`     🔍 Поиск на KissVK...`);
      const kissVKTrack = await searchOnKissVK(itunesTrack.artist, itunesTrack.title);

      if (!kissVKTrack) {
        console.log(`     ⚠️  Не найдено на KissVK`);
        stats.notFound.push(`${itunesTrack.artist} - ${itunesTrack.title}`);
        continue;
      }

      // Декодируем URL
      console.log(`     🔓 Декодирование...`);
      const decrypted = await kissvkService.decryptTracks([kissVKTrack]);
      
      if (!decrypted || decrypted.length === 0 || !decrypted[0].streamUrl) {
        console.log(`     ❌ Ошибка декодирования`);
        stats.errors++;
        continue;
      }

      // Создаем трек в базе
      const newTrack = await Track.create({
        artist: itunesTrack.artist,
        title: itunesTrack.title,
        album: itunesTrack.album,
        streamUrl: decrypted[0].streamUrl,
        coverUrl: itunesTrack.artwork,
        duration: 0,
        source: 'kissvk',
        genre: itunesTrack.genre,
        userId: systemUser.id,
        playCount: 0,
        likeCount: 0
      });

      console.log(`     ✅ Импортировано (ID: ${newTrack.id})`);
      stats.imported++;

      // Пауза между треками
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`     ❌ Ошибка: ${error.message}`);
      stats.errors++;
    }

    console.log('');
  }

  // Итоговая статистика
  console.log('=' .repeat(80));
  console.log('\n✅ ИМПОРТ ЗАВЕРШЕН!\n');
  console.log('📊 Статистика:');
  console.log(`   🆕 Импортировано новых: ${stats.imported}`);
  console.log(`   ✅ Уже в базе: ${stats.found}`);
  console.log(`   ⚠️  Не найдено на KissVK: ${stats.notFound.length}`);
  console.log(`   ❌ Ошибок: ${stats.errors}`);

  if (stats.notFound.length > 0 && stats.notFound.length <= 10) {
    console.log('\n⚠️  Не удалось найти:');
    stats.notFound.forEach((track, i) => {
      console.log(`   ${i + 1}. ${track}`);
    });
  }

  // Общая статистика базы
  const totalTracks = await Track.count();
  const kissVKTracks = await Track.count({ where: { source: 'kissvk' } });
  
  console.log('\n📈 Общая база данных:');
  console.log(`   Всего треков: ${totalTracks}`);
  console.log(`   KissVK треков: ${kissVKTracks}`);
  console.log('');
  console.log('=' .repeat(80));
}

// Запуск
importFromItunes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Критическая ошибка:', err);
    process.exit(1);
  });
