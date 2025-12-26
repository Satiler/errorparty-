/**
 * Анализ содержимого editorial плейлистов
 */

const { Playlist, Track, PlaylistTrack, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function analyzeEditorialPlaylists() {
  console.log('🔍 АНАЛИЗ EDITORIAL ПЛЕЙЛИСТОВ\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const playlists = await Playlist.findAll({
    where: { 
      type: 'editorial',
      id: { [Op.in]: [423, 424, 425, 426, 427] }
    },
    order: [['id', 'DESC']]
  });

  for (const playlist of playlists) {
    console.log(`\n📀 ${playlist.name} [ID: ${playlist.id}]`);
    console.log(`${'─'.repeat(60)}`);

    // Получаем треки с деталями
    const tracks = await sequelize.query(`
      SELECT 
        t.id,
        t.artist,
        t.title,
        t.duration,
        t."fileFormat",
        t.bitrate,
        t."playCount",
        t."coverUrl",
        t."sourceType",
        t."createdAt",
        pt.position
      FROM "Tracks" t
      INNER JOIN "PlaylistTracks" pt ON pt."trackId" = t.id
      WHERE pt."playlistId" = :playlistId
      ORDER BY pt.position ASC
      LIMIT 20
    `, {
      replacements: { playlistId: playlist.id },
      type: sequelize.QueryTypes.SELECT
    });

    if (tracks.length === 0) {
      console.log('❌ Нет треков\n');
      continue;
    }

    // Статистика
    const stats = {
      total: tracks.length,
      withCovers: tracks.filter(t => t.coverUrl).length,
      kissvk: tracks.filter(t => t.sourceType === 'kissvk').length,
      manual: tracks.filter(t => !t.sourceType || t.sourceType === 'upload').length,
      avgBitrate: Math.round(tracks.filter(t => t.bitrate).reduce((sum, t) => sum + parseInt(t.bitrate), 0) / tracks.filter(t => t.bitrate).length),
      totalPlays: tracks.reduce((sum, t) => sum + (parseInt(t.playCount) || 0), 0)
    };

    console.log(`\n📊 СТАТИСТИКА:`);
    console.log(`  Всего треков: ${stats.total}`);
    console.log(`  С обложками: ${stats.withCovers} (${Math.round(stats.withCovers/stats.total*100)}%)`);
    console.log(`  KissVK: ${stats.kissvk} | Manual: ${stats.manual}`);
    console.log(`  Средний битрейт: ${stats.avgBitrate || 'N/A'} kbps`);
    console.log(`  Всего прослушиваний: ${stats.totalPlays}`);

    console.log(`\n🎵 ПЕРВЫЕ 10 ТРЕКОВ:`);
    tracks.slice(0, 10).forEach((track, i) => {
      const cover = track.coverUrl ? '🖼️' : '❌';
      const source = track.sourceType === 'kissvk' ? '🎧' : '📁';
      const plays = track.playCount || 0;
      const bitrate = track.bitrate ? `${track.bitrate}k` : 'N/A';
      const duration = track.duration ? `${Math.floor(track.duration/60)}:${String(track.duration%60).padStart(2,'0')}` : 'N/A';
      
      console.log(`\n  ${i+1}. ${track.artist} - ${track.title.substring(0, 40)}`);
      console.log(`     ${cover} ${source} | ${duration} | ${bitrate} | 👥 ${plays} plays`);
      
      // Проверка на старые треки
      const trackDate = new Date(track.createdAt);
      const daysSinceAdded = Math.floor((Date.now() - trackDate) / (1000*60*60*24));
      if (daysSinceAdded > 60) {
        console.log(`     ⚠️ СТАРЫЙ ТРЕК: добавлен ${daysSinceAdded} дней назад (${trackDate.toLocaleDateString('ru-RU')})`);
      }
    });

    // Проверка на дубликаты
    const artistCounts = {};
    tracks.forEach(t => {
      artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
    });
    
    const duplicates = Object.entries(artistCounts).filter(([artist, count]) => count > 3);
    if (duplicates.length > 0) {
      console.log(`\n  ⚠️ ЧАСТЫЕ ИСПОЛНИТЕЛИ:`);
      duplicates.forEach(([artist, count]) => {
        console.log(`     ${artist}: ${count} треков`);
      });
    }

    console.log('\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Общая статистика
  const totalStats = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT t.id) as total_tracks,
      COUNT(DISTINCT CASE WHEN t."coverUrl" IS NOT NULL THEN t.id END) as with_covers,
      COUNT(DISTINCT CASE WHEN t."sourceType" = 'kissvk' THEN t.id END) as kissvk_tracks,
      AVG(CAST(t.bitrate AS INTEGER)) as avg_bitrate,
      SUM(t."playCount") as total_plays
    FROM "Tracks" t
    INNER JOIN "PlaylistTracks" pt ON pt."trackId" = t.id
    WHERE pt."playlistId" IN (423, 424, 425, 426, 427)
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('🌍 ОБЩАЯ СТАТИСТИКА ПО ВСЕМ EDITORIAL ПЛЕЙЛИСТАМ:');
  console.log(`  Уникальных треков: ${totalStats[0].total_tracks}`);
  console.log(`  С обложками: ${totalStats[0].with_covers} (${Math.round(totalStats[0].with_covers/totalStats[0].total_tracks*100)}%)`);
  console.log(`  KissVK треков: ${totalStats[0].kissvk_tracks}`);
  console.log(`  Средний битрейт: ${Math.round(totalStats[0].avg_bitrate) || 'N/A'} kbps`);
  console.log(`  Всего прослушиваний: ${totalStats[0].total_plays || 0}`);
  console.log('');
}

analyzeEditorialPlaylists()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
