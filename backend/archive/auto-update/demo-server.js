/**
 * Демонстрация работы системы автообновления плейлистов
 * Работает без реальных API ключей, используя тестовые данные
 */

const express = require('express');
const app = express();

// Mock данные - симуляция ответов от API
const mockSpotifyTracks = [
  { title: 'Flowers', artist: 'Miley Cyrus', position: 1, score: 0.95, source: 'spotify' },
  { title: 'Kill Bill', artist: 'SZA', position: 2, score: 0.92, source: 'spotify' },
  { title: 'Anti-Hero', artist: 'Taylor Swift', position: 3, score: 0.89, source: 'spotify' },
  { title: 'Unholy', artist: 'Sam Smith', position: 4, score: 0.87, source: 'spotify' },
  { title: 'As It Was', artist: 'Harry Styles', position: 5, score: 0.85, source: 'spotify' }
];

const mockAppleMusicTracks = [
  { title: 'Flowers', artist: 'Miley Cyrus', position: 1, score: 0.94, source: 'apple' },
  { title: 'Kill Bill', artist: 'SZA', position: 2, score: 0.91, source: 'apple' },
  { title: 'Levitating', artist: 'Dua Lipa', position: 3, score: 0.88, source: 'apple' },
  { title: 'Blinding Lights', artist: 'The Weeknd', position: 4, score: 0.86, source: 'apple' },
  { title: 'Save Your Tears', artist: 'The Weeknd', position: 5, score: 0.84, source: 'apple' }
];

const mockBillboardTracks = [
  { title: 'Flowers', artist: 'Miley Cyrus', position: 1, score: 0.96, source: 'billboard' },
  { title: 'Anti-Hero', artist: 'Taylor Swift', position: 2, score: 0.93, source: 'billboard' },
  { title: 'Kill Bill', artist: 'SZA', position: 3, score: 0.90, source: 'billboard' },
  { title: 'Unholy', artist: 'Sam Smith', position: 4, score: 0.88, source: 'billboard' },
  { title: 'Heat Waves', artist: 'Glass Animals', position: 5, score: 0.85, source: 'billboard' }
];

const mockShazamTracks = [
  { title: 'Flowers', artist: 'Miley Cyrus', position: 1, score: 0.93, source: 'shazam' },
  { title: 'Kill Bill', artist: 'SZA', position: 2, score: 0.90, source: 'shazam' },
  { title: 'Unholy', artist: 'Sam Smith', position: 3, score: 0.87, source: 'shazam' },
  { title: 'Anti-Hero', artist: 'Taylor Swift', position: 4, score: 0.85, source: 'shazam' },
  { title: 'As It Was', artist: 'Harry Styles', position: 5, score: 0.83, source: 'shazam' }
];

// Веса источников (из конфигурации)
const WEIGHTS = {
  spotify: 0.30,
  apple: 0.25,
  billboard: 0.25,
  shazam: 0.20
};

/**
 * Агрегация треков из всех источников
 */
function aggregateTracks() {
  const trackScores = new Map();
  
  // Обработка всех источников
  const allSources = [
    { tracks: mockSpotifyTracks, weight: WEIGHTS.spotify, name: 'Spotify' },
    { tracks: mockAppleMusicTracks, weight: WEIGHTS.apple, name: 'Apple Music' },
    { tracks: mockBillboardTracks, weight: WEIGHTS.billboard, name: 'Billboard' },
    { tracks: mockShazamTracks, weight: WEIGHTS.shazam, name: 'Shazam' }
  ];
  
  for (const source of allSources) {
    for (const track of source.tracks) {
      const key = `${track.artist}-${track.title}`.toLowerCase();
      
      // Формула взвешенного скоринга
      const weightedScore = source.weight * track.score;
      
      if (trackScores.has(key)) {
        const existing = trackScores.get(key);
        existing.totalScore += weightedScore;
        existing.sources.push(source.name);
        existing.appearances++;
      } else {
        trackScores.set(key, {
          title: track.title,
          artist: track.artist,
          totalScore: weightedScore,
          sources: [source.name],
          appearances: 1
        });
      }
    }
  }
  
  // Сортировка по общему скору
  return Array.from(trackScores.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((track, index) => ({
      position: index + 1,
      ...track,
      totalScore: track.totalScore.toFixed(3)
    }));
}

/**
 * Расчет изменений плейлиста
 */
function calculatePlaylistChanges(currentPlaylist, newTracks, updatePercentage = 0.15) {
  const maxChanges = Math.ceil(currentPlaylist.length * updatePercentage);
  const toAdd = [];
  const toRemove = [];
  const toKeep = [];
  
  // Топ треки для добавления
  for (let i = 0; i < Math.min(maxChanges, newTracks.length); i++) {
    const track = newTracks[i];
    const exists = currentPlaylist.some(t => 
      t.artist.toLowerCase() === track.artist.toLowerCase() && 
      t.title.toLowerCase() === track.title.toLowerCase()
    );
    
    if (!exists) {
      toAdd.push(track);
    }
  }
  
  // Треки для удаления (самые низкие позиции)
  const tracksToRemoveCount = Math.min(toAdd.length, maxChanges);
  for (let i = currentPlaylist.length - 1; i >= currentPlaylist.length - tracksToRemoveCount; i--) {
    toRemove.push(currentPlaylist[i]);
  }
  
  // Остальные остаются
  for (let i = 0; i < currentPlaylist.length - tracksToRemoveCount; i++) {
    toKeep.push(currentPlaylist[i]);
  }
  
  return { toAdd, toRemove, toKeep };
}

// API Routes
app.use(express.json());

app.get('/demo/charts/aggregate', (req, res) => {
  console.log('\n🔍 Запрос агрегации чартов...');
  
  const aggregated = aggregateTracks();
  
  console.log(`✅ Агрегировано ${aggregated.length} треков из 4 источников`);
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    sources: {
      spotify: { weight: WEIGHTS.spotify, tracks: mockSpotifyTracks.length },
      appleMusic: { weight: WEIGHTS.apple, tracks: mockAppleMusicTracks.length },
      billboard: { weight: WEIGHTS.billboard, tracks: mockBillboardTracks.length },
      shazam: { weight: WEIGHTS.shazam, tracks: mockShazamTracks.length }
    },
    aggregatedTracks: aggregated,
    totalTracks: aggregated.length
  });
});

