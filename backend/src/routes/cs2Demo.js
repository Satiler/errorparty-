const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { CS2Demo, CS2Match } = require('../models');
const cs2DemoParserService = require('../services/cs2DemoParserService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for demo file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.CS2_DEMO_PATH || path.join(__dirname, '../../demos');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept .dem, .dem.bz2, .dem.gz files
    const allowedExts = ['.dem', '.bz2', '.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    const isValid = allowedExts.some(allowed => file.originalname.toLowerCase().endsWith(allowed));
    
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .dem, .dem.bz2, and .dem.gz files are allowed.'));
    }
  }
});

/**
 * POST /api/cs2-demo/upload
 * Upload a CS2 demo file manually
 * 
 * @auth Required
 * @body {file} demo - Demo file (.dem, .dem.bz2, .dem.gz)
 * @body {string} shareCode - Optional share code
 * @returns {object} Demo record and match info
 */
router.post('/upload', authenticateToken, upload.single('demo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const userId = req.user.id;
    const shareCode = req.body.shareCode;
    const filePath = req.file.path;
    const fileSize = req.file.size;

    console.log(`📤 Demo uploaded by user ${userId}: ${req.file.filename} (${Math.round(fileSize / 1024 / 1024)}MB)`);

    // Create match record
    const match = await CS2Match.create({
      userId,
      shareCode: shareCode || null,
      source: 'manual_upload',
      map: 'unknown',
      result: 'pending',
      score: '0:0',
      kills: 0,
      deaths: 0,
      assists: 0
    });

    // Create demo record
    const demo = await CS2Demo.create({
      matchId: match.id,
      shareCode: shareCode || null,
      status: 'downloaded',
      filePath: filePath,
      fileSize: fileSize,
      downloadedAt: new Date()
    });

    console.log(`✅ Match ${match.id} and Demo ${demo.id} created`);

    // Queue parsing in background
    setImmediate(async () => {
      try {
        console.log(`🔄 Parsing demo ${demo.id}...`);
        await cs2DemoParserService.parseDemo(demo.id);
        console.log(`✅ Demo ${demo.id} parsed successfully`);
      } catch (error) {
        console.error(`❌ Failed to parse demo ${demo.id}:`, error);
        demo.status = 'failed';
        demo.parseError = error.message;
        await demo.save();
      }
    });

    res.json({
      success: true,
      message: 'Demo uploaded successfully and queued for parsing',
      data: {
        matchId: match.id,
        demoId: demo.id,
        filename: req.file.filename,
        fileSize: fileSize,
        status: 'parsing'
      }
    });

  } catch (error) {
    console.error('Error uploading demo:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cs2-demo/status/:demoId
 * Get demo parsing status
 * 
 * @param {number} demoId - Demo ID
 * @returns {object} Demo status and match info
 */
router.get('/status/:demoId', authenticateToken, async (req, res) => {
  try {
    const demo = await CS2Demo.findByPk(req.params.demoId, {
      include: [{
        model: CS2Match,
        as: 'match',
        attributes: ['id', 'map', 'result', 'score', 'kills', 'deaths', 'assists', 'createdAt']
      }]
    });

    if (!demo) {
      return res.status(404).json({
        success: false,
        error: 'Demo not found'
      });
    }

    // Check ownership
    if (demo.match && demo.match.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      demo: {
        id: demo.id,
        status: demo.status,
        parsedAt: demo.parsedAt,
        parseError: demo.parseError,
        match: demo.match
      }
    });

  } catch (error) {
    console.error('Error getting demo status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cs2-demo/list
 * Get user's uploaded demos
 * 
 * @auth Required
 * @query {number} limit - Max number of results (default 20)
 * @query {number} offset - Offset for pagination (default 0)
 * @returns {array} List of demos
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const demos = await CS2Demo.findAndCountAll({
      include: [{
        model: CS2Match,
        as: 'match',
        where: { userId: req.user.id },
        attributes: ['id', 'map', 'result', 'score', 'kills', 'deaths', 'assists', 'createdAt']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      demos: demos.rows,
      total: demos.count,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error listing demos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
