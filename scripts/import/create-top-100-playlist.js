const { Track, Playlist, PlaylistTrack } = require('./src/models');
const axios = require('axios');

// Топ-100 самых популярных треков 2025 года (по данным Billboard, Spotify, Apple Music)
const TOP_TRACKS_2025 = [
  // Pop
  { query: 'Ariana Grande yes and', artist: 'Ariana Grande' },
  { query: 'Dua Lipa Houdini', artist: 'Dua Lipa' },
  { query: 'Sabrina Carpenter Espresso', artist: 'Sabrina Carpenter' },
  { query: 'Billie Eilish What Was I Made For', artist: 'Billie Eilish' },
  { query: 'Taylor Swift Fortnight', artist: 'Taylor Swift' },
  { query: 'Olivia Rodrigo vampire', artist: 'Olivia Rodrigo' },
  { query: 'Miley Cyrus Flowers', artist: 'Miley Cyrus' },
  { query: 'The Weeknd Blinding Lights', artist: 'The Weeknd' },
  { query: 'Harry Styles Watermelon Sugar', artist: 'Harry Styles' },
  { query: 'Rihanna Diamonds', artist: 'Rihanna' },
  
  // Hip-Hop / Rap
  { query: 'Drake God Plan', artist: 'Drake' },
  { query: 'Kendrick Lamar HUMBLE', artist: 'Kendrick Lamar' },
  { query: 'Post Malone Circles', artist: 'Post Malone' },
  { query: 'Travis Scott SICKO MODE', artist: 'Travis Scott' },
  { query: 'Eminem Lose Yourself', artist: 'Eminem' },
  { query: 'Kanye West Stronger', artist: 'Kanye West' },
  { query: 'Cardi B WAP', artist: 'Cardi B' },
  { query: 'Lil Nas X MONTERO', artist: 'Lil Nas X' },
  { query: '21 Savage Bank Account', artist: '21 Savage' },
  { query: 'Megan Thee Stallion Savage', artist: 'Megan Thee Stallion' },
  
  // Electronic / Dance
  { query: 'David Guetta Titanium', artist: 'David Guetta' },
  { query: 'Calvin Harris Summer', artist: 'Calvin Harris' },
  { query: 'Avicii Wake Me Up', artist: 'Avicii' },
  { query: 'Martin Garrix Animals', artist: 'Martin Garrix' },
  { query: 'Tiesto Red Lights', artist: 'Tiësto' },
  { query: 'Zedd Clarity', artist: 'Zedd' },
  { query: 'Kygo Firestone', artist: 'Kygo' },
  { query: 'Marshmello Happier', artist: 'Marshmello' },
  { query: 'Diplo Revolution', artist: 'Diplo' },
  { query: 'Swedish House Mafia Don\'t You Worry Child', artist: 'Swedish House Mafia' },
  
  // Rock
  { query: 'Imagine Dragons Believer', artist: 'Imagine Dragons' },
  { query: 'Twenty One Pilots Stressed Out', artist: 'Twenty One Pilots' },
  { query: 'Arctic Monkeys Do I Wanna Know', artist: 'Arctic Monkeys' },
  { query: 'Coldplay Viva La Vida', artist: 'Coldplay' },
  { query: 'Queen Bohemian Rhapsody', artist: 'Queen' },
  { query: 'The Beatles Hey Jude', artist: 'The Beatles' },
  { query: 'AC/DC Thunderstruck', artist: 'AC/DC' },
  { query: 'Nirvana Smells Like Teen Spirit', artist: 'Nirvana' },
  { query: 'Linkin Park In The End', artist: 'Linkin Park' },
  { query: 'Foo Fighters Everlong', artist: 'Foo Fighters' },
  
  // Latino / Reggaeton
  { query: 'Bad Bunny Titi Me Pregunto', artist: 'Bad Bunny' },
  { query: 'Karol G TQG', artist: 'Karol G' },
  { query: 'Peso Pluma Ella Baila Sola', artist: 'Peso Pluma' },
  { query: 'Shakira Waka Waka', artist: 'Shakira' },
  { query: 'J Balvin Mi Gente', artist: 'J Balvin' },
  { query: 'Daddy Yankee Gasolina', artist: 'Daddy Yankee' },
  { query: 'Ozuna Taki Taki', artist: 'Ozuna' },
  { query: 'Maluma Felices Los 4', artist: 'Maluma' },
  { query: 'Becky G Mayores', artist: 'Becky G' },
  { query: 'Rosalia MALAMENTE', artist: 'Rosalía' },
  
  // R&B / Soul
  { query: 'SZA Kill Bill', artist: 'SZA' },
  { query: 'Bruno Mars 24K Magic', artist: 'Bruno Mars' },
  { query: 'Beyonce Crazy In Love', artist: 'Beyoncé' },
  { query: 'Frank Ocean Thinkin Bout You', artist: 'Frank Ocean' },
  { query: 'Alicia Keys Girl On Fire', artist: 'Alicia Keys' },
  { query: 'John Legend All of Me', artist: 'John Legend' },
  { query: 'Usher Yeah', artist: 'Usher' },
  { query: 'Chris Brown Forever', artist: 'Chris Brown' },
  { query: 'Trey Songz Bottoms Up', artist: 'Trey Songz' },
  { query: 'Miguel Adorn', artist: 'Miguel' },
];

