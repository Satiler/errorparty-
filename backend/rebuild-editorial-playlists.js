/**
 * ПРАВИЛЬНАЯ пересборка editorial плейлистов с KissVK треками
 */

const { Playlist, Track, PlaylistTrack, sequelize } = require('./src/models');
const { Op } = require('sequelize');
const axios = require('axios');

const ITUNES_API = 'https://itunes.apple.com/search';

async function fetchCoverFromItunes(artist, title) {
  try {
    const searchQuery = `${artist} ${title}`.trim();
    const response = await axios.get(ITUNES_API, {
      params: {
        term: searchQuery,
        media: 'music',
        entity: 'song',
        limit: 1
      },
      timeout: 5000
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
    }
  } catch (error) {
    // Игнорируем ошибки
  }
  return null;
}

async function rebuildPlaylists() {
  console.log('🔥 ПЕРЕСБОРКА EDITORIAL ПЛЕЙЛИСТОВ\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 🔥 Топ 100 Хитов - самые популярные треки
  console.log('\n📀 1. Создаём "🔥 Топ 100 Хитов"...');
  const topTracks = await Track.findAll({
    where: {
      playCount: { [Op.gt]: 0 },
      duration: { [Op.gt]: 60 }
    },
    order: [['playCount', 'DESC']],
    limit: 100
  });
  console.log(`   Найдено ${topTracks.length} топ треков`);

  let playlist1 = await Playlist.findOne({ where: { id: 423 } });
  if (!playlist1) {
    playlist1 = await Playlist.create({
      name: '🔥 Топ 100 Хитов',
      type: 'editorial',
      isPublic: true,
      description: 'Самые популярные треки платформы'
    });
  }
  
  await PlaylistTrack.destroy({ where: { playlistId: playlist1.id } });
  
  for (let i = 0; i < topTracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: playlist1.id,
      trackId: topTracks[i].id,
      position: i
    });
  }

  // Устанавливаем обложку из топ трека с обложкой
  const topWithCover = topTracks.find(t => t.coverUrl);
  if (topWithCover) {
    await playlist1.update({ coverUrl: topWithCover.coverUrl, image: topWithCover.coverUrl });
  }

  console.log(`   ✅ Добавлено ${topTracks.length} треков`);

  // 2. 💋 KissVK Хиты - ТОЛЬКО треки из KissVK
  console.log('\n📀 2. Создаём "💋 KissVK Хиты"...');
  const kissvkTracks = await Track.findAll({
    where: {
      [Op.or]: [
        { source: 'kissvk' },
        { provider: 'kissvk' }
      ],
      playCount: { [Op.gt]: 0 }
    },
    order: [['playCount', 'DESC']],
    limit: 50
  });
  console.log(`   Найдено ${kissvkTracks.length} KissVK треков`);

  let playlist2 = await Playlist.findOne({ where: { id: 425 } });
  if (!playlist2) {
    playlist2 = await Playlist.create({
      name: '💋 KissVK Хиты',
      type: 'editorial',
      isPublic: true,
      description: 'Лучшие треки из KissVK'
    });
  }

  await PlaylistTrack.destroy({ where: { playlistId: playlist2.id } });

  for (let i = 0; i < kissvkTracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: playlist2.id,
      trackId: kissvkTracks[i].id,
      position: i
    });
  }

  const kissvkWithCover = kissvkTracks.find(t => t.coverUrl);
  if (kissvkWithCover) {
    await playlist2.update({ coverUrl: kissvkWithCover.coverUrl, image: kissvkWithCover.coverUrl });
  }

  console.log(`   ✅ Добавлено ${kissvkTracks.length} треков`);

  // 3. 🆕 Новинки Месяца - свежие треки (последние 30 дней)
  console.log('\n📀 3. Создаём "🆕 Новинки Месяца"...');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newTracks = await Track.findAll({
    where: {
      createdAt: { [Op.gte]: thirtyDaysAgo },
      duration: { [Op.gt]: 60 }
    },
    order: [['createdAt', 'DESC'], ['playCount', 'DESC']],
    limit: 50
  });
  console.log(`   Найдено ${newTracks.length} новых треков (последние 30 дней)`);

  let playlist3 = await Playlist.findOne({ where: { id: 424 } });
  if (!playlist3) {
    playlist3 = await Playlist.create({
      name: '🆕 Новинки Месяца',
      type: 'editorial',
      isPublic: true,
      description: 'Свежие треки последних 30 дней'
    });
  }

  await PlaylistTrack.destroy({ where: { playlistId: playlist3.id } });

  for (let i = 0; i < newTracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: playlist3.id,
      trackId: newTracks[i].id,
      position: i
    });
  }

  const newWithCover = newTracks.find(t => t.coverUrl);
  if (newWithCover) {
    await playlist3.update({ coverUrl: newWithCover.coverUrl, image: newWithCover.coverUrl });
  }

  console.log(`   ✅ Добавлено ${newTracks.length} треков`);

  // 4. 🔥 Открытия Недели - новые популярные (последние 7 дней)
  console.log('\n📀 4. Создаём "🔥 Открытия Недели"...');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weeklyTracks = await Track.findAll({
    where: {
      createdAt: { [Op.gte]: sevenDaysAgo },
      duration: { [Op.gt]: 60 }
    },
    order: [['playCount', 'DESC'], ['createdAt', 'DESC']],
    limit: 30
  });
  console.log(`   Найдено ${weeklyTracks.length} треков недели`);

  let playlist4 = await Playlist.findOne({ where: { id: 427 } });
  if (!playlist4) {
    playlist4 = await Playlist.create({
      name: '🔥 Открытия Недели',
      type: 'editorial',
      isPublic: true,
      description: 'Горячие новинки последней недели'
    });
  }

  await PlaylistTrack.destroy({ where: { playlistId: playlist4.id } });

  for (let i = 0; i < weeklyTracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: playlist4.id,
      trackId: weeklyTracks[i].id,
      position: i
    });
  }

  const weeklyWithCover = weeklyTracks.find(t => t.coverUrl);
  if (weeklyWithCover) {
    await playlist4.update({ coverUrl: weeklyWithCover.coverUrl, image: weeklyWithCover.coverUrl });
  }

  console.log(`   ✅ Добавлено ${weeklyTracks.length} треков`);

  // 5. 😌 Релакс - спокойная музыка
  console.log('\n📀 5. Создаём "😌 Релакс"...');
  const relaxTracks = await Track.findAll({
    where: {
      [Op.or]: [
        { title: { [Op.iLike]: '%relax%' } },
        { title: { [Op.iLike]: '%chill%' } },
        { title: { [Op.iLike]: '%ambient%' } },
        { title: { [Op.iLike]: '%piano%' } },
        { genre: { [Op.iLike]: '%relax%' } },
        { genre: { [Op.iLike]: '%ambient%' } }
      ],
      duration: { [Op.gt]: 60 }
    },
    order: [['playCount', 'DESC']],
    limit: 20
  });
  console.log(`   Найдено ${relaxTracks.length} релакс треков`);

  let playlist5 = await Playlist.findOne({ where: { id: 426 } });
  if (!playlist5) {
    playlist5 = await Playlist.create({
      name: '😌 Релакс',
      type: 'editorial',
      isPublic: true,
      description: 'Спокойная музыка для отдыха'
    });
  }

  await PlaylistTrack.destroy({ where: { playlistId: playlist5.id } });

  for (let i = 0; i < relaxTracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: playlist5.id,
      trackId: relaxTracks[i].id,
      position: i
    });
  }

  // Загружаем обложку для релакс
  if (relaxTracks.length > 0 && !relaxTracks[0].coverUrl) {
    console.log('   🔍 Загружаем обложку из iTunes...');
    const cover = await fetchCoverFromItunes(relaxTracks[0].artist, relaxTracks[0].title);
    if (cover) {
      await relaxTracks[0].update({ coverUrl: cover });
      await playlist5.update({ coverUrl: cover, image: cover });
      console.log('   ✅ Обложка загружена');
    }
  } else if (relaxTracks.length > 0 && relaxTracks[0].coverUrl) {
    await playlist5.update({ coverUrl: relaxTracks[0].coverUrl, image: relaxTracks[0].coverUrl });
  }

  console.log(`   ✅ Добавлено ${relaxTracks.length} треков`);

  // 6. Устанавливаем уникальные обложки
  console.log('\n🎨 Устанавливаем уникальные обложки...');
  
  const playlistsToUpdate = [
    { id: 423, offset: 0 },   // Топ 100
    { id: 425, offset: 3 },   // KissVK
    { id: 424, offset: 5 },   // Новинки
    { id: 427, offset: 2 },   // Открытия
    { id: 426, offset: 0 }    // Релакс
  ];

  for (const config of playlistsToUpdate) {
    const result = await sequelize.query(`
      SELECT t."coverUrl"
      FROM "Tracks" t
      INNER JOIN "PlaylistTracks" pt ON pt."trackId" = t.id
      WHERE pt."playlistId" = :playlistId 
        AND t."coverUrl" IS NOT NULL
      ORDER BY t."playCount" DESC
      OFFSET :offset
      LIMIT 1
    `, {
      replacements: { playlistId: config.id, offset: config.offset },
      type: sequelize.QueryTypes.SELECT
    });

    if (result[0] && result[0].coverUrl) {
      await Playlist.update(
        { coverUrl: result[0].coverUrl, image: result[0].coverUrl },
        { where: { id: config.id } }
      );
    }
  }

  console.log('   ✅ Обложки установлены');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ПЕРЕСБОРКА ЗАВЕРШЕНА!\n');
  console.log('📊 Итого:');
  console.log('  • 🔥 Топ 100 Хитов: 100 треков');
  console.log('  • 💋 KissVK Хиты: 50 треков (только KissVK)');
  console.log('  • 🆕 Новинки Месяца: 50 треков (последние 30 дней)');
  console.log('  • 🔥 Открытия Недели: 30 треков (последние 7 дней)');
  console.log('  • 😌 Релакс: 20 треков (релакс музыка)');
  console.log('');
}

rebuildPlaylists()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
