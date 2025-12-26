const express = require('express');
const router = express.Router();
const memeController = require('../controllers/memeController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

// GET /api/memes - Get all memes
router.get('/', memeController.getAllMemes);

// GET /api/memes/top - Get top memes
router.get('/top', memeController.getTopMemes);

// POST /api/memes/generate - Generate a meme automatically
router.post('/generate', optionalAuth, memeController.generateMeme);

// POST /api/memes/upload - Upload meme image
router.post('/upload', authenticateToken, uploadLimiter, upload.single('image'), memeController.uploadMemeImage);

// POST /api/memes - Create a new meme
router.post('/', authenticateToken, uploadLimiter, memeController.createMeme);

// GET /api/memes/:id - Get meme by ID
router.get('/:id', optionalAuth, memeController.getMemeById);

// POST /api/memes/:id/rate - Rate a meme (like/dislike)
router.post('/:id/rate', authenticateToken, memeController.rateMeme);

// GET /api/memes/:id/rating - Get user's rating for a meme
router.get('/:id/rating', optionalAuth, memeController.getUserRating);

// GET /api/memes/:id/comments - Get comments for a meme
router.get('/:id/comments', memeController.getMemeComments);

// POST /api/memes/:id/comments - Add comment to a meme
router.post('/:id/comments', authenticateToken, memeController.addMemeComment);

// DELETE /api/memes/:id/comments/:commentId - Delete a comment
router.delete('/:id/comments/:commentId', authenticateToken, memeController.deleteMemeComment);

module.exports = router;
