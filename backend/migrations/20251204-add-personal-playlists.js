/**
 * Migration: Add isPersonal and isSystem columns to Playlists
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем колонки
    await queryInterface.addColumn('Playlists', 'isPersonal', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Личный плейлист (Моя волна, Премьера и т.д.)'
    });

    await queryInterface.addColumn('Playlists', 'isSystem', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Системный плейлист'
    });

    // Добавляем индексы
    await queryInterface.addIndex('Playlists', ['isPersonal']);
    await queryInterface.addIndex('Playlists', ['isSystem']);
  },

  async down(queryInterface, Sequelize) {
    // Удаляем индексы и колонки
    await queryInterface.removeIndex('Playlists', ['isPersonal']);
    await queryInterface.removeIndex('Playlists', ['isSystem']);
    
    await queryInterface.removeColumn('Playlists', 'isPersonal');
    await queryInterface.removeColumn('Playlists', 'isSystem');
  }
};
