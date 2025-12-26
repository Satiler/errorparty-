/**
 * Установка обложек из самых популярных треков с обложками
 */

const { Playlist, Track, PlaylistTrack, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function setCoversFromTopTracks() {
  console.log('🎨 Установка обложек из топ треков плейлистов\n');

  const playlists = await Playlist.findAll({
    where: {
      type: 'editorial',
      id: { [Op.in]: [423, 424, 425, 426, 427] }
    },
    order: [['id', 'DESC']]
  });

  console.log(`Найдено ${playlists.length} плейлистов\n`);

  for (const playlist of playlists) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📀 [${playlist.id}] ${playlist.name}`);

    // Получаем топ трек с обложкой из плейлиста
    const result = await sequelize.query(`
      SELECT t."coverUrl"
      FROM "Tracks" t
      INNER JOIN "PlaylistTracks" pt ON pt."trackId" = t.id
      WHERE pt."playlistId" = :playlistId 
        AND t."coverUrl" IS NOT NULL 
        AND t."coverUrl" != ''
      ORDER BY t."playCount" DESC NULLS LAST, t."createdAt" DESC
      LIMIT 1
    `, {
      replacements: { playlistId: playlist.id },
      type: sequelize.QueryTypes.SELECT
    });

    if (result.length > 0 && result[0].coverUrl) {
      const coverUrl = result[0].coverUrl;
      
      await playlist.update({
        coverUrl: coverUrl,
        image: coverUrl
      });

      console.log(`✅ Установлена обложка: ${coverUrl.substring(0, 70)}...`);
    } else {
      console.log('❌ Не найден трек с обложкой');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Готово!');
}

setCoversFromTopTracks()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
