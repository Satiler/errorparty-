/**
 * Импорт популярных альбомов 2025 года (русские и зарубежные)
 * Автоматическое создание плейлистов
 */

const { Track, Album, Playlist, PlaylistTrack } = require('./src/models');
const { getInstance } = require('./src/services/kissvk-lightweight.service');
const axios = require('axios');

// Популярные альбомы 2025 года для загрузки
const TOP_ALBUMS_2025 = {
  // Зарубежные альбомы
  foreign: [
    { artist: 'Taylor Swift', album: 'The Tortured Poets Department' },
    { artist: 'Billie Eilish', album: 'Hit Me Hard and Soft' },
    { artist: 'Ariana Grande', album: 'eternal sunshine' },
    { artist: 'Beyoncé', album: 'Cowboy Carter' },
    { artist: 'Dua Lipa', album: 'Radical Optimism' },
    { artist: 'The Weeknd', album: 'Hurry Up Tomorrow' },
    { artist: 'Travis Scott', album: 'Utopia' },
    { artist: 'Olivia Rodrigo', album: 'GUTS' },
    { artist: 'Sabrina Carpenter', album: 'Short n Sweet' },
    { artist: 'Charli xcx', album: 'BRAT' },
    { artist: 'Coldplay', album: 'Moon Music' },
    { artist: 'Imagine Dragons', album: 'LOOM' },
    { artist: 'Post Malone', album: 'F-1 Trillion' },
    { artist: 'Twenty One Pilots', album: 'Clancy' },
    { artist: 'Linkin Park', album: 'From Zero' }
  ],
  // Русские альбомы
  russian: [
    { artist: 'Инстасамка', album: 'Инстасамка' },
    { artist: 'Miyagi', album: 'Yamakasi' },
    { artist: 'Скриптонит', album: 'Дом с нормальными явлениями' },
    { artist: 'Король и Шут', album: 'Акустический альбом' },
    { artist: 'Oxxxymiron', album: 'КРАСОТА И УРОДСТВО' },
    { artist: 'Монеточка', album: 'Раскраски для взрослых' },
    { artist: 'Валентин Стрыкало', album: 'Наше лето' },
    { artist: 'Cream Soda', album: 'Пиратские копии' },
    { artist: 'Big Baby Tape', album: 'Dragonborn' },
    { artist: 'Три дня дождя', album: 'Демоны' }
  ]
};

const kissvkService = getInstance();
const stats = {
  totalTracks: 0,
  successTracks: 0,
  failedTracks: 0,
  totalAlbums: 0,
  successAlbums: 0,
  playlists: []
};

/**
 * Загрузка альбома через iTunes RSS API
 */
async function loadAlbumFromItunes(artistName, albumName) {
  try {
    console.log(`\n🎵 Поиск альбома: ${artistName} - ${albumName}`);
    
    const searchQuery = encodeURIComponent(`${artistName} ${albumName}`);
    const searchUrl = `https://itunes.apple.com/search?term=${searchQuery}&entity=album&limit=1`;
    
    const searchResponse = await axios.get(searchUrl);
    
    if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
      console.log(`❌ Альбом не найден в iTunes`);
      return null;
    }
    
    const albumData = searchResponse.data.results[0];
    const collectionId = albumData.collectionId;
    
    // Получаем треки альбома
    const tracksUrl = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`;
    const tracksResponse = await axios.get(tracksUrl);
    
    const tracks = tracksResponse.data.results.filter(item => item.wrapperType === 'track');
    
    console.log(`✅ Найдено ${tracks.length} треков`);
    
    return {
      albumInfo: albumData,
      tracks: tracks
    };
    
  } catch (error) {
    console.error(`❌ Ошибка загрузки альбома ${artistName} - ${albumName}:`, error.message);
    return null;
  }
}

/**
 * Загрузка альбома через KissVK
 */
async function loadAlbumFromKissVK(artistName, albumName) {
  try {
    console.log(`\n🎵 Поиск альбома через KissVK: ${artistName} - ${albumName}`);
    
    const searchQuery = `${artistName} ${albumName}`;
    const searchUrl = `https://kissvk.top/search?q=${encodeURIComponent(searchQuery)}`;
    
    const result = await kissvkService.extractTracks(searchUrl, 20);
    
    if (!result.success || result.tracks.length === 0) {
      console.log(`❌ Альбом не найден в KissVK`);
      return null;
    }
    
    // Расшифровываем треки
    const decryptedTracks = await kissvkService.decryptTracks(result.tracks);
    
    console.log(`✅ Найдено ${decryptedTracks.length} треков`);
    
    return {
      tracks: decryptedTracks,
      albumInfo: {
        collectionName: albumName,
        artistName: artistName
      }
    };
    
  } catch (error) {
    console.error(`❌ Ошибка загрузки альбома ${artistName} - ${albumName}:`, error.message);
    return null;
  }
}

