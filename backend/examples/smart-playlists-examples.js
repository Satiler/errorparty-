/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ УМНЫХ ПОДБОРОК
 * Различные сценарии применения Smart Playlists API
 */

// ============================================
// 1. БАЗОВОЕ ИСПОЛЬЗОВАНИЕ
// ============================================

// Импорт сервиса
const smartPlaylistGenerator = require('./src/services/smart-playlist-generator.service');

// Генерация подборки по настроению
async function example1_moodPlaylist() {
  const result = await smartPlaylistGenerator.generateByMood('happy', 50);
  
  console.log(`Название: ${result.name}`);
  console.log(`Описание: ${result.description}`);
  console.log(`Треков: ${result.tracks.length}`);
  console.log(`Алгоритм: ${result.algorithm}`);
  
  // Первые 5 треков
  result.tracks.slice(0, 5).forEach(track => {
    console.log(`  - ${track.artist} - ${track.title} (Energy: ${track.energy})`);
  });
}

// ============================================
// 2. ПЕРСОНАЛИЗАЦИЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================

async function example2_personalRadar(userId) {
  const radar = await smartPlaylistGenerator.generatePersonalRadar(userId, 50);
  
  console.log(`\nПерсональный радар для пользователя ${userId}:`);
  console.log(`Топ жанры: ${radar.metadata.topGenres.join(', ')}`);
  console.log(`Топ исполнители: ${radar.metadata.topArtists.join(', ')}`);
  console.log(`Средняя энергия: ${radar.metadata.avgEnergy.toFixed(2)}`);
  
  return radar.tracks;
}

// ============================================
// 3. КОНТЕКСТНЫЕ ПОДБОРКИ
// ============================================

// Подборка в зависимости от времени дня
async function example3_timeBasedPlaylist() {
  const hour = new Date().getHours();
  let playlist;
  
  if (hour >= 6 && hour < 12) {
    // Утро: энергичная музыка
    playlist = await smartPlaylistGenerator.generateByMood('energetic', 30);
  } else if (hour >= 12 && hour < 18) {
    // День: фокус и концентрация
    playlist = await smartPlaylistGenerator.generateFocusPlaylist(40);
  } else if (hour >= 18 && hour < 23) {
    // Вечер: расслабление
    playlist = await smartPlaylistGenerator.generateEveningPlaylist(35);
  } else {
    // Ночь: спокойная музыка
    playlist = await smartPlaylistGenerator.generateSleepPlaylist(25);
  }
  
  return playlist;
}

// ============================================
// 4. РЕКОМЕНДАЦИИ НА ОСНОВЕ ТРЕКА
// ============================================

async function example4_similarTracks(trackId) {
  const similar = await smartPlaylistGenerator.generateSimilarTracks(trackId, 20);
  
  console.log(`\nПохожие на "${similar.sourceTrack.artist} - ${similar.sourceTrack.title}":`);
  
  similar.tracks.forEach((track, index) => {
    const match = track.artist === similar.sourceTrack.artist ? '🎤' : 
                  track.genre === similar.sourceTrack.genre ? '🎵' : '🎶';
    console.log(`  ${index + 1}. ${match} ${track.artist} - ${track.title}`);
  });
  
  return similar;
}

// ============================================
// 5. СОЗДАНИЕ УМНОГО ПЛЕЙЛИСТА DJ
// ============================================

async function example5_djMix() {
  // Создаем микс с плавным переходом BPM
  const ranges = [
    { min: 100, max: 110, count: 10 },
    { min: 110, max: 120, count: 15 },
    { min: 120, max: 130, count: 20 },
    { min: 130, max: 140, count: 15 },
    { min: 140, max: 150, count: 10 }
  ];
  
  let allTracks = [];
  
  for (const range of ranges) {
    const result = await smartPlaylistGenerator.generateBPMPlaylist(
      range.min, 
      range.max, 
      range.count
    );
    allTracks.push(...result.tracks);
  }
  
  console.log(`\nDJ Mix создан: ${allTracks.length} треков`);
  console.log(`BPM диапазон: 100-150 с плавным переходом`);
  
  return allTracks;
}

// ============================================
// 6. КОМБИНИРОВАННЫЕ ПОДБОРКИ
// ============================================

