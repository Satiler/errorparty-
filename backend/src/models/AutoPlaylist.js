const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Автоматические плейлисты (Плейлист дня, Премьеры, Тайник, Чарты)
 */
const AutoPlaylist = sequelize.define('AutoPlaylist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'daily (Плейлист дня), premiere (Премьеры), stash (Тайник), charts (Чарты)'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  trackIds: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [],
    comment: 'Массив ID треков'
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Когда плейлист устареет'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Параметры генерации'
  }
}, {
  tableName: 'AutoPlaylists',
  indexes: [
    { fields: ['userId', 'type'], unique: true },
    { fields: ['type'] },
    { fields: ['expiresAt'] }
  ]
});

module.exports = AutoPlaylist;
