/**
 * Add image column to Playlists table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Playlists', 'image', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    });
    console.log('✅ Added image column to Playlists table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Playlists', 'image');
    console.log('✅ Removed image column from Playlists table');
  }
};