async function example6_combinedPlaylist() {
  // Создаем комплексную подборку для вечеринки
  const energetic = await smartPlaylistGenerator.generateByMood('energetic', 20);
  const party = await smartPlaylistGenerator.generateByMood('party', 20);
  const happy = await smartPlaylistGenerator.generateByMood('happy', 20);
  
  // Объединяем и перемешиваем
  const combined = [
    ...energetic.tracks,
    ...party.tracks,
    ...happy.tracks
  ];
  
  // Используем smooth shuffle для плавного микса
  const shuffled = smartPlaylistGenerator._smoothShuffle(combined);
  
  return {
    name: '🎉 Вечеринка: Полный микс',
    description: 'Энергичная музыка для отличной вечеринки',
    tracks: shuffled,
    algorithm: 'combined-party'
  };
}

// ============================================
// 7. АНАЛИЗ И СТАТИСТИКА
// ============================================

async function example7_playlistAnalytics() {
  const workout = await smartPlaylistGenerator.generateWorkoutPlaylist(50);
  
  // Статистика подборки
  const stats = {
    totalTracks: workout.tracks.length,
    avgEnergy: workout.tracks.reduce((sum, t) => sum + (t.energy || 0), 0) / workout.tracks.length,
    avgBpm: workout.tracks.reduce((sum, t) => sum + (t.bpm || 0), 0) / workout.tracks.length,
    genres: [...new Set(workout.tracks.map(t => t.genre).filter(Boolean))],
    topArtists: getTopArtists(workout.tracks, 5)
  };
  
  console.log('\n📊 Статистика подборки "Тренировка":');
  console.log(`  Треков: ${stats.totalTracks}`);
  console.log(`  Средняя энергия: ${stats.avgEnergy.toFixed(2)}`);
  console.log(`  Средний BPM: ${stats.avgBpm.toFixed(0)}`);
  console.log(`  Жанры: ${stats.genres.join(', ')}`);
  console.log(`  Топ исполнители: ${stats.topArtists.join(', ')}`);
  
  return stats;
}

function getTopArtists(tracks, count) {
  const artistCount = {};
  tracks.forEach(t => {
    if (t.artist) {
      artistCount[t.artist] = (artistCount[t.artist] || 0) + 1;
    }
  });
  
  return Object.entries(artistCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([artist]) => artist);
}

// ============================================
// 8. ИНТЕГРАЦИЯ С EXPRESS API
// ============================================

// Пример middleware для кэширования
const NodeCache = require('node-cache');
const playlistCache = new NodeCache({ stdTTL: 3600 }); // 1 час

async function example8_cachedEndpoint(req, res) {
  const { mood } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const cacheKey = `mood_${mood}_${limit}`;
  
  // Проверяем кэш
  const cached = playlistCache.get(cacheKey);
  if (cached) {
    console.log('📦 Returning from cache');
    return res.json(cached);
  }
  
  // Генерируем новую подборку
  const result = await smartPlaylistGenerator.generateByMood(mood, limit);
  
  // Сохраняем в кэш
  playlistCache.set(cacheKey, result);
  
  res.json(result);
}

// ============================================
// 9. ПАКЕТНАЯ ГЕНЕРАЦИЯ
// ============================================

async function example9_batchGeneration() {
  console.log('\n🔄 Пакетная генерация всех подборок...');
  
  const playlists = await Promise.all([
    smartPlaylistGenerator.generateByMood('happy', 30),
    smartPlaylistGenerator.generateByMood('energetic', 30),
    smartPlaylistGenerator.generateWorkoutPlaylist(40),
    smartPlaylistGenerator.generateFocusPlaylist(50),
    smartPlaylistGenerator.generateRetroPlaylist(40),
    smartPlaylistGenerator.generateWeeklyDiscovery(30)
  ]);
  
  playlists.forEach((playlist, index) => {
    console.log(`  ${index + 1}. ${playlist.name} - ${playlist.tracks.length} треков`);
  });
  
  return playlists;
}

// ============================================
// 10. ЭКСПОРТ В ВНЕШНИЕ СЕРВИСЫ
// ============================================

