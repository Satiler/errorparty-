const { sequelize, testConnection } = require('../config/database');
const models = require('../models');

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection
    await testConnection();
    
    // Sync all models
    await sequelize.sync({ alter: true });
    
    console.log('✅ Database initialized successfully!');
    console.log('📋 Created/Updated tables:');
    console.log('  - users');
    console.log('  - memes');
    console.log('  - quotes');
    console.log('  - user_stats');
    console.log('  - server_activity');
    console.log('  - link_tokens');
    console.log('  - meme_ratings');
    console.log('  - meme_comments');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase().then(() => {
    console.log('🎉 Migration completed!');
    process.exit(0);
  });
}

module.exports = { initDatabase };
