/**
 * Script to import Zaycev.net albums
 */
const zaycevService = require('./src/modules/music/zaycev-import.service');

async function importAlbums() {
  try {
    console.log('🎵 Starting Zaycev.net albums import...\n');
    
    const result = await zaycevService.importPopularAlbums(10);
    
    console.log('\n📊 Import Results:');
    console.log(`✅ Albums imported: ${result.imported?.albums || 0}`);
    console.log(`✅ Tracks imported: ${result.imported?.tracks || 0}`);
    console.log(`⏭️  Albums skipped: ${result.skipped || 0}`);
    console.log(`📦 Total albums processed: ${result.total || 0}`);
    
    if (result.success) {
      console.log('\n✨ Import completed successfully!');
    } else {
      console.error('\n❌ Import failed:', result.error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  }
}

importAlbums();
