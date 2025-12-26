const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');

// GET /api/quotes - Get all quotes
router.get('/', quoteController.getAllQuotes);

// GET /api/quotes/random - Get random quote
router.get('/random', quoteController.getRandomQuote);

// GET /api/quotes/top - Get top quotes
router.get('/top', quoteController.getTopQuotes);

module.exports = router;
