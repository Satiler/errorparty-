/**
 * Массовое заполнение альбомов одним большим запросом
 * Вместо поиска по каждому альбому - загружаем ВСЮ библиотеку пользователя
 */
const { Album, Track } = require('./src/models');
const { sequelize } = require('./src/config/database');
const vkService = require('./src/services/vk-music.service');

async function bulkFillFromVK() {
  console.log('\n🎵 === МАССОВАЯ ЗАГРУЗКА ИЗ VK MUSIC ===');
  console.log('⚡ Один большой запрос вместо сотен маленьких\n');

  try {
    if (!vkService.isAvailable()) {
      console.log('❌ VK Music недоступен (нет токена)');
      return;
    }

    // 1. Получаем ID текущего пользователя
    console.log('1️⃣ Получение информации о пользователе...');
    const userInfo = await vkService.getCurrentUser();
    
    if (!userInfo) {
      console.log('❌ Не удалось получить ID пользователя');
      return;
    }
    
    console.log(`✅ Пользователь: ${userInfo.first_name} ${userInfo.last_name} (ID: ${userInfo.id})`);

    // 2. Загружаем ВСЮ аудиобиблиотеку пользователя
    console.log('\n2️⃣ Загрузка всей аудиобиблиотеки...');
    const allVKTracks = await vkService.getAllUserTracks(userInfo.id);
    
    console.log(`✅ Загружено ${allVKTracks.length} треков из VK\n`);

    if (allVKTracks.length === 0) {
      console.log('⚠️  Аудиобиблиотека пуста');
      return;
    }

    // 3. Группируем треки по исполнителю + альбом
    console.log('3️⃣ Группировка треков по альбомам...');
    const tracksByAlbum = new Map();
    
    for (const track of allVKTracks) {
      if (track.albumTitle) {
        const key = `${track.artist}|||${track.albumTitle}`.toLowerCase();
        if (!tracksByAlbum.has(key)) {
          tracksByAlbum.set(key, []);
        }
        tracksByAlbum.get(key).push(track);
      }
    }
    
    console.log(`✅ Найдено ${tracksByAlbum.size} уникальных альбомов\n`);

    // 4. Получаем пустые альбомы из БД
    console.log('4️⃣ Поиск пустых альбомов в базе...');
    const allAlbums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false,
        attributes: ['id']
      }]
    });

    const emptyAlbums = allAlbums.filter(album => !album.tracks || album.tracks.length === 0);
    console.log(`✅ Найдено ${emptyAlbums.length} пустых альбомов\n`);

    // 5. Сопоставляем и заполняем
    console.log('5️⃣ Заполнение альбомов...');
    let matched = 0;
    let totalTracksAdded = 0;

    for (const album of emptyAlbums) {
      const searchKey = `${album.artist}|||${album.title}`.toLowerCase();
      
      // Ищем точное совпадение
      let tracks = tracksByAlbum.get(searchKey);
      
      // Если нет точного - ищем по частичному совпадению
      if (!tracks) {
        const artistLower = album.artist.toLowerCase();
        const titleLower = album.title.toLowerCase();
        
        for (const [key, value] of tracksByAlbum.entries()) {
          const [keyArtist, keyTitle] = key.split('|||');
          
          if (keyArtist.includes(artistLower) && keyTitle.includes(titleLower)) {
            tracks = value;
            break;
          }
        }
      }

      if (tracks && tracks.length > 0) {
        matched++;
        console.log(`\n[${matched}] ${album.artist} - ${album.title}`);
        console.log(`  ✅ Найдено ${tracks.length} треков`);
        
        let added = 0;
        
        for (let i = 0; i < Math.min(tracks.length, 20); i++) {
          const trackData = tracks[i];
          
          try {
            if (!trackData.streamUrl) continue;

            // Проверяем существование
            const existingTrack = await Track.findOne({
              where: {
                title: trackData.title,
                artist: trackData.artist
              }
            });

            if (existingTrack && !existingTrack.albumId) {
              await existingTrack.update({ 
                albumId: album.id,
                streamUrl: trackData.streamUrl
              });
              added++;
            } else if (!existingTrack) {
              await Track.create({
                title: trackData.title,
                artist: trackData.artist,
                albumId: album.id,
                streamUrl: trackData.streamUrl,
                duration: trackData.duration || 180,
                genre: album.genre || 'Unknown',
                trackNumber: i + 1,
                source: 'vk-music',
                allowDownload: true
              });
              added++;
            }
          } catch (error) {
            if (!error.message.includes('unique')) {
              console.log(`    ⚠️  ${error.message.substring(0, 50)}`);
            }
          }
        }

        if (added > 0) {
          totalTracksAdded += added;
          console.log(`  ✅ Добавлено ${added} треков`);
        }
      }
    }

    console.log(`\n\n✅ === ЗАВЕРШЕНО ===`);
    console.log(`📊 Обработано альбомов: ${emptyAlbums.length}`);
    console.log(`✅ Совпадений найдено: ${matched}`);
    console.log(`🎵 Всего треков добавлено: ${totalTracksAdded}`);
    console.log(`⚡ Потребовалось всего 2 запроса к VK API!\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

bulkFillFromVK();
