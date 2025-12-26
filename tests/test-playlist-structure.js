// Test to see full structure of playlist response
const http = require('http');

function testPlaylistStructure(id) {
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
          if (parsed.playlist) {
            console.log('Response keys:', Object.keys(parsed.playlist).sort());
            console.log('Tracks count:', parsed.playlist.tracks?.length);
            console.log('First track keys:', parsed.playlist.tracks?.[0] ? Object.keys(parsed.playlist.tracks[0]).sort() : 'NO TRACKS');
            if (parsed.playlist.tracks?.[0]) {
              console.log('First track streamUrl:', parsed.playlist.tracks[0].streamUrl ? 'YES' : 'NO');
              console.log('First track title:', parsed.playlist.tracks[0].title);
            }
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
  await testPlaylistStructure(171);
  process.exit(0);
})();
