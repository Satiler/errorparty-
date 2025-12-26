const { Playlist, PlaylistTrack } = require('./src/models');

(async () => {
  try {
    console.log('🔍 Checking playlists in database...\n');
    
    const playlists = await Playlist.findAll({
      attributes: ['id', 'name', 'type', 'userId', 'createdAt'],
      order: [['id', 'DESC']],
      limit: 10
    });

    console.log(`📋 Found ${playlists.length} playlists:\n`);
    
    for (const p of playlists) {
      const trackCount = await PlaylistTrack.count({
        where: { playlistId: p.id }
      });
      
      console.log(`ID: ${p.id}`);
      console.log(`  Name: ${p.name}`);
      console.log(`  Type: "${p.type}"`);
      console.log(`  UserID: ${p.userId}`);
      console.log(`  Tracks: ${trackCount}`);
      console.log(`  Created: ${p.createdAt}`);
      console.log('');
    }
    
    // Check specifically for editorial playlists
    const editorialCount = await Playlist.count({
      where: { type: 'editorial' }
    });
    console.log(`✅ Total editorial playlists: ${editorialCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