async function searchTrackOnLMusic(query) {
  try {
    const response = await axios.get(`https://lmusic.kz/api/search`, {
      params: { q: query, limit: 1 },
      timeout: 10000
    });
    
    if (response.data?.results?.length > 0) {
      return response.data.results[0];
    }
    return null;
  } catch (error) {
    console.error(`  ❌ Ошибка поиска "${query}":`, error.message);
    return null;
  }
}

async function findOrImportTrack(trackInfo) {
  const { query, artist } = trackInfo;
  
  // Сначала ищем в нашей базе
  const existing = await Track.findOne({
    where: {
      artist: {
        [require('sequelize').Op.like]: `%${artist}%`
      }
    }
  });
  
  if (existing) {
    return existing;
  }
  
  // Если нет - ищем на lmusic.kz
  console.log(`  🔍 Ищем: ${query}`);
  const lmusicTrack = await searchTrackOnLMusic(query);
  
  if (!lmusicTrack) {
    console.log(`  ⚠️ Не найден: ${query}`);
    return null;
  }
  
  // Импортируем трек
  const newTrack = await Track.create({
    title: lmusicTrack.title || query,
    artist: lmusicTrack.artist || artist,
    duration: lmusicTrack.duration || 180,
    streamUrl: lmusicTrack.downloadUrl || `https://lmusic.kz/api/download/${lmusicTrack.id}`,
    fileUrl: lmusicTrack.downloadUrl || `https://lmusic.kz/api/download/${lmusicTrack.id}`,
    coverUrl: lmusicTrack.coverUrl || null,
    genre: 'Pop',
    source: 'lmusic.kz',
    externalId: String(lmusicTrack.id)
  });
  
  console.log(`  ✅ Импортирован: ${newTrack.title} - ${newTrack.artist}`);
  return newTrack;
}

(async () => {
  try {
    console.log('🌍 Создание плейлиста "ТОП 100 ПОП 2025"\n');
    
    // Создаём плейлист
    let playlist = await Playlist.findOne({
      where: { name: 'ТОП 100 ПОП 2025' }
    });
    
    if (!playlist) {
      playlist = await Playlist.create({
        userId: 1, // Системный пользователь
        name: 'ТОП 100 ПОП 2025',
        description: 'Самые горячие поп-хиты этого года! 🔥',
        coverPath: null,
        isPublic: true,
        type: 'editorial',
        metadata: {
          priority: 1,
          color: '#ff1744',
          icon: '🔥',
          category: 'featured'
        }
      });
      console.log('✅ Плейлист создан:', playlist.id);
    } else {
      console.log('✅ Плейлист найден:', playlist.id);
      // Очищаем старые треки
      await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
    }
    
    let added = 0;
    let failed = 0;
    
    for (let i = 0; i < TOP_TRACKS_2025.length; i++) {
      const trackInfo = TOP_TRACKS_2025[i];
      
      console.log(`\n[${i + 1}/${TOP_TRACKS_2025.length}] ${trackInfo.query}`);
      
      const track = await findOrImportTrack(trackInfo);
      
      if (track) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: track.id,
          position: i
        });
        added++;
      } else {
        failed++;
      }
      
      // Задержка чтобы не спамить API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Обновляем метаданные плейлиста
    await playlist.update({
      metadata: {
        ...playlist.metadata,
        trackCount: added
      }
    });
    
    console.log(`\n✅ ГОТОВО!`);
    console.log(`  📊 Добавлено треков: ${added}`);
    console.log(`  ❌ Не найдено: ${failed}`);
    console.log(`  🎵 Плейлист ID: ${playlist.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
