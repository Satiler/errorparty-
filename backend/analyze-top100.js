const { Track, PlaylistTrack, sequelize } = require('./src/models');

(async () => {
  console.log('\n🔥 ТОП 100 ХИТОВ - ДЕТАЛЬНЫЙ АНАЛИЗ:\n');
  
  const tracks = await sequelize.query(`
    SELECT 
      t.artist,
      t.title,
      t."playCount",
      t."coverUrl",
      t.source,
      t.provider,
      t.duration,
      t."createdAt"
    FROM "Tracks" t
    INNER JOIN "PlaylistTracks" pt ON pt."trackId" = t.id
    WHERE pt."playlistId" = 423
    ORDER BY pt.position
    LIMIT 30
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('📊 СТАТИСТИКА:');
  const withCovers = tracks.filter(t => t.coverUrl).length;
  const kissvk = tracks.filter(t => t.source === 'kissvk' || t.provider === 'kissvk').length;
  const avgPlays = Math.round(tracks.reduce((sum, t) => sum + (parseInt(t.playCount) || 0), 0) / tracks.length);
  
  console.log(`  Всего: ${tracks.length} треков`);
  console.log(`  С обложками: ${withCovers} (${Math.round(withCovers/tracks.length*100)}%)`);
  console.log(`  KissVK: ${kissvk}`);
  console.log(`  Средние прослушивания: ${avgPlays}`);
  console.log('');

  console.log('🎵 ПЕРВЫЕ 30 ТРЕКОВ:\n');
  
  tracks.forEach((t, i) => {
    const cover = t.coverUrl ? '🖼️' : '❌';
    const source = t.source || t.provider || 'MANUAL';
    const plays = t.playCount || 0;
    const dur = t.duration ? `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}` : 'N/A';
    
    // Проверка на старые треки
    const daysOld = Math.floor((Date.now() - new Date(t.createdAt)) / (1000*60*60*24));
    const ageWarning = daysOld > 90 ? ` ⚠️ СТАРЫЙ (${daysOld}д)` : '';
    
    console.log(`${i+1}. ${t.artist} - ${t.title.substring(0, 45)}`);
    console.log(`   ${cover} ${dur} | 👥 ${plays} plays | Source: ${source}${ageWarning}`);
  });

  console.log('\n📈 ПРОБЛЕМЫ:');
  
  // Проверка на низкую активность
  const lowPlays = tracks.filter(t => (t.playCount || 0) < 10).length;
  if (lowPlays > 5) {
    console.log(`  ⚠️ ${lowPlays} треков с низкой активностью (<10 прослушиваний)`);
  }

  // Проверка на старые треки
  const oldTracks = tracks.filter(t => {
    const days = Math.floor((Date.now() - new Date(t.createdAt)) / (1000*60*60*24));
    return days > 90;
  }).length;
  
  if (oldTracks > 10) {
    console.log(`  ⚠️ ${oldTracks} старых треков (>90 дней)`);
  }

  // Проверка на дубликаты исполнителей
  const artistCounts = {};
  tracks.forEach(t => {
    artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
  });
  
  const duplicates = Object.entries(artistCounts).filter(([artist, count]) => count > 5);
  if (duplicates.length > 0) {
    console.log(`  ⚠️ Частые исполнители:`);
    duplicates.forEach(([artist, count]) => {
      console.log(`     ${artist}: ${count} треков`);
    });
  }

  console.log('');
  process.exit(0);
})();