async function example10_exportToSpotify(userId, playlistData) {
  // Генерируем подборку
  const radar = await smartPlaylistGenerator.generatePersonalRadar(userId, 50);
  
  // Форматируем для Spotify API
  const spotifyTracks = radar.tracks.map(track => ({
    name: track.title,
    artist: track.artist,
    // Поиск по названию и исполнителю в Spotify
    search_query: `track:${track.title} artist:${track.artist}`
  }));
  
  console.log('\n📤 Экспорт в Spotify:');
  console.log(`  Название: ${radar.name}`);
  console.log(`  Треков: ${spotifyTracks.length}`);
  
  // Здесь был бы вызов Spotify API
  // await spotifyAPI.createPlaylist(...)
  
  return spotifyTracks;
}

// ============================================
// 11. A/B ТЕСТИРОВАНИЕ АЛГОРИТМОВ
// ============================================

async function example11_abTesting(trackId) {
  // Генерируем две разные рекомендации
  const methodA = await smartPlaylistGenerator.generateSimilarTracks(trackId, 20);
  const methodB = await smartPlaylistGenerator.generatePersonalRadar(userId, 20);
  
  // Сравниваем результаты
  const comparison = {
    methodA: {
      name: methodA.name,
      algorithm: methodA.algorithm,
      uniqueTracks: methodA.tracks.length
    },
    methodB: {
      name: methodB.name,
      algorithm: methodB.algorithm,
      uniqueTracks: methodB.tracks.length
    },
    overlap: methodA.tracks.filter(t1 => 
      methodB.tracks.some(t2 => t2.id === t1.id)
    ).length
  };
  
  console.log('\n🔬 A/B тестирование:');
  console.log(`  Метод A: ${comparison.methodA.name} (${comparison.methodA.uniqueTracks} треков)`);
  console.log(`  Метод B: ${comparison.methodB.name} (${comparison.methodB.uniqueTracks} треков)`);
  console.log(`  Совпадений: ${comparison.overlap}`);
  
  return comparison;
}

// ============================================
// 12. ДИНАМИЧЕСКОЕ ОБНОВЛЕНИЕ
// ============================================

async function example12_livePlaylist(userId) {
  // Создаем живой плейлист, который обновляется каждый час
  const LivePlaylist = {
    userId,
    lastUpdate: null,
    tracks: [],
    
    async refresh() {
      const hour = new Date().getHours();
      this.tracks = await smartPlaylistGenerator.generateDailySoundtrack(userId, 60);
      this.lastUpdate = new Date();
      
      console.log(`\n🔄 Обновлен в ${this.lastUpdate.toLocaleTimeString()}`);
      console.log(`  Время суток: ${hour}:00`);
      console.log(`  Треков: ${this.tracks.tracks.length}`);
      
      return this.tracks;
    }
  };
  
  // Обновляем каждый час
  setInterval(() => LivePlaylist.refresh(), 60 * 60 * 1000);
  
  // Первое обновление
  await LivePlaylist.refresh();
  
  return LivePlaylist;
}

// ============================================
// ЗАПУСК ПРИМЕРОВ
// ============================================

async function runExamples() {
  console.log('🎵 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ УМНЫХ ПОДБОРОК\n');
  console.log('=' .repeat(50));
  
  try {
    // Раскомментируйте нужные примеры:
    
    // await example1_moodPlaylist();
    // await example2_personalRadar(1);
    // await example3_timeBasedPlaylist();
    // await example4_similarTracks(123);
    // await example5_djMix();
    // await example6_combinedPlaylist();
    // await example7_playlistAnalytics();
    // await example9_batchGeneration();
    
    console.log('\n✅ Все примеры выполнены успешно!');
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
  }
}

// Экспорт для использования
module.exports = {
  example1_moodPlaylist,
  example2_personalRadar,
  example3_timeBasedPlaylist,
  example4_similarTracks,
  example5_djMix,
  example6_combinedPlaylist,
  example7_playlistAnalytics,
  example8_cachedEndpoint,
  example9_batchGeneration,
  example10_exportToSpotify,
  example11_abTesting,
  example12_livePlaylist,
  runExamples
};

// Запуск, если вызван напрямую
if (require.main === module) {
  runExamples();
}
