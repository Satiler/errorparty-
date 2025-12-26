#!/usr/bin/env node

/**
 * 🎵 ИМПОРТ ПОПУЛЯРНОЙ МУЗЫКИ
 * ============================
 * Стратегия: iTunes RSS (метаданные) → Lmusic.kz (полные треки)
 * 
 * 1. Получаем информацию о топ-треках из iTunes Charts (без API ключей)
 * 2. Для каждого трека ищем ПОЛНУЮ версию на Lmusic.kz
 * 3. Импортируем в базу данных
 */

const axios = require('axios');
const { Track, Album, Playlist, PlaylistTrack, User } = require('./src/models');
const { Op, Sequelize } = require('sequelize');

// ============ ITUNES RSS API ============

class ItunesChartsAPI {
  constructor() {
    this.baseUrl = 'https://itunes.apple.com';
  }

  /**
   * Получить топ-песни по стране
   */
  async getTopSongs(country = 'us', limit = 100) {
    try {
      console.log(`🌍 Загружаем топ-${limit} из ${country.toUpperCase()} (iTunes RSS)...`);
      
      const url = `${this.baseUrl}/${country}/rss/topsongs/limit=${limit}/json`;
      const response = await axios.get(url, { timeout: 15000 });

      const entries = response.data.feed.entry || [];
      
      const tracks = entries.map((entry, index) => ({
        position: index + 1,
        title: this.cleanText(entry['im:name'].label),
        artist: this.cleanText(entry['im:artist'].label),
        album: entry['im:collection']?.['im:name']?.label || null,
        releaseDate: entry['im:releaseDate']?.label || null,
        genre: entry.category?.attributes?.label || 'Pop',
        coverUrl: entry['im:image']?.[2]?.label || null, // большое изображение
        country: country.toUpperCase()
      }));

      console.log(`✅ Получено ${tracks.length} треков из iTunes\n`);
      return tracks;
      
    } catch (error) {
      console.error(`❌ Ошибка iTunes API (${country}):`, error.message);
      return [];
    }
  }

  /**
   * Получить топ-альбомы
   */
  async getTopAlbums(country = 'us', limit = 50) {
    try {
      console.log(`💿 Загружаем топ-${limit} альбомов из ${country.toUpperCase()}...`);
      
      const url = `${this.baseUrl}/${country}/rss/topalbums/limit=${limit}/json`;
      const response = await axios.get(url, { timeout: 15000 });

      const entries = response.data.feed.entry || [];
      
      const albums = entries.map((entry, index) => ({
        position: index + 1,
        title: this.cleanText(entry['im:name'].label),
        artist: this.cleanText(entry['im:artist'].label),
        releaseDate: entry['im:releaseDate']?.label || null,
        genre: entry.category?.attributes?.label || 'Pop',
        trackCount: parseInt(entry['im:itemCount']?.label) || 0,
        coverUrl: entry['im:image']?.[2]?.label || null,
        country: country.toUpperCase()
      }));

      console.log(`✅ Получено ${albums.length} альбомов\n`);
      return albums;
      
    } catch (error) {
      console.error(`❌ Ошибка получения альбомов:`, error.message);
      return [];
    }
  }

  cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }
}

// ============ LMUSIC.KZ SERVICE (использует существующий сервис) ============

// Импортируем готовый Lmusic сервис вместо создания нового
const lmusicService = require('./src/modules/music/lmusic-kz.service');

class LmusicSearchAPI {
  /**
   * Поиск трека на Lmusic.kz через существующий сервис
   */
  async searchTrack(artist, title) {
    try {
      const query = `${artist} ${title}`;
      console.log(`  🔍 Поиск: "${query}"`);

      // Используем существующий метод searchTracks
      const tracks = await lmusicService.searchTracks(query, 3);
      
      if (!tracks || tracks.length === 0) {
        console.log(`  ❌ Не найдено на Lmusic.kz`);
        return null;
      }

      // Берем первый результат
      const track = tracks[0];
      
      // Проверяем наличие ID и slug для получения реального URL
      if (!track.id || !track.slug) {
        console.log(`  ⚠️  Найдено, но нет ID/slug для получения ссылки`);
        return null;
      }

      // Получаем детальную информацию о треке (включая реальный MP3 URL)
      console.log(`  📥 Получаем прямую ссылку...`);
      const trackDetails = await lmusicService.getTrackDetails(track.slug, track.id);
      
      if (!trackDetails || !trackDetails.streamUrl) {
        console.log(`  ⚠️  Не удалось получить прямую ссылку`);
        return null;
      }
      
      console.log(`  ✅ Найдено: ${trackDetails.artist} - ${trackDetails.title}`);
      
      return {
        title: trackDetails.title || title,
        artist: trackDetails.artist || artist,
        streamUrl: trackDetails.streamUrl,
        duration: trackDetails.duration || null,
        coverUrl: trackDetails.coverUrl || null,
        source: 'lmusic'
      };

    } catch (error) {
      console.log(`  ❌ Ошибка поиска: ${error.message}`);
      return null;
    }
  }

