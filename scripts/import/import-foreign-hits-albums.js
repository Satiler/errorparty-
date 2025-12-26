/**
 * Загрузка популярных зарубежных новинок и альбомов с KissVK
 * 1. Получаем топ зарубежные новинки
 * 2. Получаем популярные альбомы
 * 3. Добавляем в БД и плейлисты
 */
const db = require('./src/models');
const { Track, Album, Playlist, PlaylistTrack } = db;
const kissvkService = require('./src/services/kissvk-puppeteer.service').getInstance();

async function importForeignHits() {
  try {
    console.log('🌍 Импорт популярных зарубежных новинок с KissVK...\n');
    
    // Инициализируем браузер
    await kissvkService.initBrowserPool();
    
    let totalNewTracks = 0;
    let totalNewAlbums = 0;
    
    // ===== 1. ЗАРУБЕЖНЫЕ НОВИНКИ =====
    console.log('📊 Загрузка зарубежных новинок...');
    const foreignTracks = await kissvkService.searchTracks('зарубежные', 100);
    console.log(`✅ Найдено ${foreignTracks.length} зарубежных треков\n`);
    
    let foreignNewTracks = 0;
    for (const track of foreignTracks) {
      try {
        const existing = await Track.findOne({
          where: {
            title: track.title,
            artist: track.artist
          }
        });
        
        if (!existing) {
          await Track.create({
            title: track.title,
            artist: track.artist,
            duration: track.duration || 0,
            streamUrl: track.streamUrl,
            coverUrl: track.coverUrl,
            source: 'kissvk'
          });
          foreignNewTracks++;
          totalNewTracks++;
        }
      } catch (e) {
        console.log(`  ⚠️  Ошибка: ${e.message.substring(0, 50)}`);
      }
    }
    console.log(`📥 Добавлено новых зарубежных треков: ${foreignNewTracks}\n`);
    
    // ===== 2. ПОПУЛЯРНЫЕ АЛЬБОМЫ =====
    console.log('📊 Загрузка популярных альбомов...');
    const albums = await kissvkService.getAlbumsChart(100);
    console.log(`✅ Найдено ${albums.length} популярных альбомов\n`);
    
    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];
      
      try {
        let existingAlbum = await Album.findOne({
          where: {
            title: album.title,
            artist: album.artist
          }
        });
        
        if (!existingAlbum) {
          existingAlbum = await Album.create({
            title: album.title,
            artist: album.artist,
            coverUrl: album.coverUrl,
            year: album.year,
            source: 'kissvk'
          });
          totalNewAlbums++;
        }
        
        // Загружаем треки альбома
        if (album.playlistId) {
          console.log(`  [${i + 1}/${albums.length}] ${album.artist} - ${album.title}`);
          const playlistUrl = `https://kissvk.top/playlist-${album.playlistId}`;
          const result = await kissvkService.extractTracks(playlistUrl);
          const tracks = result.tracks || [];
          
          if (tracks.length > 0) {
            for (const track of tracks) {
              try {
                let existingTrack = await Track.findOne({
                  where: {
                    title: track.title,
                    artist: track.artist
                  }
                });
                
                if (!existingTrack) {
                  existingTrack = await Track.create({
                    title: track.title,
                    artist: track.artist,
                    duration: track.duration || 0,
                    streamUrl: track.streamUrl,
                    coverUrl: track.coverUrl || album.coverUrl,
                    source: 'kissvk'
                  });
                  totalNewTracks++;
                }
                
                // Связываем трек с альбомом
                await existingTrack.setAlbum(existingAlbum);
              } catch (trackErr) {
                // Пропускаем ошибки отдельных треков
              }
            }
            console.log(`      ✅ ${tracks.length} треков`);
          }
        }
      } catch (albumErr) {
        console.log(`  ❌ Ошибка альбома: ${albumErr.message.substring(0, 50)}`);
      }
    }
    
    // Закрываем браузеры
    await kissvkService.closeBrowserPool();
    
    // ===== 3. ОБНОВЛЯЕМ ПЛЕЙЛИСТЫ =====
    console.log('\n📋 Обновление плейлистов...');
    
    // Получаем или создаем пользователя
    const sysUser = await db.User.findOne({ where: { username: 'system' } }) ||
                     await db.User.create({ 
                       username: 'system',
                       email: 'system@errorparty.local',
                       password: 'system'
                     });
    
    // Плейлист "Зарубежные Новинки"
    let foreignPlaylist = await Playlist.findOne({
      where: { name: 'Зарубежные Новинки' }
    });
    
    if (!foreignPlaylist) {
      foreignPlaylist = await Playlist.create({
        userId: sysUser.id,
        name: 'Зарубежные Новинки',
        description: 'Популярные зарубежные новинки с KissVK',
        type: 'editorial',
        isSystem: true
      });
    }
    
    // Очищаем и заполняем плейлист зарубежных новинок
    await PlaylistTrack.destroy({ where: { playlistId: foreignPlaylist.id } });
    
    const allForeignTracks = await Track.findAll({
      limit: 80,
      order: [['createdAt', 'DESC']]
    });
    
    for (let i = 0; i < Math.min(80, allForeignTracks.length); i++) {
      await PlaylistTrack.create({
        playlistId: foreignPlaylist.id,
        trackId: allForeignTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ "Зарубежные Новинки": ${Math.min(80, allForeignTracks.length)} треков`);
    
    // Плейлист "Популярные Альбомы"
    let popularAlbumsPlaylist = await Playlist.findOne({
      where: { name: 'Популярные Альбомы' }
    });
    
    if (!popularAlbumsPlaylist) {
      popularAlbumsPlaylist = await Playlist.create({
        userId: sysUser.id,
        name: 'Популярные Альбомы',
        description: 'Популярные альбомы с KissVK',
        type: 'editorial',
        isSystem: true
      });
    }
    
    // Очищаем и заполняем плейлист популярных альбомов
    await PlaylistTrack.destroy({ where: { playlistId: popularAlbumsPlaylist.id } });
    
    const allTracks = await Track.findAll({
      limit: 150,
      order: [['createdAt', 'DESC']]
    });
    
    for (let i = 0; i < Math.min(150, allTracks.length); i++) {
      await PlaylistTrack.create({
        playlistId: popularAlbumsPlaylist.id,
        trackId: allTracks[i].id,
        position: i + 1
      });
    }
    console.log(`✅ "Популярные Альбомы": ${Math.min(150, allTracks.length)} треков\n`);
    
    // ===== СТАТИСТИКА =====
    console.log('='.repeat(60));
    console.log('📊 ИТОГИ ИМПОРТА:');
    console.log(`   🆕 Новых треков: ${totalNewTracks}`);
    console.log(`   🆕 Новых альбомов: ${totalNewAlbums}`);
    
    const stats = await db.sequelize.query(
      'SELECT COUNT(*) as total_tracks FROM "Tracks"; SELECT COUNT(*) as total_albums FROM "Albums"; SELECT COUNT(*) as total_playlists FROM "Playlists"',
      { raw: true }
    );
    
    const totalTracks = await Track.count();
    const totalAlbums = await Album.count();
    const totalPlaylists = await Playlist.count();
    const totalPlaylistTracks = await PlaylistTrack.count();
    
    console.log(`\n   📈 Всего треков: ${totalTracks}`);
    console.log(`   📚 Всего альбомов: ${totalAlbums}`);
    console.log(`   📋 Всего плейлистов: ${totalPlaylists}`);
    console.log(`   🔗 Связей трек-плейлист: ${totalPlaylistTracks}`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Импорт завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

importForeignHits();
