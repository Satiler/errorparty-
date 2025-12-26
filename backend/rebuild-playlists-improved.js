/**
 * УЛУЧШЕННАЯ ВЕРСИЯ: Rebuild Playlists с обложками и актуальными треками
 */
const { Playlist, PlaylistTrack, Track, User } = require('./src/models');
const { Op } = require('sequelize');
const axios = require('axios');

// Загрузка обложки с Last.fm
async function fetchCoverFromLastFM(artist, track) {
  try {
    const API_KEY = 'YOUR_LASTFM_API_KEY'; // Публичный ключ Last.fm
    const url = `http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;
    
    const response = await axios.get(url, { timeout: 5000 });
    const images = response.data?.track?.album?.image || [];
    const largeImage = images.find(img => img.size === 'extralarge') || images.find(img => img.size === 'large');
    
    return largeImage?.['#text'] || null;
  } catch (error) {
    return null;
  }
}

// Загрузка обложки с iTunes
async function fetchCoverFromITunes(artist, track) {
  try {
    const searchQuery = `${artist} ${track}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=1`;
    
    const response = await axios.get(url, { timeout: 5000 });
    const results = response.data?.results || [];
    
    if (results.length > 0) {
      // Получаем обложку высокого разрешения (600x600)
      const artworkUrl = results[0].artworkUrl100?.replace('100x100', '600x600');
      return artworkUrl || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Обновление обложек треков
async function updateTrackCovers(tracks, limit = 50) {
  console.log(`\n🎨 Обновление обложек для ${Math.min(tracks.length, limit)} треков...`);
  
  let updated = 0;
  for (let i = 0; i < Math.min(tracks.length, limit); i++) {
    const track = tracks[i];
    
    if (track.coverUrl) {
      continue; // Уже есть обложка
    }

    try {
      // Пробуем iTunes (быстрее и стабильнее)
      let coverUrl = await fetchCoverFromITunes(track.artist, track.title);
      
      if (coverUrl) {
        await track.update({ coverUrl });
        updated++;
        console.log(`  ✅ ${track.artist} - ${track.title.substring(0, 30)}`);
      }
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`  ⚠️  Ошибка: ${track.artist} - ${track.title.substring(0, 30)}`);
    }
  }
  
  console.log(`\n✅ Обновлено обложек: ${updated}/${limit}\n`);
}

async function rebuildPlaylists() {
  console.log('🔄 УЛУЧШЕННАЯ ПЕРЕСБОРКА ПЛЕЙЛИСТОВ\n');
  console.log('=' .repeat(80));
  
  try {
    // Системный пользователь
    let systemUser = await User.findOne({ where: { username: 'system' } });
    if (!systemUser) {
      systemUser = await User.create({
        username: 'system',
        email: 'system@errorparty.ru',
        passwordHash: 'none'
      });
    }
    
    const SYSTEM_USER_ID = systemUser.id;
    
    // Получаем все треки с валидными ссылками
    const allTracks = await Track.findAll({ 
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { streamUrl: { [Op.ne]: null } },
              { streamUrl: { [Op.ne]: '' } }
            ]
          }
        ]
      },
      order: [['playCount', 'DESC'], ['likeCount', 'DESC'], ['createdAt', 'DESC']]
    });

    console.log(`\n📊 Всего треков: ${allTracks.length}`);
    console.log(`   С обложками: ${allTracks.filter(t => t.coverUrl).length}`);
    console.log(`   Без обложек: ${allTracks.filter(t => !t.coverUrl).length}\n`);

    // Удаляем старые editorial плейлисты
    await Playlist.destroy({ where: { type: 'editorial' } });
    console.log('🗑️  Удалены старые editorial плейлисты\n');
    console.log('=' .repeat(80));

    // 1. ТОП 100 ХИТОВ - самые популярные
    console.log('\n📀 1. Топ 100 Хитов...');
    const top100 = allTracks.slice(0, 100);
    
    const topPlaylist = await Playlist.create({
      userId: SYSTEM_USER_ID,
      name: '🔥 Топ 100 Хитов',
      description: 'Самые популярные треки по прослушиваниям',
      type: 'editorial',
      isPublic: true,
      coverUrl: 'https://i.imgur.com/placeholder-top100.jpg' // Заменить на реальную
    });

    for (let i = 0; i < top100.length; i++) {
      await PlaylistTrack.create({
        playlistId: topPlaylist.id,
        trackId: top100[i].id,
        position: i + 1
      });
    }
    console.log(`✅ Создан: ${topPlaylist.name} (${top100.length} треков)`);

    // 2. НОВИНКИ - только за последние 30 дней
    console.log('\n📀 2. Новинки Месяца...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTracks = allTracks
      .filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    if (recentTracks.length > 0) {
      const newPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🆕 Новинки Месяца',
        description: `Свежие треки за последние 30 дней (${recentTracks.length} треков)`,
        type: 'editorial',
        isPublic: true,
        coverUrl: 'https://i.imgur.com/placeholder-new.jpg'
      });

      for (let i = 0; i < recentTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: newPlaylist.id,
          trackId: recentTracks[i].id,
          position: i + 1
        });
      }
      console.log(`✅ Создан: ${newPlaylist.name} (${recentTracks.length} треков)`);
      
      // Обновляем обложки для новинок
      await updateTrackCovers(recentTracks, 20);
    } else {
      console.log('⚠️  Нет треков за последние 30 дней, пропускаем...');
    }

    // 3. KISSVK ХИТЫ
    console.log('\n📀 3. KissVK Хиты...');
    const kissVKTracks = allTracks
      .filter(t => t.source === 'kissvk')
      .slice(0, 50);
    
    if (kissVKTracks.length > 0) {
      const kissVKPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '💋 KissVK Хиты',
        description: 'Лучшие треки из KissVK',
        type: 'editorial',
        isPublic: true,
        coverUrl: 'https://i.imgur.com/placeholder-kissvk.jpg'
      });

      for (let i = 0; i < kissVKTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: kissVKPlaylist.id,
          trackId: kissVKTracks[i].id,
          position: i + 1
        });
      }
      console.log(`✅ Создан: ${kissVKPlaylist.name} (${kissVKTracks.length} треков)`);
      
      // Обновляем обложки
      await updateTrackCovers(kissVKTracks, 20);
    }

    // 4. РЕЛАКС - спокойные треки
    console.log('\n📀 4. Релакс...');
    const chillTracks = allTracks
      .filter(t => {
        // Фильтруем по ключевым словам
        const keywords = ['relax', 'chill', 'calm', 'piano', 'ambient', 'lounge', 'peaceful'];
        const text = `${t.title} ${t.artist} ${t.genre || ''}`.toLowerCase();
        return keywords.some(kw => text.includes(kw));
      })
      .slice(0, 50);

    if (chillTracks.length === 0) {
      // Если нет по ключевым словам, берем просто последние
      chillTracks.push(...allTracks.slice(200, 250));
    }

    const chillPlaylist = await Playlist.create({
      userId: SYSTEM_USER_ID,
      name: '😌 Релакс',
      description: 'Спокойные треки для отдыха',
      type: 'editorial',
      isPublic: true,
      coverUrl: 'https://i.imgur.com/placeholder-chill.jpg'
    });

    for (let i = 0; i < chillTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: chillPlaylist.id,
        trackId: chillTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ Создан: ${chillPlaylist.name} (${chillTracks.length} треков)`);

    // 5. ОТКРЫТИЯ НЕДЕЛИ - треки с ростом популярности
    console.log('\n📀 5. Открытия Недели...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyDiscoveries = allTracks
      .filter(t => new Date(t.createdAt) >= sevenDaysAgo && t.playCount > 0)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 30);

    if (weeklyDiscoveries.length > 0) {
      const discoveryPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🔥 Открытия Недели',
        description: `Лучшие новинки последних 7 дней (${weeklyDiscoveries.length} треков)`,
        type: 'editorial',
        isPublic: true,
        coverUrl: 'https://i.imgur.com/placeholder-discovery.jpg'
      });

      for (let i = 0; i < weeklyDiscoveries.length; i++) {
        await PlaylistTrack.create({
          playlistId: discoveryPlaylist.id,
          trackId: weeklyDiscoveries[i].id,
          position: i + 1
        });
      }
      console.log(`✅ Создан: ${discoveryPlaylist.name} (${weeklyDiscoveries.length} треков)`);
    } else {
      console.log('⚠️  Нет треков за последнюю неделю');
    }

    // Обновляем обложки топ-100
    console.log('\n🎨 Обновление обложек топ-треков...');
    await updateTrackCovers(top100.filter(t => !t.coverUrl), 30);

    console.log('\n' + '=' .repeat(80));
    console.log('✅ ПЕРЕСБОРКА ЗАВЕРШЕНА!\n');
    
    // Итоговая статистика
    const totalPlaylists = await Playlist.count({ where: { type: 'editorial' } });
    const totalPlaylistTracks = await PlaylistTrack.count();
    const tracksWithCovers = await Track.count({ where: { coverUrl: { [Op.ne]: null } } });
    
    console.log('📊 Итоговая статистика:');
    console.log(`   Плейлистов создано: ${totalPlaylists}`);
    console.log(`   Связей треков: ${totalPlaylistTracks}`);
    console.log(`   Треков с обложками: ${tracksWithCovers}/${allTracks.length}`);
    console.log('\n' + '=' .repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск
rebuildPlaylists()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Critical error:', err);
    process.exit(1);
  });
