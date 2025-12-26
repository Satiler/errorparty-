const { sequelize } = require('../config/database');

async function addModerationFields() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('Adding moderation fields to database...');

    // Add status column to memes table
    await queryInterface.addColumn('memes', 'status', {
      type: sequelize.Sequelize.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved',
      allowNull: false
    });

    // Add banned column to users table
    await queryInterface.addColumn('users', 'banned', {
      type: sequelize.Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    console.log('✓ Moderation fields added successfully');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠ Moderation fields already exist, skipping...');
    } else {
      console.error('Error adding moderation fields:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  addModerationFields()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addModerationFields;
