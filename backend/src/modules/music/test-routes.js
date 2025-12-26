/**
 * Test Routes - для отладки
 */
const express = require('express');
const router = express.Router();

console.log('1. Express loaded');

const musicController = require('./music.controller');
console.log('2. musicController loaded');

const albumsController = require('./albums.controller');
console.log('3. albumsController loaded');

const playlistsController = require('./playlists.controller');
console.log('4. playlistsController loaded');

const { authenticateToken } = require('../../middleware/auth');
console.log('5. authenticateToken loaded, type:', typeof authenticateToken);

const { uploadTrack, uploadCover } = require('./music.middleware');
console.log('6. music.middleware loaded, types:', typeof uploadTrack, typeof uploadCover);

const { uploadAlbum } = require('../../shared/middleware/music-upload');
console.log('7. uploadAlbum loaded, type:', typeof uploadAlbum);

// Test route
router.get('/test', (req, res) => res.json({ ok: true }));
console.log('8. Test route registered');

module.exports = router;
console.log('9. Router exported');
