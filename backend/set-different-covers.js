const { Playlist, Track, PlaylistTrack, sequelize } = require('./src/models');

const playlistConfigs = [
  { id: 427, name: '🔥 Открытия Недели', offset: 3 },
  { id: 426, name: '😌 Релакс', offset: 0 },
  { id: 425, name: '💋 KissVK Хиты', offset: 7 },
  { id: 424, name: '🆕 Новинки Месяца', offset: 12 },
  { id: 423, name: '🔥 Топ 100 Хитов', offset: 18 }
];

(async () => {
  console.log('🎨 Установка уникальных обложек\n');
  
  for (const config of playlistConfigs) {
    const result = await sequelize.query(`
      SELECT t."coverUrl"
      FROM "Tracks" t
      INNER JOIN "PlaylistTracks" pt ON pt."trackId" = t.id
      WHERE pt."playlistId" = :playlistId 
        AND t."coverUrl" IS NOT NULL
      ORDER BY t."playCount" DESC
      OFFSET :offset
      LIMIT 1
    `, {
      replacements: { playlistId: config.id, offset: config.offset },
      type: sequelize.QueryTypes.SELECT
    });

    if (result[0] && result[0].coverUrl) {
      await Playlist.update(
        { coverUrl: result[0].coverUrl, image: result[0].coverUrl },
        { where: { id: config.id } }
      );
      
      console.log(`✅ ${config.name}`);
      console.log(`   ${result[0].coverUrl.substring(0, 80)}...\n`);
    }
  }
  
  console.log('✅ Готово!');
  process.exit(0);
})();