/**
 * Сохранение альбома и треков в базу
 */
async function saveAlbumToDatabase(albumData, source = 'itunes') {
  try {
    const { albumInfo, tracks } = albumData;
    
    // Создаем или находим альбом
    const [album, albumCreated] = await Album.findOrCreate({
      where: {
        title: albumInfo.collectionName,
        artist: albumInfo.artistName
      },
      defaults: {
        title: albumInfo.collectionName,
        artist: albumInfo.artistName,
        releaseDate: albumInfo.releaseDate || new Date(),
        coverUrl: albumInfo.artworkUrl100 ? albumInfo.artworkUrl100.replace('100x100', '600x600') : null,
        totalTracks: tracks.length
      }
    });
    
    if (albumCreated) {
      console.log(`✅ Альбом создан: ${album.title}`);
      stats.successAlbums++;
    } else {
      console.log(`ℹ️  Альбом уже существует: ${album.title}`);
    }
    
    stats.totalAlbums++;
    
    // Сохраняем треки
    const savedTracks = [];
    
    for (const trackData of tracks) {
      try {
        stats.totalTracks++;
        
        let trackTitle, trackArtist, streamUrl, duration;
        
        if (source === 'itunes') {
          trackTitle = trackData.trackName;
          trackArtist = trackData.artistName;
          streamUrl = trackData.previewUrl;
          duration = Math.floor(trackData.trackTimeMillis / 1000);
        } else {
          trackTitle = trackData.title;
          trackArtist = trackData.artist;
          streamUrl = trackData.streamUrl;
          duration = trackData.duration;
        }
        
        // Проверяем, существует ли трек
        const existingTrack = await Track.findOne({
          where: {
            title: trackTitle,
            artist: trackArtist
          }
        });
        
        if (existingTrack) {
          // Обновляем связь с альбомом
          if (!existingTrack.albumId) {
            await existingTrack.update({ albumId: album.id });
          }
          savedTracks.push(existingTrack);
          stats.successTracks++;
          continue;
        }
        
        // Создаем новый трек
        const track = await Track.create({
          title: trackTitle,
          artist: trackArtist,
          albumId: album.id,
          duration: duration,
          streamUrl: streamUrl,
          coverUrl: albumInfo.artworkUrl100 ? albumInfo.artworkUrl100.replace('100x100', '600x600') : null,
          source: source === 'itunes' ? 'itunes' : 'kissvk',
          isVerified: true
        });
        
        savedTracks.push(track);
        stats.successTracks++;
        
      } catch (error) {
        console.error(`❌ Ошибка сохранения трека:`, error.message);
        stats.failedTracks++;
      }
    }
    
    return { album, tracks: savedTracks };
    
  } catch (error) {
    console.error(`❌ Ошибка сохранения альбома:`, error.message);
    return null;
  }
}

/**
 * Создание плейлиста для альбома
 */
async function createPlaylistForAlbum(album, tracks) {
  try {
    const playlistName = `🎵 ${album.title} - ${album.artist}`;
    
    const [playlist, created] = await Playlist.findOrCreate({
      where: {
        name: playlistName
      },
      defaults: {
        name: playlistName,
        description: `Альбом ${album.title} от ${album.artist} (${new Date(album.releaseDate).getFullYear()})`,
        coverUrl: album.coverUrl,
        isPublic: true,
        userId: 1 // Системный пользователь
      }
    });
    
    if (created) {
      console.log(`✅ Плейлист создан: ${playlist.name}`);
    } else {
      console.log(`ℹ️  Плейлист уже существует: ${playlist.name}`);
      // Очищаем старые треки
      await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
    }
    
    // Добавляем треки в плейлист
    for (let i = 0; i < tracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: tracks[i].id,
        position: i + 1
      });
    }
    
    stats.playlists.push(playlist.name);
    return playlist;
    
  } catch (error) {
    console.error(`❌ Ошибка создания плейлиста:`, error.message);
    return null;
  }
}

/**
 * Создание сборных плейлистов
 */
