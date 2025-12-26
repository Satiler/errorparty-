/**
 * Migration: Add ML analytics fields to Tracks table
 * Добавляем поля для Smart Mixes: bpm, energy, isInstrumental
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Tracks', 'bpm', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Темп композиции (beats per minute) для умных миксов'
    });

    await queryInterface.addColumn('Tracks', 'energy', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Энергетика трека от 0.0 до 1.0 (ML-анализ)'
    });

    await queryInterface.addColumn('Tracks', 'isInstrumental', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Является ли трек инструментальным (без вокала)'
    });

    // Создаем индекс для быстрого поиска по BPM и энергии
    await queryInterface.addIndex('Tracks', ['bpm'], {
      name: 'tracks_bpm_idx'
    });

    await queryInterface.addIndex('Tracks', ['energy'], {
      name: 'tracks_energy_idx'
    });

    await queryInterface.addIndex('Tracks', ['isInstrumental'], {
      name: 'tracks_is_instrumental_idx'
    });

    console.log('✅ Migration completed: Added bpm, energy, isInstrumental to Tracks');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Tracks', 'tracks_bpm_idx');
    await queryInterface.removeIndex('Tracks', 'tracks_energy_idx');
    await queryInterface.removeIndex('Tracks', 'tracks_is_instrumental_idx');
    
    await queryInterface.removeColumn('Tracks', 'bpm');
    await queryInterface.removeColumn('Tracks', 'energy');
    await queryInterface.removeColumn('Tracks', 'isInstrumental');

    console.log('✅ Rollback completed: Removed bpm, energy, isInstrumental from Tracks');
  }
};
