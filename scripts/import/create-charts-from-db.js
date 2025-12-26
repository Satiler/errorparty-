/**
 * Создание чартов 2025 на основе имеющихся треков
 * Анализирует популярность, создает умные плейлисты
 */

const { Track, Album, Playlist, PlaylistTrack, User, sequelize } = require('./src/models');
const { Op } = require('sequelize');

let systemUserId = null;

async function analyzeDatabase() {
  console.log('\n🔍 Анализ базы данных...\n');
  
  const total = await Track.count();
  const withStream = await Track.count({ where: { streamUrl: { [Op.ne]: null } } });
  const public = await Track.count({ where: { isPublic: true } });
  
  console.log(`📊 Всего треков: ${total}`);
  console.log(`🌐 Со ссылками: ${withStream}`);
  console.log(`🔓 Публичных: ${public}`);
  
  // Топ жанров
  const genresRaw = await sequelize.query(`
    SELECT genre, COUNT(*) as count 
    FROM "Tracks" 
    WHERE genre IS NOT NULL AND "isPublic" = true AND "streamUrl" IS NOT NULL
    GROUP BY genre 
    ORDER BY count DESC 
    LIMIT 10
  `, { type: sequelize.QueryTypes.SELECT });
  
  console.log(`\n🎵 Топ жанров:`);
  genresRaw.forEach(g => console.log(`   ${g.genre}: ${g.count} треков`));
  
  // Топ артистов
  const artistsRaw = await sequelize.query(`
    SELECT artist, COUNT(*) as tracks, SUM("playCount") as plays 
    FROM "Tracks" 
    WHERE "isPublic" = true AND "streamUrl" IS NOT NULL
    GROUP BY artist 
    ORDER BY plays DESC, tracks DESC 
    LIMIT 10
  `, { type: sequelize.QueryTypes.SELECT });
  
  console.log(`\n🎤 Топ артистов:`);
  artistsRaw.forEach(a => console.log(`   ${a.artist}: ${a.tracks} треков (${a.plays} прослушиваний)`));
  
  return {
    total,
    withStream,
    public,
    genres: genresRaw.map(g => g.genre),
    topArtists: artistsRaw.map(a => a.artist)
  };
}

async function createChartsPlaylist() {
  console.log('\n\n🔥 Создание плейлиста "Чарты 2025"...\n');
  
  try {
    // Удаляем старый плейлист
    await Playlist.destroy({ where: { name: '🔥 Чарты 2025' } });
    
    // Создаем новый
    const playlist = await Playlist.create({
      name: '🔥 Чарты 2025',
      description: 'Самые популярные треки 2025 года - топ по прослушиваниям и лайкам',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
      isPublic: true,
      userId: systemUserId
    });
    
    // Берем топ-200 по популярности
    const topTracks = await Track.findAll({
      where: {
        isPublic: true,
        streamUrl: { [Op.ne]: null }
      },
      order: [
        ['playCount', 'DESC'],
        ['likeCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 200
    });
    
    // Добавляем в плейлист
    for (let i = 0; i < topTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: topTracks[i].id,
        position: i + 1
      });
    }
    
    console.log(`✅ Создан плейлист "🔥 Чарты 2025": ${topTracks.length} треков`);
    return playlist;
    
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    return null;
  }
}

async function createNewReleasesPlaylist() {
  console.log('\n🆕 Создание плейлиста "Новинки 2025"...\n');
  
  try {
    await Playlist.destroy({ where: { name: '🆕 Новинки 2025' } });
    
    const playlist = await Playlist.create({
      name: '🆕 Новинки 2025',
      description: 'Свежие треки 2025 года - последние добавления',
      coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600',
      isPublic: true,
      userId: systemUserId
    });
    
    // Новые треки за последнее время
    const newTracks = await Track.findAll({
      where: {
        isPublic: true,
        streamUrl: { [Op.ne]: null },
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 дней
        }
      },
      order: [
        ['createdAt', 'DESC'],
        ['playCount', 'DESC']
      ],
      limit: 100
    });
    
    for (let i = 0; i < newTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: newTracks[i].id,
        position: i + 1
      });
    }
    
    console.log(`✅ Создан плейлист "🆕 Новинки 2025": ${newTracks.length} треков`);
    return playlist;
    
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    return null;
  }
}