app.post('/demo/playlist/:id/actualize', (req, res) => {
  console.log(`\n🔄 Запрос актуализации плейлиста #${req.params.id}...`);
  
  // Текущий плейлист (mock)
  const currentPlaylist = [
    { position: 1, title: 'Old Song 1', artist: 'Old Artist 1' },
    { position: 2, title: 'Old Song 2', artist: 'Old Artist 2' },
    { position: 3, title: 'Old Song 3', artist: 'Old Artist 3' },
    { position: 4, title: 'Old Song 4', artist: 'Old Artist 4' },
    { position: 5, title: 'Old Song 5', artist: 'Old Artist 5' },
    { position: 6, title: 'Old Song 6', artist: 'Old Artist 6' },
    { position: 7, title: 'Old Song 7', artist: 'Old Artist 7' },
    { position: 8, title: 'Old Song 8', artist: 'Old Artist 8' },
    { position: 9, title: 'Old Song 9', artist: 'Old Artist 9' },
    { position: 10, title: 'Old Song 10', artist: 'Old Artist 10' }
  ];
  
  const newTracks = aggregateTracks();
  const changes = calculatePlaylistChanges(currentPlaylist, newTracks, 0.15);
  
  console.log(`📊 Изменения:`);
  console.log(`   ➕ Добавить: ${changes.toAdd.length} треков`);
  console.log(`   ➖ Удалить: ${changes.toRemove.length} треков`);
  console.log(`   ✓ Оставить: ${changes.toKeep.length} треков`);
  
  res.json({
    success: true,
    playlistId: req.params.id,
    timestamp: new Date().toISOString(),
    currentSize: currentPlaylist.length,
    changes: {
      toAdd: changes.toAdd.slice(0, 5), // Первые 5 для краткости
      toRemove: changes.toRemove,
      toKeep: changes.toKeep.length,
      totalChanges: changes.toAdd.length + changes.toRemove.length
    },
    requiresModeration: true,
    status: 'pending_approval'
  });
});

app.get('/demo/recommendations/:userId', (req, res) => {
  console.log(`\n🎵 Запрос рекомендаций для пользователя #${req.params.userId}...`);
  
  // Mock рекомендации
  const recommendations = [
    { 
      title: 'Flowers', 
      artist: 'Miley Cyrus', 
      score: 0.95,
      reason: 'Топ-1 в 4 чартах',
      sources: ['Spotify', 'Apple Music', 'Billboard', 'Shazam']
    },
    { 
      title: 'Kill Bill', 
      artist: 'SZA', 
      score: 0.92,
      reason: 'Популярно у похожих пользователей',
      sources: ['Spotify', 'Apple Music', 'Billboard', 'Shazam']
    },
    { 
      title: 'Anti-Hero', 
      artist: 'Taylor Swift', 
      score: 0.89,
      reason: 'Новый релиз любимого артиста',
      sources: ['Spotify', 'Billboard', 'Shazam']
    }
  ];
  
  console.log(`✅ Сгенерировано ${recommendations.length} рекомендаций`);
  
  res.json({
    success: true,
    userId: req.params.userId,
    timestamp: new Date().toISOString(),
    recommendations: recommendations,
    totalRecommendations: recommendations.length
  });
});

app.get('/demo/status', (req, res) => {
  res.json({
    status: 'running',
    mode: 'demo',
    message: 'Система работает в демо-режиме с mock данными',
    features: {
      chartsAggregation: true,
      playlistActualization: true,
      recommendations: true,
      moderation: true
    },
    sources: {
      spotify: 'mock',
      appleMusic: 'mock',
      billboard: 'mock',
      shazam: 'mock'
    }
  });
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   ДЕМО: Система автообновления плейлистов               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Сервер запущен на порту: ${PORT}`);
  console.log(`\n📡 Доступные endpoints:\n`);
  console.log(`   GET  http://localhost:${PORT}/demo/status`);
  console.log(`   GET  http://localhost:${PORT}/demo/charts/aggregate`);
  console.log(`   POST http://localhost:${PORT}/demo/playlist/1/actualize`);
  console.log(`   GET  http://localhost:${PORT}/demo/recommendations/1`);
  console.log('\n═══════════════════════════════════════════════════════════\n');
});
