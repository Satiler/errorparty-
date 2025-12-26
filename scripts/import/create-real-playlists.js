/**
 * Создание топовых плейлистов из импортированных треков
 * Используем существующие 3545 треков из lmusic.kz
 */

const { Track, Album, Playlist, PlaylistTrack } = require('./src/models');
const { sequelize } = require('./src/config/database');
const { Sequelize, Op } = require('sequelize');
const { User } = require('./src/models');

async function createTopPlaylists() {
  console.log('🎵 === СОЗДАНИЕ ТОПОВЫХ ПЛЕЙЛИСТОВ ===\n');
  
  try {
    // Находим или создаём системного пользователя
    let systemUser = await User.findOne({ where: { username: 'system' } });
    
    if (!systemUser) {
      console.log('📝 Создаём системного пользователя...');
      systemUser = await User.create({
        username: 'system',
        steamId: '0',
        displayName: 'ErrorParty System',
        avatarUrl: '/api/placeholder/user',
        role: 'admin'
      });
    }
    
    const userId = systemUser.id;
    console.log(`✅ System User ID: ${userId}\n`);
    // Проверяем сколько треков в базе
    const totalTracks = await Track.count();
    console.log(`📊 Треков в базе: ${totalTracks}`);
    
    if (totalTracks === 0) {
      console.log('❌ В базе нет треков!');
      return;
    }
    
    // Проверяем streamUrl
    const tracksWithStream = await Track.count({
      where: {
        streamUrl: {
          [Op.ne]: null
        }
      }
    });
    console.log(`✅ Треков с streamUrl: ${tracksWithStream}\n`);
    
    // 1. Мировые Хиты 2025 (самые свежие)
    console.log('📀 Создаём плейлист: Мировые Хиты 2025');
    await Playlist.destroy({ where: { name: 'Мировые Хиты 2025' } });
    
    const worldHitsPlaylist = await Playlist.create({
      name: 'Мировые Хиты 2025',
      description: 'Лучшие зарубежные и российские хиты декабря 2025 года',
      userId: userId,
      isPublic: true,
      metadata: {
        type: 'editorial',
        icon: '🌍',
        color: '#ff6b6b',
        priority: 1
      }
    });
    
    const recentTracks = await Track.findAll({
      where: {
        streamUrl: { [Op.ne]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    for (let i = 0; i < recentTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: worldHitsPlaylist.id,
        trackId: recentTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ Добавлено ${recentTracks.length} треков\n`);
    
    // 2. Русский Поп (треки с русскими артистами)
    console.log('📀 Создаём плейлист: Русский Поп');
    await Playlist.destroy({ where: { name: 'Русский Поп' } });
    
    const russianPopPlaylist = await Playlist.create({
      name: 'Русский Поп',
      description: 'Лучшие треки русской популярной музыки',
      userId: userId,
      isPublic: true,
      metadata: {
        type: 'editorial',
        icon: '🎤',
        color: '#4ecdc4',
        priority: 2
      }
    });
    
    // Берём треки с кириллицей в названии артиста
    const russianTracks = await Track.findAll({
      where: {
        streamUrl: { [Op.ne]: null },
        [Op.or]: [
          { artist: { [Op.regexp]: '[а-яА-ЯёЁ]' } },
          { title: { [Op.regexp]: '[а-яА-ЯёЁ]' } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 80
    });
    
    for (let i = 0; i < russianTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: russianPopPlaylist.id,
        trackId: russianTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ Добавлено ${russianTracks.length} треков\n`);
    
    // 3. Electronic Vibes (электронная музыка)
    console.log('📀 Создаём плейлист: Electronic Vibes');
    await Playlist.destroy({ where: { name: 'Electronic Vibes' } });
    
    const electronicPlaylist = await Playlist.create({
      name: 'Electronic Vibes',
      description: 'Лучшая электронная музыка для вечеринок',
      userId: userId,
      isPublic: true,
      metadata: {
        type: 'editorial',
        icon: '⚡',
        color: '#9b59b6',
        priority: 3
      }
    });
    
    const electronicTracks = await Track.findAll({
      where: {
        streamUrl: { [Op.ne]: null },
        [Op.or]: [
          { genre: { [Op.like]: '%Electronic%' } },
          { genre: { [Op.like]: '%Dance%' } },
          { genre: { [Op.like]: '%EDM%' } },
          { genre: { [Op.like]: '%House%' } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    for (let i = 0; i < electronicTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: electronicPlaylist.id,
        trackId: electronicTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ Добавлено ${electronicTracks.length} треков\n`);
    
    // 4. Chill Mix (спокойная музыка)
    console.log('📀 Создаём плейлист: Chill Mix');
    await Playlist.destroy({ where: { name: 'Chill Mix' } });
    
    const chillPlaylist = await Playlist.create({
      name: 'Chill Mix',
      description: 'Расслабляющая музыка для отдыха и работы',
      userId: userId,
      isPublic: true,
      metadata: {
        type: 'editorial',
        icon: '🌙',
        color: '#3498db',
        priority: 4
      }
    });
    
    const chillTracks = await Track.findAll({
      where: {
        streamUrl: { [Op.ne]: null }
      },
      order: Sequelize.literal('RANDOM()'),
      limit: 60
    });
    
    for (let i = 0; i < chillTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: chillPlaylist.id,
        trackId: chillTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ Добавлено ${chillTracks.length} треков\n`);
    
    // 5. Party Hits (хиты для вечеринок)
    console.log('📀 Создаём плейлист: Party Hits');
    await Playlist.destroy({ where: { name: 'Party Hits' } });
    
    const partyPlaylist = await Playlist.create({
      name: 'Party Hits',
      description: 'Зажигательные хиты для любой вечеринки',
      userId: userId,
      isPublic: true,
      metadata: {
        type: 'editorial',
        icon: '🎉',
        color: '#e74c3c',
        priority: 5
      }
    });
    
    const partyTracks = await Track.findAll({
      where: {
        streamUrl: { [Op.ne]: null }
      },
      order: Sequelize.literal('RANDOM()'),
      limit: 70
    });
    
    for (let i = 0; i < partyTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: partyPlaylist.id,
        trackId: partyTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ Добавлено ${partyTracks.length} треков\n`);
    
    // Итоговая статистика
    console.log('📊 === ИТОГИ ===');
    const playlistCount = await Playlist.count();
    const playlistTrackCount = await PlaylistTrack.count();
    
    console.log(`✅ Создано плейлистов: ${playlistCount}`);
    console.log(`✅ Всего треков в плейлистах: ${playlistTrackCount}`);
    console.log(`🎵 Треков в базе: ${totalTracks}`);
    console.log('\n✅ Все плейлисты созданы успешно! Обновите страницу музыки.');
    
  } catch (error) {
    console.error('❌ ОШИБКА:', error);
    throw error;
  }
}

// Запуск
createTopPlaylists()
  .then(() => {
    console.log('\n✅ Плейлисты созданы успешно!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  });