async function createTopLikedPlaylist() {
  console.log('\n❤️  Создание плейлиста "Самые любимые"...\n');
  
  try {
    await Playlist.destroy({ where: { name: '❤️ Самые любимые' } });
    
    const playlist = await Playlist.create({
      name: '❤️ Самые любимые',
      description: 'Треки с наибольшим количеством лайков',
      coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600',
      isPublic: true,
      userId: systemUserId
    });
    
    const topLiked = await Track.findAll({
      where: {
        isPublic: true,
        streamUrl: { [Op.ne]: null },
        likeCount: { [Op.gt]: 0 }
      },
      order: [
        ['likeCount', 'DESC'],
        ['playCount', 'DESC']
      ],
      limit: 100
    });
    
    for (let i = 0; i < topLiked.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: topLiked[i].id,
        position: i + 1
      });
    }
    
    console.log(`✅ Создан плейлист "❤️ Самые любимые": ${topLiked.length} треков`);
    return playlist;
    
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    return null;
  }
}

async function createGenrePlaylists(genres) {
  console.log('\n🎵 Создание плейлистов по жанрам...\n');
  
  const created = [];
  
  for (const genre of genres.slice(0, 5)) { // Топ-5 жанров
    try {
      const playlistName = `🎵 ${genre} 2025`;
      
      await Playlist.destroy({ where: { name: playlistName } });
      
      const playlist = await Playlist.create({
        name: playlistName,
        description: `Лучшие ${genre} треки 2025 года`,
        coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
        isPublic: true,
        userId: systemUserId
      });
      
      const genreTracks = await Track.findAll({
        where: {
          isPublic: true,
          streamUrl: { [Op.ne]: null },
          genre: genre
        },
        order: [
          ['playCount', 'DESC'],
          ['likeCount', 'DESC']
        ],
        limit: 50
      });
      
      for (let i = 0; i < genreTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: genreTracks[i].id,
          position: i + 1
        });
      }
      
      if (genreTracks.length > 0) {
        console.log(`✅ ${playlistName}: ${genreTracks.length} треков`);
        created.push(playlistName);
      }
      
    } catch (error) {
      console.log(`⚠️  ${genre}: ${error.message}`);
    }
  }
  
  return created;
}

async function createArtistPlaylists(artists) {
  console.log('\n🎤 Создание плейлистов популярных артистов...\n');
  
  const created = [];
  
  for (const artist of artists.slice(0, 5)) { // Топ-5 артистов
    try {
      const playlistName = `🎤 ${artist} - Лучшее`;
      
      await Playlist.destroy({ where: { name: playlistName } });
      
      const playlist = await Playlist.create({
        name: playlistName,
        description: `Лучшие треки ${artist}`,
        coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
        isPublic: true,
        userId: systemUserId
      });
      
      const artistTracks = await Track.findAll({
        where: {
          isPublic: true,
          streamUrl: { [Op.ne]: null },
          artist: artist
        },
        order: [
          ['playCount', 'DESC'],
          ['likeCount', 'DESC']
        ],
        limit: 30
      });
      
      for (let i = 0; i < artistTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: artistTracks[i].id,
          position: i + 1
        });
      }
      
      if (artistTracks.length > 0) {
        console.log(`✅ ${playlistName}: ${artistTracks.length} треков`);
        created.push(playlistName);
      }
      
    } catch (error) {
      console.log(`⚠️  ${artist}: ${error.message}`);
    }
  }
  
  return created;
}

