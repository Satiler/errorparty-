/**
 * Simplified Music Routes for debugging
 */
const express = require('express');
const router = express.Router();
const musicController = require('./music.controller');
const albumsController = require('./albums.controller');
const playlistsController = require('./playlists.controller');
const { authenticateToken } = require('../../middleware/auth');

// Basic routes
router.get('/tracks', musicController.getTracks);
router.get('/tracks/:id', musicController.getTrack);
router.get('/albums', albumsController.getAlbums);
router.get('/albums/:id', albumsController.getAlbum);
router.get('/playlists/editorial', playlistsController.getEditorialPlaylists);
router.get('/recommendations', authenticateToken, musicController.getRecommendations);

module.exports = router;
