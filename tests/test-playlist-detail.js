// Test if playlist has album data
const http = require('http');

function testPlaylistDetail(id) {
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
          if (parsed.playlist && parsed.playlist.tracks && parsed.playlist.tracks.length > 0) {
            const firstTrack = parsed.playlist.tracks[0];
            resolve({
              playlistId: id,
              trackTitle: firstTrack.title,
              hasAlbum: !!firstTrack.album,
              albumCoverUrl: firstTrack.album?.coverUrl || 'NO'
            });
          } else {
            resolve({ playlistId: id, error: 'No tracks' });
          }
        } catch (e) {
          resolve({ playlistId: id, error: e.message });
        }
      });
    });

    req.on('error', (e) => { resolve({ playlistId: id, error: e.message }); });
    req.end();
  });
}

(async () => {
  console.log('Checking album data in playlist tracks...\n');
  
  const result = await testPlaylistDetail(171);
  console.log(JSON.stringify(result, null, 2));
  
  process.exit(0);
})();