async function createCompilationPlaylists() {
  try {
    console.log(`\n📁 Создание сборных плейлистов...`);
    
    // Плейлист "Лучшие зарубежные альбомы 2025"
    const foreignTracks = await Track.findAll({
      include: [{
        model: Album,
        where: { source: 'itunes' },
        required: true
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    if (foreignTracks.length > 0) {
      const foreignPlaylist = await Playlist.findOrCreate({
        where: { name: '🌍 Лучшие зарубежные альбомы 2025' },
        defaults: {
          name: '🌍 Лучшие зарубежные альбомы 2025',
          description: 'Самые популярные зарубежные альбомы 2025 года',
          isPublic: true,
          userId: 1
        }
      });
      
      await PlaylistTrack.destroy({ where: { playlistId: foreignPlaylist[0].id } });
      
      for (let i = 0; i < foreignTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: foreignPlaylist[0].id,
          trackId: foreignTracks[i].id,
          position: i + 1
        });
      }
      
      console.log(`✅ Плейлист "Лучшие зарубежные альбомы 2025": ${foreignTracks.length} треков`);
      stats.playlists.push('🌍 Лучшие зарубежные альбомы 2025');
    }
    
    // Плейлист "Лучшие русские альбомы 2025"
    const russianTracks = await Track.findAll({
      include: [{
        model: Album,
        where: { source: 'kissvk' },
        required: true
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    if (russianTracks.length > 0) {
      const russianPlaylist = await Playlist.findOrCreate({
        where: { name: '🇷🇺 Лучшие русские альбомы 2025' },
        defaults: {
          name: '🇷🇺 Лучшие русские альбомы 2025',
          description: 'Самые популярные русские альбомы 2025 года',
          isPublic: true,
          userId: 1
        }
      });
      
      await PlaylistTrack.destroy({ where: { playlistId: russianPlaylist[0].id } });
      
      for (let i = 0; i < russianTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: russianPlaylist[0].id,
          trackId: russianTracks[i].id,
          position: i + 1
        });
      }
      
      console.log(`✅ Плейлист "Лучшие русские альбомы 2025": ${russianTracks.length} треков`);
      stats.playlists.push('🇷🇺 Лучшие русские альбомы 2025');
    }
    
  } catch (error) {
    console.error(`❌ Ошибка создания сборных плейлистов:`, error.message);
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   🎵 ИМПОРТ ПОПУЛЯРНЫХ АЛЬБОМОВ 2025                 ║
║   Зарубежные и русские хиты                           ║
╚═══════════════════════════════════════════════════════╝
  `);
  
  try {
    // Загружаем зарубежные альбомы
    console.log(`\n🌍 ЗАГРУЗКА ЗАРУБЕЖНЫХ АЛЬБОМОВ (${TOP_ALBUMS_2025.foreign.length} альбомов)`);
    console.log(`${'='.repeat(60)}\n`);
    
    for (const albumInfo of TOP_ALBUMS_2025.foreign) {
      const albumData = await loadAlbumFromItunes(albumInfo.artist, albumInfo.album);
      
      if (albumData && albumData.tracks.length > 0) {
        const saved = await saveAlbumToDatabase(albumData, 'itunes');
        
        if (saved) {
          await createPlaylistForAlbum(saved.album, saved.tracks);
        }
      }
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Загружаем русские альбомы
    console.log(`\n\n🇷🇺 ЗАГРУЗКА РУССКИХ АЛЬБОМОВ (${TOP_ALBUMS_2025.russian.length} альбомов)`);
    console.log(`${'='.repeat(60)}\n`);
    
    for (const albumInfo of TOP_ALBUMS_2025.russian) {
      const albumData = await loadAlbumFromKissVK(albumInfo.artist, albumInfo.album);
      
      if (albumData && albumData.tracks.length > 0) {
        const saved = await saveAlbumToDatabase(albumData, 'kissvk');
        
        if (saved) {
          await createPlaylistForAlbum(saved.album, saved.tracks);
        }
      }
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Создаем сборные плейлисты
    await createCompilationPlaylists();
    
    // Финальная статистика
    console.log(`\n\n╔═══════════════════════════════════════════════════════╗`);
    console.log(`║              📊 ИТОГОВАЯ СТАТИСТИКА                   ║`);
    console.log(`╚═══════════════════════════════════════════════════════╝\n`);
    
    console.log(`📀 Альбомы:`);
    console.log(`   - Обработано: ${stats.totalAlbums}`);
    console.log(`   - Успешно: ${stats.successAlbums}`);
    
    console.log(`\n🎵 Треки:`);
    console.log(`   - Обработано: ${stats.totalTracks}`);
    console.log(`   - Успешно: ${stats.successTracks}`);
    console.log(`   - Ошибок: ${stats.failedTracks}`);
    
    console.log(`\n📁 Плейлисты (${stats.playlists.length}):`);
    stats.playlists.forEach(name => {
      console.log(`   ✓ ${name}`);
    });
    
    console.log(`\n✅ Импорт завершен!`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Критическая ошибка:`, error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск
main();
