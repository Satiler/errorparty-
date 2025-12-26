const { Album, Track, sequelize } = require('./src/models');

async function fixAlbumCovers() {
  console.log('🖼️ Fixing album covers using first track...\n');
  
  try {
    // Получаем все альбомы без обложек
    const albums = await Album.findAll({
      where: {
        coverUrl: null
      }
    });

    console.log(`📊 Found ${albums.length} albums without covers\n`);

    let updated = 0;
    let skipped = 0;

    for (const album of albums) {
      console.log(`\n📝 Processing: ${album.artist} - ${album.title} (ID: ${album.id})`);
      
      // Получаем первый трек альбома с обложкой
      const firstTrackQuery = `
        SELECT "coverUrl"
        FROM "Tracks"
        WHERE "albumId" = :albumId
          AND "coverUrl" IS NOT NULL
        ORDER BY "trackNumber" ASC NULLS LAST, id ASC
        LIMIT 1
      `;
      
      const [firstTrackResult] = await sequelize.query(firstTrackQuery, {
        replacements: { albumId: album.id },
        type: sequelize.QueryTypes.SELECT
      });

      if (firstTrackResult && firstTrackResult.coverUrl) {
        const coverUrl = firstTrackResult.coverUrl;
        console.log(`   🖼️  Found cover: ${coverUrl.substring(0, 60)}...`);
        
        // Обновляем coverUrl альбома
        await Album.update(
          { coverUrl: coverUrl },
          { where: { id: album.id } }
        );
        
        console.log('   ✅ Updated album cover');
        updated++;
      } else {
        console.log('   ⚠️  No tracks with covers found');
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ ALBUM COVER UPDATE COMPLETE!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('='.repeat(50));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAlbumCovers();
