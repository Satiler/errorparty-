const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/music/playlists?page=1&limit=5',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (parsed.playlists && parsed.playlists.length > 0) {
      const p = parsed.playlists[0];
      console.log('Playlist:', p.name);
      console.log('Image:', p.image ? 'YES ✓' : 'NO ✗');
      console.log('Image URL:', p.image);
    }
  });
});

req.on('error', (e) => { console.error('Error:', e.message); });
req.end();
