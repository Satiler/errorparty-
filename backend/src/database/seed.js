const { User, UserStats } = require('../models');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Create sample users
    const users = await User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@errorparty.ru',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
        totalOnlineTime: 86400,
        lastSeen: new Date()
      },
      {
        username: 'Player1',
        steamId: 'STEAM_0:1:12345678',
        totalOnlineTime: 43200,
        lastSeen: new Date()
      },
      {
        username: 'Gamer2',
        steamId: 'STEAM_0:0:87654321',
        totalOnlineTime: 36000,
        lastSeen: new Date()
      },
      {
        username: 'MemeKing',
        totalOnlineTime: 72000,
        lastSeen: new Date()
      }
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create stats for users
    for (const user of users) {
      await UserStats.create({
        userId: user.id,
        totalConnections: Math.floor(Math.random() * 100) + 10,
        totalMessages: Math.floor(Math.random() * 1000) + 50,
        favoriteChannel: ['Main Hall', 'Gaming', 'Chill Zone'][Math.floor(Math.random() * 3)],
        longestSession: Math.floor(Math.random() * 10000) + 3600,
        level: Math.floor(Math.random() * 10) + 1,
        experience: Math.floor(Math.random() * 5000)
      });
    }

    console.log('✅ Created user stats');

    console.log('🎉 Database seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = { seedDatabase };
