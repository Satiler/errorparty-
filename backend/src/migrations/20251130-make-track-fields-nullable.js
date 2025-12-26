'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Делаем поля необязательными для внешних треков
    await queryInterface.changeColumn('Tracks', 'filePath', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Путь к аудио файлу (null для внешних источников)'
    });

    await queryInterface.changeColumn('Tracks', 'fileFormat', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('Tracks', 'fileSize', {
      type: Sequelize.BIGINT,
      allowNull: true
    });

    await queryInterface.changeColumn('Tracks', 'uploadedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Пользователь загрузивший трек (null для внешних)'
    });

    console.log('✅ Track fields made nullable for external sources');
  },

  down: async (queryInterface, Sequelize) => {
    // Откат - делаем поля обязательными снова
    await queryInterface.changeColumn('Tracks', 'filePath', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('Tracks', 'fileFormat', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('Tracks', 'fileSize', {
      type: Sequelize.BIGINT,
      allowNull: false
    });

    await queryInterface.changeColumn('Tracks', 'uploadedBy', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    console.log('✅ Track fields reverted to NOT NULL');
  }
};
