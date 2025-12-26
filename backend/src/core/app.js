/**
 * Core Express Application Configuration
 * Настройка middleware и базовой конфигурации Express
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('../config/passport');
const { apiLimiter } = require('../middleware/rateLimiter');
const { lightLimiter } = require('../middleware/lightLimiter');
require('dotenv').config();

/**
 * Create and configure Express application
 */
function createApp() {
  const app = express();

  // Trust proxy for rate limiter (nginx reverse proxy)
  app.set('trust proxy', 1);

  // Security & Performance Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Apply lightweight rate limiter to read-only endpoints
  app.use('/api/home', lightLimiter);
  app.use('/api/server/status', lightLimiter);
  app.use('/api/quests', lightLimiter);
  app.use('/api/notifications', lightLimiter);
  app.use('/api/cs2-stats', lightLimiter);

  // Apply rate limiting to all API routes
  app.use('/api', apiLimiter);

  // Validate required secrets
  validateSecrets();

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Static files
  app.use('/uploads', express.static('uploads'));

  // KissVK API Routes (Optimized - HTTP-only, no Puppeteer)
  const kissVKRoutes = require('../modules/music/kissvk.routes');
  app.use('/api/kissvk', kissVKRoutes);

  // Initialize KissVK Auto Import Scheduler
  const { getInstance: getKissVKScheduler } = require('../schedulers/kissvk-auto-import.scheduler');
  const kissvkScheduler = getKissVKScheduler();
  kissvkScheduler.start();

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'errorparty-backend',
      version: '2.0.0',
      architecture: 'modular'
    });
  });

  return app;
}

/**
 * Validate required environment variables
 */
function validateSecrets() {
  const required = ['SESSION_SECRET', 'JWT_SECRET'];
  
  for (const secret of required) {
    if (!process.env[secret]) {
      throw new Error(`❌ CRITICAL: ${secret} environment variable must be set!`);
    }
  }
}

module.exports = { createApp };
