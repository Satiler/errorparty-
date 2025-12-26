/**
 * Admin Routes
 * Административные эндпоинты (только для разработки)
 */
const express = require('express');
const router = express.Router();
const { getSteamBot } = require('../../services/steamBotService');
const { Track } = require('../../models');
const { authenticateToken, requireAdmin } = require('../../shared/middleware/auth');

// IP whitelist middleware
const ALLOWED_IPS = (process.env.ADMIN_IPS || '127.0.0.1,::1').split(',').map(ip => ip.trim());

const ipWhitelist = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!ALLOWED_IPS.includes(clientIP) && !ALLOWED_IPS.includes('0.0.0.0')) {
    console.warn(`⚠️ Unauthorized admin attempt from IP: ${clientIP}`);
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  
  next();
};

/**
 * @route   POST /api/bot/steam-guard-submit
 * @desc    Submit Steam Guard code (development only)
 * @access  IP whitelist
 */
router.post('/steam-guard-submit', ipWhitelist, (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Code required' });
    }
    
    const bot = getSteamBot();
    const success = bot.submitSteamGuardCode(code.trim().toUpperCase());
    
    if (success) {
      res.json({ success: true, message: 'Code submitted successfully' });
    } else {
      res.json({ success: false, error: 'No pending Steam Guard request' });
    }
  } catch (error) {
    console.error('Error submitting Steam Guard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/bot/sync-user-temp
 * @desc    Manually trigger user sync (development only)
 * @access  IP whitelist
 */
router.post('/sync-user-temp', ipWhitelist, (req, res) => {
  try {
    const { steamId } = req.body;
    
    if (!steamId) {
      return res.status(400).json({ success: false, error: 'steamId required' });
    }
    
    const bot = getSteamBot();
    
    if (!bot.isConnected || !bot.isGCReady) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bot not connected or GC not ready' 
      });
    }
    
    bot.syncUserMatches(steamId).then(() => {
      // Success handled async
    }).catch(err => {
      console.error('Sync error:', err);
    });
    
    res.json({ 
      success: true, 
      message: `Sync triggered for ${steamId}` 
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/admin/music/tracks
 * @desc    Get all tracks (including private) for admin
 * @access  Admin only
 */
router.get('/music/tracks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 1000, offset = 0 } = req.query;

    const tracks = await Track.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'album',
          attributes: ['id', 'title', 'coverUrl']
        },
        {
          association: 'playlist',
          attributes: ['id', 'title', 'coverUrl']
        }
      ]
    });

    res.json({ 
      success: true, 
      tracks,
      total: tracks.length
    });
  } catch (error) {
    console.error('Error fetching tracks for admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PUT /api/admin/music/tracks/:id
 * @desc    Update track metadata
 * @access  Admin only
 */
router.put('/music/tracks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, album, genre, year, isPublic, allowDownload, coverUrl } = req.body;

    const track = await Track.findByPk(id);
    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    // Update fields
    if (title !== undefined) track.title = title;
    if (artist !== undefined) track.artist = artist;
    if (album !== undefined) track.album = album;
    if (genre !== undefined) track.genre = genre;
    if (year !== undefined) track.year = year;
    if (isPublic !== undefined) track.isPublic = isPublic;
    if (allowDownload !== undefined) track.allowDownload = allowDownload;
    if (coverUrl !== undefined) track.coverUrl = coverUrl;

    await track.save();

    res.json({ 
      success: true, 
      message: 'Track updated successfully',
      track 
    });
  } catch (error) {
    console.error('Error updating track:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   DELETE /api/admin/music/tracks/:id
 * @desc    Delete track
 * @access  Admin only
 */
router.delete('/music/tracks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const track = await Track.findByPk(id);
    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    await track.destroy();

    res.json({ 
      success: true, 
      message: 'Track deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting track:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
