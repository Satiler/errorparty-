const { Quote, User } = require('../models');

// Get all quotes
const getAllQuotes = async (req, res) => {
  try {
    const quotes = await Quote.findAll({
      where: { isApproved: true },
      include: [{
        model: User,
        as: 'submitter',
        attributes: ['id', 'username']
      }],
      order: [['votes', 'DESC']],
      limit: 50
    });

    res.json({ success: true, count: quotes.length, quotes });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quotes' });
  }
};

// Get random quote
const getRandomQuote = async (req, res) => {
  try {
    const count = await Quote.count({ where: { isApproved: true } });
    const randomIndex = Math.floor(Math.random() * count);

    const quote = await Quote.findOne({
      where: { isApproved: true },
      include: [{
        model: User,
        as: 'submitter',
        attributes: ['id', 'username']
      }],
      offset: randomIndex
    });

    if (!quote) {
      return res.status(404).json({ success: false, error: 'No quotes found' });
    }

    res.json({ success: true, quote });
  } catch (error) {
    console.error('Error fetching random quote:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch random quote' });
  }
};

// Get top quotes
const getTopQuotes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const quotes = await Quote.findAll({
      where: { isApproved: true },
      include: [{
        model: User,
        as: 'submitter',
        attributes: ['id', 'username']
      }],
      order: [['votes', 'DESC']],
      limit
    });

    res.json({ success: true, quotes });
  } catch (error) {
    console.error('Error fetching top quotes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top quotes' });
  }
};

module.exports = {
  getAllQuotes,
  getRandomQuote,
  getTopQuotes
};
