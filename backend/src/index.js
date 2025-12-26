/**
 * ErrorParty Backend - Entry Point
 * Modular Architecture v2.0
 */
require('dotenv').config();
const { startServer } = require('./core/server');

// Start the application
startServer().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
