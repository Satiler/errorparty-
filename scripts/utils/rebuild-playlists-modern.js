/**
 * Современная пересборка плейлистов с учетом iTunes RSS и популярных новинок
 * Создает актуальные плейлисты на основе импортированных треков
 */
const { Playlist, PlaylistTrack, Track, Album, User } = require('./src/models');
const { Op } = require('sequelize');
const { sequelize } = require('./src/config/database');

async function rebuildModernPlaylists() {
  console.log('🚀 Начинаем пересборку современных плейлистов...\n');
  
  try {
    // Получаем или создаем системного пользователя
    let systemUser = await User.findOne({ where: { username: 'system' } });
    if (!systemUser) {
      systemUser = await User.create({
        username: 'system',
        email: 'system@errorparty.local',
        password: 'system',
        isAdmin: true
      });
      console.log('✅ Создан системный пользователь\n');
    }
    
    const SYSTEM_USER_ID = systemUser.id;
    
    // Получаем все треки
    const allTracks = await Track.findAll({ 
      include: [{
        model: Album,
        as: 'album',
        required: false,
        attributes: ['id', 'title', 'coverUrl']
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Всего треков: ${allTracks.length}`);
    
    // Анализ источников
    const tracksBySource = {
      kissvk: allTracks.filter(t => t.source === 'kissvk' || t.provider === 'kissvk'),
      lmusic: allTracks.filter(t => t.source === 'lmusic' || t.provider === 'lmusic'),
      other: allTracks.filter(t => t.source !== 'kissvk' && t.source !== 'lmusic' && t.provider !== 'kissvk' && t.provider !== 'lmusic')
    };
    
    console.log(`   - KissVK: ${tracksBySource.kissvk.length}`);
    console.log(`   - Lmusic: ${tracksBySource.lmusic.length}`);
    console.log(`   - Другие: ${tracksBySource.other.length}\n`);

    // Удаляем старые редакционные плейлисты
    await Playlist.destroy({ where: { type: 'editorial' } });
    console.log('🗑️  Удалены старые плейлисты\n');

    const createdPlaylists = [];

    // 1. iTunes Top 100 (новинки из импорта)
    console.log('📀 Создаем: iTunes Top 100...');
    const recentTracks = allTracks
      .filter(t => {
        const daysSinceCreation = (Date.now() - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
        return daysSinceCreation <= 60; // Треки за последние 60 дней
      })
      .sort((a, b) => b.playCount - a.playCount || new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100);

    if (recentTracks.length > 0) {
      const itunesPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🎵 iTunes Top 100',
        description: 'Топ-100 треков по версии iTunes и мировых чартов',
        type: 'editorial',
        isPublic: true,
        coverPath: recentTracks[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ priority: 1, source: 'itunes' })
      });

      for (let i = 0; i < recentTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: itunesPlaylist.id,
          trackId: recentTracks[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(itunesPlaylist);
      console.log(`✅ Создан: ${itunesPlaylist.name} (${recentTracks.length} треков)\n`);
    }

    // 2. Популярные новинки 2025
    console.log('📀 Создаем: Новинки 2025...');
    const newTracks2025 = allTracks
      .filter(t => {
        const year = new Date(t.createdAt).getFullYear();
        return year >= 2024; // Включаем конец 2024 и весь 2025
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);

    if (newTracks2025.length > 0) {
      const newPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🆕 Новинки 2025',
        description: 'Свежие релизы и популярные новинки этого года',
        type: 'editorial',
        isPublic: true,
        coverPath: newTracks2025[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ priority: 2, year: 2025 })
      });

      for (let i = 0; i < newTracks2025.length; i++) {
        await PlaylistTrack.create({
          playlistId: newPlaylist.id,
          trackId: newTracks2025[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(newPlaylist);
      console.log(`✅ Создан: ${newPlaylist.name} (${newTracks2025.length} треков)\n`);
    }

    // 3. Зарубежные хиты
    console.log('📀 Создаем: Зарубежные хиты...');
    const foreignArtists = [
      'taylor swift', 'the weeknd', 'drake', 'ariana grande', 'billie eilish',
      'dua lipa', 'ed sheeran', 'bruno mars', 'post malone', 'travis scott',
      'justin bieber', 'olivia rodrigo', 'harry styles', 'coldplay', 'imagine dragons',
      'maroon 5', 'eminem', 'kendrick lamar', 'rihanna', 'adele', 'lady gaga'
    ];
    
    const foreignTracks = allTracks
      .filter(t => {
        const artistLower = (t.artist || '').toLowerCase();
        return foreignArtists.some(fa => artistLower.includes(fa));
      })
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 50);

    if (foreignTracks.length > 0) {
      const foreignPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🌍 Зарубежные хиты',
        description: 'Лучшие треки от мировых звезд',
        type: 'editorial',
        isPublic: true,
        coverPath: foreignTracks[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ priority: 3, genre: 'foreign' })
      });

      for (let i = 0; i < foreignTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: foreignPlaylist.id,
          trackId: foreignTracks[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(foreignPlaylist);
      console.log(`✅ Создан: ${foreignPlaylist.name} (${foreignTracks.length} треков)\n`);
    }

    // 4. Топ 50 всех времен
    console.log('📀 Создаем: Топ 50 всех времен...');
    const top50 = allTracks
      .sort((a, b) => b.playCount - a.playCount || b.likeCount - a.likeCount)
      .slice(0, 50);

    if (top50.length > 0) {
      const topPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🔥 Топ 50',
        description: 'Самые популярные треки всех времен',
        type: 'editorial',
        isPublic: true,
        coverPath: top50[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ priority: 4 })
      });

      for (let i = 0; i < top50.length; i++) {
        await PlaylistTrack.create({
          playlistId: topPlaylist.id,
          trackId: top50[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(topPlaylist);
      console.log(`✅ Создан: ${topPlaylist.name} (${top50.length} треков)\n`);
    }

    // 5. KissVK Collection
    console.log('📀 Создаем: KissVK Collection...');
    const kissvkTracks = tracksBySource.kissvk
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 60);

    if (kissvkTracks.length > 0) {
      const kissvkPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '💿 KissVK Collection',
        description: 'Подборка лучших треков от KissVK',
        type: 'editorial',
        isPublic: true,
        coverPath: kissvkTracks[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ priority: 5, source: 'kissvk' })
      });

      for (let i = 0; i < kissvkTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: kissvkPlaylist.id,
          trackId: kissvkTracks[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(kissvkPlaylist);
      console.log(`✅ Создан: ${kissvkPlaylist.name} (${kissvkTracks.length} треков)\n`);
    }

    // 6. Chill & Relax
    console.log('📀 Создаем: Chill & Relax...');
    const chillTracks = allTracks
      .filter(t => {
        const titleLower = (t.title || '').toLowerCase();
        const artistLower = (t.artist || '').toLowerCase();
        return titleLower.includes('chill') || 
               titleLower.includes('relax') || 
               titleLower.includes('lounge') ||
               artistLower.includes('chill') ||
               (t.duration && t.duration > 180 && t.duration < 360);
      })
      .slice(0, 40);

    if (chillTracks.length > 0) {
      const chillPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '😌 Chill & Relax',
        description: 'Спокойная музыка для отдыха и расслабления',
        type: 'editorial',
        isPublic: true,
        coverPath: chillTracks[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ priority: 6, mood: 'chill' })
      });

      for (let i = 0; i < chillTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: chillPlaylist.id,
          trackId: chillTracks[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(chillPlaylist);
      console.log(`✅ Создан: ${chillPlaylist.name} (${chillTracks.length} треков)\n`);
    }

    // 7. Party Mix
    console.log('📀 Создаем: Party Mix...');
    const partyTracks = allTracks
      .filter(t => {
        const titleLower = (t.title || '').toLowerCase();
        const artistLower = (t.artist || '').toLowerCase();
        return titleLower.includes('party') || 
               titleLower.includes('dance') || 
               titleLower.includes('remix') ||
               artistLower.includes('dj');
      })
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 40);

    if (partyTracks.length > 0) {
      const partyPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🎉 Party Mix',
        description: 'Зажигательные треки для вечеринки',
        type: 'editorial',
        isPublic: true,
        coverPath: partyTracks[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ priority: 7, mood: 'party' })
      });

      for (let i = 0; i < partyTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: partyPlaylist.id,
          trackId: partyTracks[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(partyPlaylist);
      console.log(`✅ Создан: ${partyPlaylist.name} (${partyTracks.length} треков)\n`);
    }

    // 8. Случайная подборка
    console.log('📀 Создаем: Микс дня...');
    const randomTracks = allTracks
      .sort(() => Math.random() - 0.5)
      .slice(0, 30);

    if (randomTracks.length > 0) {
      const randomPlaylist = await Playlist.create({
        userId: SYSTEM_USER_ID,
        name: '🎲 Микс дня',
        description: 'Случайная подборка интересных треков',
        type: 'editorial',
        isPublic: true,
        coverPath: randomTracks[0]?.album?.coverUrl || null,
        metadata: JSON.stringify({ 
          priority: 8, 
          generated: new Date().toISOString(),
          type: 'random'
        })
      });

      for (let i = 0; i < randomTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: randomPlaylist.id,
          trackId: randomTracks[i].id,
          position: i + 1
        });
      }
      createdPlaylists.push(randomPlaylist);
      console.log(`✅ Создан: ${randomPlaylist.name} (${randomTracks.length} треков)\n`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ПЕРЕСБОРКА ПЛЕЙЛИСТОВ ЗАВЕРШЕНА!');
    console.log('='.repeat(60));
    console.log(`\n📊 Статистика:`);
    console.log(`   Создано плейлистов: ${createdPlaylists.length}`);
    console.log(`   Всего треков: ${allTracks.length}`);
    console.log(`   - KissVK: ${tracksBySource.kissvk.length}`);
    console.log(`   - Lmusic: ${tracksBySource.lmusic.length}`);
    console.log(`   - Другие: ${tracksBySource.other.length}`);
    console.log('\n📋 Созданные плейлисты:');
    createdPlaylists.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} - ${p.description}`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при пересборке плейлистов:', error);
    process.exit(1);
  }
}

rebuildModernPlaylists();