  /**
   * Получить информацию об альбоме и его треках
   */
  async getAlbumTracks(artist, albumTitle) {
    try {
      console.log(`  🔍 Поиск альбома: ${artist} - ${albumTitle}`);

      // Ищем по названию альбома
      const query = `${artist} ${albumTitle}`;
      const tracks = await lmusicService.searchTracks(query, 10);
      
      if (!tracks || tracks.length === 0) {
        console.log(`  ❌ Альбом не найден`);
        return null;
      }

      console.log(`  ✅ Найдено треков: ${tracks.length}`);
      
      return {
        title: albumTitle,
        artist: artist,
        coverUrl: tracks[0].coverUrl || null,
        tracks: tracks.map(t => ({
          title: t.title,
          url: t.streamUrl,
          duration: t.duration
        }))
      };

    } catch (error) {
      console.log(`  ❌ Ошибка получения альбома: ${error.message}`);
      return null;
    }
  }
}

// ============ ГЛАВНАЯ ЛОГИКА ============

const itunesAPI = new ItunesChartsAPI();
const lmusicAPI = new LmusicSearchAPI();

/**
 * Импорт топ-треков из iTunes → Lmusic.kz
 */
async function importTopTracks(countries = ['us', 'ru', 'gb'], limitPerCountry = 50) {
  console.log('\n🎵 ===== ИМПОРТ ПОПУЛЯРНЫХ ТРЕКОВ =====\n');
  console.log(`📍 Страны: ${countries.join(', ')}`);
  console.log(`📊 Лимит на страну: ${limitPerCountry}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const country of countries) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📍 СТРАНА: ${country.toUpperCase()}`);
    console.log('='.repeat(50) + '\n');

    // Получаем топ из iTunes
    const chartTracks = await itunesAPI.getTopSongs(country, limitPerCountry);
    
    if (chartTracks.length === 0) {
      console.log(`⚠️  Нет данных для ${country}, пропускаем\n`);
      continue;
    }

    let imported = 0;
    let skipped = 0;
    let notFound = 0;

    for (const [index, chartTrack] of chartTracks.entries()) {
      console.log(`\n[${index + 1}/${chartTracks.length}] #${chartTrack.position} ${chartTrack.artist} - ${chartTrack.title}`);
      console.log(`  📂 Жанр: ${chartTrack.genre}`);

      // Проверяем, есть ли уже в базе
      const existing = await Track.findOne({
        where: {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('artist')),
              Sequelize.fn('LOWER', chartTrack.artist)
            ),
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('title')),
              Sequelize.fn('LOWER', chartTrack.title)
            )
          ]
        }
      });

      if (existing) {
        console.log(`  ⏭️  Уже в базе (ID: ${existing.id})`);
        
        // Обновляем метаданные
        await existing.update({
          popularityScore: (100 - chartTrack.position) * 10,
          chartPosition: chartTrack.position,
          trendingDate: new Date(),
          coverUrl: chartTrack.coverUrl || existing.coverUrl,
          genre: chartTrack.genre || existing.genre
        });
        
        skipped++;
        continue;
      }

      // Ищем на Lmusic.kz
      const lmusicTrack = await lmusicAPI.searchTrack(chartTrack.artist, chartTrack.title);

      if (!lmusicTrack) {
        console.log(`  ❌ Не найден на Lmusic.kz`);
        notFound++;
        continue;
      }

      // Создаем трек в базе
      const newTrack = await Track.create({
        title: lmusicTrack.title,
        artist: lmusicTrack.artist,
        streamUrl: lmusicTrack.streamUrl,
        coverUrl: lmusicTrack.coverUrl || chartTrack.coverUrl,
        duration: lmusicTrack.duration,
        genre: chartTrack.genre,
        popularityScore: (100 - chartTrack.position) * 10,
        chartPosition: chartTrack.position,
        trendingDate: new Date(),
        importSource: `itunes-${country}`,
        sourceType: 'lmusic',
        playCountExternal: 0
      });

      console.log(`  💾 Импортирован (ID: ${newTrack.id})`);
      imported++;

      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Итоги по ${country.toUpperCase()}:`);
    console.log(`  ✅ Импортировано: ${imported}`);
    console.log(`  ⏭️  Уже были: ${skipped}`);
    console.log(`  ❌ Не найдено: ${notFound}`);

    totalImported += imported;
    totalSkipped += skipped;
    totalNotFound += notFound;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 ОБЩИЕ ИТОГИ');
  console.log('='.repeat(50));
  console.log(`✅ Импортировано: ${totalImported}`);
  console.log(`⏭️  Уже были в базе: ${totalSkipped}`);
  console.log(`❌ Не найдено: ${totalNotFound}`);
  console.log(`📈 Успешность: ${Math.round((totalImported + totalSkipped) / (totalImported + totalSkipped + totalNotFound) * 100)}%\n`);

  return { imported: totalImported, skipped: totalSkipped, notFound: totalNotFound };
}

/**
 * Импорт популярных альбомов
 */
async function importTopAlbums(countries = ['us', 'ru'], limitPerCountry = 20) {
  console.log('\n💿 ===== ИМПОРТ ПОПУЛЯРНЫХ АЛЬБОМОВ =====\n');

  let totalAlbums = 0;
  let totalTracks = 0;

  for (const country of countries) {
    console.log(`\n📍 СТРАНА: ${country.toUpperCase()}\n`);

    const chartAlbums = await itunesAPI.getTopAlbums(country, limitPerCountry);
    
    for (const chartAlbum of chartAlbums) {
      console.log(`\n[${chartAlbum.position}] ${chartAlbum.artist} - ${chartAlbum.title}`);

      // Проверяем альбом в базе
      let [album, created] = await Album.findOrCreate({
        where: {
          title: chartAlbum.title,
          artist: chartAlbum.artist
        },
        defaults: {
          title: chartAlbum.title,
          artist: chartAlbum.artist,
          releaseDate: chartAlbum.releaseDate ? new Date(chartAlbum.releaseDate) : null,
          genre: chartAlbum.genre,
          coverUrl: chartAlbum.coverUrl,
          popularity: 100 - chartAlbum.position
        }
      });

      if (!created) {
        console.log(`  ⏭️  Альбом уже есть (ID: ${album.id})`);
        continue;
      }

      console.log(`  ✅ Альбом создан (ID: ${album.id})`);
      totalAlbums++;

      // Ищем треки альбома на Lmusic.kz
      const lmusicAlbum = await lmusicAPI.getAlbumTracks(chartAlbum.artist, chartAlbum.title);

      if (!lmusicAlbum || !lmusicAlbum.tracks || lmusicAlbum.tracks.length === 0) {
        console.log(`  ⚠️  Треки альбома не найдены на Lmusic.kz`);
        continue;
      }

      // Импортируем треки
      let tracksImported = 0;
      for (const lmusicTrack of lmusicAlbum.tracks) {
        if (!lmusicTrack.url) continue;

        const [track, trackCreated] = await Track.findOrCreate({
          where: {
            title: lmusicTrack.title,
            artist: chartAlbum.artist
          },
          defaults: {
            title: lmusicTrack.title,
            artist: chartAlbum.artist,
            albumId: album.id,
            streamUrl: lmusicTrack.url,
            duration: lmusicTrack.duration,
            genre: chartAlbum.genre,
            coverUrl: lmusicAlbum.coverUrl,
            importSource: `itunes-album-${country}`,
            sourceType: 'lmusic'
          }
        });

        if (trackCreated) {
          tracksImported++;
          totalTracks++;
        }
      }

      console.log(`  💾 Импортировано треков: ${tracksImported}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 ИТОГИ:`);
  console.log(`  💿 Альбомов: ${totalAlbums}`);
  console.log(`  🎵 Треков: ${totalTracks}\n`);

  return { albums: totalAlbums, tracks: totalTracks };
}

/**
 * Создать/обновить плейлист "Мировые хиты"
 */
async function updateGlobalHitsPlaylist() {
  console.log('\n🎵 Обновление плейлиста "Мировые хиты"...\n');

  // Находим системного пользователя
  let systemUser = await User.findOne({ where: { username: 'system' } });
  if (!systemUser) {
    systemUser = await User.create({
      username: 'system',
      email: 'system@errorparty.ru',
      password: 'system',
      isAdmin: true
    });
  }

  // Находим или создаем плейлист
  let [playlist, created] = await Playlist.findOrCreate({
    where: { title: 'Мировые хиты 2025', userId: systemUser.id },
    defaults: {
      title: 'Мировые хиты 2025',
      description: 'Топ-100 самых популярных треков по версии iTunes Charts. Автоматически обновляется.',
      isPublic: true,
      userId: systemUser.id,
      type: 'editorial'
    }
  });

  if (created) {
    console.log(`✅ Плейлист создан (ID: ${playlist.id})`);
  }

  // Удаляем старые треки
  await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });

  // Получаем топ-100 треков
  const topTracks = await Track.findAll({
    where: {
      chartPosition: { [Op.ne]: null },
      streamUrl: { [Op.ne]: null }
    },
    order: [['chartPosition', 'ASC']],
    limit: 100
  });

  // Добавляем в плейлист
  for (const [index, track] of topTracks.entries()) {
    await PlaylistTrack.create({
      playlistId: playlist.id,
      trackId: track.id,
      position: index + 1
    });
  }

  console.log(`✅ Добавлено ${topTracks.length} треков в плейлист\n`);

  return playlist;
}

// ============ ЗАПУСК ============

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🎵 ИМПОРТ МУЗЫКИ: ITUNES → LMUSIC.KZ');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Импорт топ-треков из нескольких стран
    await importTopTracks(['us', 'ru', 'gb', 'de'], 50);

    // 2. Импорт популярных альбомов
    await importTopAlbums(['us', 'ru'], 15);

    // 3. Обновление плейлиста
    await updateGlobalHitsPlaylist();

    console.log('\n✅ Импорт завершен успешно!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  main();
}

module.exports = { importTopTracks, importTopAlbums, updateGlobalHitsPlaylist };
