// Test if playlist loading works
const http = require('http');

function testPlaylist(id) {
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
          resolve({
            status: res.statusCode,
            success: parsed.success,
            error: parsed.error,
            tracksCount: parsed.playlist ? parsed.playlist.tracks?.length : 0,
            image: parsed.playlist?.image ? 'YES' : 'NO'
          });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message });
        }
      });
    });

    req.on('error', (e) => { resolve({ error: e.message }); });
    req.end();
  });
}

(async () => {
  console.log('Testing playlist endpoints...\n');
  
  for (let id of [171, 173, 174]) {
    const result = await testPlaylist(id);
    console.log(`Playlist ${id}:`, result);
  }
  
  process.exit(0);
})();
