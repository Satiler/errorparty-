/**
 * Core Socket.IO Configuration
 * Централизованная настройка WebSocket
 */
const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO
 */
function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket() first.');
  }
  return io;
}

module.exports = {
  initializeSocket,
  getIO
};
