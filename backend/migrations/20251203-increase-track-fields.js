/**
 * Migration: Increase Track artist and title field length
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Tracks', 'artist', {
      type: Sequelize.STRING(1000),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Tracks', 'title', {
      type: Sequelize.STRING(1000),
      allowNull: false
    });
    
    console.log('✅ Increased artist and title length to 1000 characters');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Tracks', 'artist', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Tracks', 'title', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
  }
};
