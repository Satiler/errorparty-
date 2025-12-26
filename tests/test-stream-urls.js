// Test to see the actual streamUrl value
const http = require('http');

function testPlaylistStreamUrls(id) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/music/playlists/${id}`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.playlist && parsed.playlist.tracks) {
            console.log(`Playlist ${id} - First 3 tracks:`);
            parsed.playlist.tracks.slice(0, 3).forEach((track, i) => {
              console.log(`\n  Track ${i + 1}: ${track.title}`);
              console.log(`    streamUrl: ${track.streamUrl || 'NULL'}`);
              console.log(`    fileUrl: ${track.fileUrl || 'NULL'}`);
              console.log(`    sourceUrl: ${track.sourceUrl || 'NULL'}`);
              console.log(`    provider: ${track.provider || 'NULL'}`);
            });
          }
        } catch (e) {
          console.log('Error:', e.message);
        }
      });
    });

    req.on('error', (e) => { console.error('Error:', e.message); });
    req.end();
  });
}

(async () => {
  await testPlaylistStreamUrls(171);
  process.exit(0);
})();
