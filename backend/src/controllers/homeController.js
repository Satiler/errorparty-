const express = require('express');
const router = express.Router();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

/**
 * ✅ Optimized endpoint - combines 3 requests into 1
 * GET /api/home/data
 * Returns: { stats, events, memes }
 */
const getHomePageData = async (req, res) => {
  try {
    // Parallel requests for all data
    const [statsRes, eventsRes, memesRes] = await Promise.all([
      // Server stats
      new Promise(async (resolve) => {
        try {
          const { getServerStats } = require('../controllers/serverController');
          const mockReq = {};
          const mockRes = {
            json: (data) => resolve(data)
          };
          await getServerStats(mockReq, mockRes);
        } catch (err) {
          resolve({ success: false });
        }
      }),
      
      // Recent events
      new Promise(async (resolve) => {
        try {
          const { getRecentEvents } = require('../controllers/eventController');
          const mockReq = { query: { limit: 8 } };
          const mockRes = {
            json: (data) => resolve(data)
          };
          await getRecentEvents(mockReq, mockRes);
        } catch (err) {
          resolve({ success: false, events: [] });
        }
      }),
      
      // Top memes
      new Promise(async (resolve) => {
        try {
          const Meme = require('../models/Meme');
          const memes = await Meme.findAll({
            limit: 6,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'title', 'imageUrl', 'views', 'createdAt']
          });
          resolve({ success: true, memes });
        } catch (err) {
          resolve({ success: false, memes: [] });
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: statsRes.success ? statsRes.stats : null,
        events: eventsRes.success ? eventsRes.events : [],
        memes: memesRes.success ? memesRes.memes : []
      }
    });
  } catch (error) {
    console.error('Error fetching home page data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load home page data'
    });
  }
};

module.exports = {
  getHomePageData
};