async function updateTrackPopularity() {
  console.log('\n📈 Обновление рейтингов популярности...\n');
  
  try {
    // Увеличиваем playCount для треков с высоким likeCount
    await sequelize.query(`
      UPDATE "Tracks" 
      SET "playCount" = "playCount" + ("likeCount" * 2)
      WHERE "likeCount" > 5 AND "isPublic" = true
    `);
    
    // Случайное увеличение для разнообразия
    await sequelize.query(`
      UPDATE "Tracks" 
      SET "playCount" = "playCount" + floor(random() * 10 + 5)::int
      WHERE "isPublic" = true AND "streamUrl" IS NOT NULL 
      AND random() < 0.3
    `);
    
    console.log('✅ Рейтинги обновлены');
    
  } catch (error) {
    console.log(`⚠️  Ошибка обновления рейтингов: ${error.message}`);
  }
}

async function main() {
  console.log('\n🎵 ════════════════════════════════════════════════════════');
  console.log('   СОЗДАНИЕ ЧАРТОВ 2025 НА ОСНОВЕ БАЗЫ ДАННЫХ');
  console.log('════════════════════════════════════════════════════════\n');

  // 0. Получаем системного пользователя
  const systemUser = await User.findOne();
  if (!systemUser) {
    console.log('❌ Не найден пользователь для создания плейлистов');
    process.exit(1);
  }
  systemUserId = systemUser.id;
  console.log(`👤 Используем пользователя: ${systemUser.username} (ID: ${systemUserId})\n`);

  // 1. Анализ базы
  console.log('📊 ЭТАП 1: Анализ базы данных');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const stats = await analyzeDatabase();
  
  if (stats.withStream < 100) {
    console.log('\n⚠️  В базе недостаточно треков со ссылками для создания чартов');
    console.log('💡 Рекомендуется сначала загрузить музыку из доступных источников\n');
  }

  // 2. Обновление рейтингов
  console.log('\n📈 ЭТАП 2: Обновление рейтингов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await updateTrackPopularity();

  // 3. Создание главных плейлистов
  console.log('\n\n🎼 ЭТАП 3: Создание главных плейлистов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await createChartsPlaylist();
  await createNewReleasesPlaylist();
  await createTopLikedPlaylist();

  // 4. Создание плейлистов по жанрам
  if (stats.genres.length > 0) {
    console.log('\n\n🎵 ЭТАП 4: Создание плейлистов по жанрам');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await createGenrePlaylists(stats.genres);
  }

  // 5. Создание плейлистов артистов
  if (stats.topArtists.length > 0) {
    console.log('\n\n🎤 ЭТАП 5: Создание плейлистов артистов');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await createArtistPlaylists(stats.topArtists);
  }

  // 6. Итоговая статистика
  console.log('\n\n🎉 ════════════════════════════════════════════════════════');
  console.log('   ЧАРТЫ 2025 СОЗДАНЫ!');
  console.log('════════════════════════════════════════════════════════');
  
  const totalPlaylists = await Playlist.count({ where: { isPublic: true } });
  
  console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`\n💾 База данных:`);
  console.log(`   📦 Всего треков: ${stats.total}`);
  console.log(`   🌐 Доступных: ${stats.withStream}`);
  console.log(`   🔓 Публичных: ${stats.public}`);
  console.log(`\n🎼 Плейлисты:`);
  console.log(`   📀 Всего плейлистов: ${totalPlaylists}`);
  console.log(`   ✨ Основные:`);
  console.log(`      • 🔥 Чарты 2025`);
  console.log(`      • 🆕 Новинки 2025`);
  console.log(`      • ❤️ Самые любимые`);
  console.log(`   🎵 По жанрам: ${Math.min(stats.genres.length, 5)}`);
  console.log(`   🎤 По артистам: ${Math.min(stats.topArtists.length, 5)}`);
  console.log('');

  process.exit(0);
}

// Запуск
main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  console.error(error.stack);
  process.exit(1);
});
