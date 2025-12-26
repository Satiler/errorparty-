/**
 * Migration: Add sourceType and sourceUrl to Tracks
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Tracks', 'sourceType', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Тип источника: local (загружен), external (прямая ссылка), zaycev (требует API)'
    });
    
    await queryInterface.addColumn('Tracks', 'sourceUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL страницы трека на внешнем сервисе'
    });

    // Обновляем существующие треки
    await queryInterface.sequelize.query(`
      UPDATE "Tracks" 
      SET "sourceType" = 'external' 
      WHERE "externalSource" IS NOT NULL 
        AND "externalSource" != ''
        AND "sourceType" IS NULL
    `);

    console.log('✅ Added sourceType and sourceUrl columns, updated existing tracks');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Tracks', 'sourceType');
    await queryInterface.removeColumn('Tracks', 'sourceUrl');
  }
};
