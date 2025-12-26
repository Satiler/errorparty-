const { Track } = require('./src/models');

async function updateTracks() {
  try {
    const result = await Track.update(
      { sourceType: 'external' },
      { where: { externalSource: 'lmusic.kz' } }
    );
    
    console.log(`✅ Updated ${result[0]} tracks from lmusic.kz with sourceType='external'`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateTracks();
