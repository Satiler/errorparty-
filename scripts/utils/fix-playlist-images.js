const { Playlist, PlaylistTrack, Track, Album, sequelize } = require('./src/models');

async function fixPlaylistImages() {
  console.log('🔧 Fixing playlist images...\n');
  
  try {
    // Получаем все публичные плейлисты без изображений
    const playlists = await Playlist.findAll({
      where: { 
        isPublic: true,
        type: ['editorial', 'chart', 'new']
      },
      order: [['updatedAt', 'DESC']]
    });

    console.log(`📊 Found ${playlists.length} playlists\n`);

    for (const playlist of playlists) {
      console.log(`\n📝 Processing: ${playlist.name} (ID: ${playlist.id})`);
      console.log(`   Current image: ${playlist.image}`);
      console.log(`   Current coverPath: ${playlist.coverPath}`);
      
      // Если уже есть image или coverPath, пропускаем
      if (playlist.image || playlist.coverPath) {
        console.log('   ✅ Already has image, skipping');
        continue;
      }

      // Получаем первый трек плейлиста с обложкой
      const firstTrackQuery = `
        SELECT t."coverUrl" as "trackCoverUrl", a."coverUrl" as "albumCoverUrl"
        FROM "PlaylistTracks" pt
        LEFT JOIN "Tracks" t ON t.id = pt."trackId"
        LEFT JOIN "Albums" a ON a.id = t."albumId"
        WHERE pt."playlistId" = :playlistId
          AND (t."coverUrl" IS NOT NULL OR a."coverUrl" IS NOT NULL)
        ORDER BY pt."position" ASC
        LIMIT 1
      `;
      
      const [firstTrackResult] = await sequelize.query(firstTrackQuery, {
        replacements: { playlistId: playlist.id },
        type: sequelize.QueryTypes.SELECT
      });

      if (firstTrackResult) {
        const coverUrl = firstTrackResult.trackCoverUrl || firstTrackResult.albumCoverUrl;
        if (coverUrl) {
          console.log(`   🖼️  Found cover: ${coverUrl.substring(0, 60)}...`);
          
          // Обновляем image в базе
          await sequelize.query(
            'UPDATE "Playlists" SET image = :coverUrl WHERE id = :playlistId',
            {
              replacements: { coverUrl, playlistId: playlist.id }
            }
          );
          
          console.log('   ✅ Updated image field');
        } else {
          console.log('   ⚠️  No cover URL found');
        }
      } else {
        console.log('   ⚠️  No tracks with covers found');
      }
    }

    console.log('\n✅ Done!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixPlaylistImages();
