/**
 * Простой тестовый запуск системы автообновления
 * Для проверки работоспособности без полных настроек
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.AUTO_UPDATE_PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Music Auto-Update System',
    version: '1.0.0'
  });
});

// Status endpoint
app.get('/api/auto-update/status', (req, res) => {
  res.json({
    status: 'running',
    scheduler: {
      enabled: process.env.SCHEDULER_ENABLED === 'true',
      tasks: []
    },
    services: {
      spotify: { configured: !!process.env.SPOTIFY_CLIENT_ID },
      appleMusic: { configured: !!process.env.APPLE_TEAM_ID },
      shazam: { configured: !!process.env.SHAZAM_API_KEY },
      billboard: { configured: true }
    },
    database: {
      connected: !!process.env.DATABASE_URL
    },
    redis: {
      connected: !!process.env.REDIS_HOST
    }
  });
});

// Test endpoint
app.get('/api/auto-update/test', (req, res) => {
  res.json({
    message: 'Система автообновления работает!',
    kubernetes: {
      ready: true,
      deployment: 'music-auto-update',
      namespace: 'music-auto-update'
    },
    features: [
      'Интеграция с Spotify Charts',
      'Интеграция с Apple Music',
      'Интеграция с Billboard Charts',
      'Интеграция с Shazam',
      'Автоматический импорт из KissVK',
      'Персонализированные рекомендации',
      'Автоматическое обновление плейлистов',
      'Модерация изменений'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Music Auto-Update System запущена!`);
  console.log(`📡 Сервер слушает на порту: ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/auto-update/status`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/auto-update/test\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏸️  SIGTERM получен, закрываю сервер...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏸️  SIGINT получен, закрываю сервер...');
  process.exit(0);
});
