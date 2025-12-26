/**
 * PlaylistSubscription Model
 * Подписки на подборки
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlaylistSubscription = sequelize.define('PlaylistSubscription', {
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
  playlistId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Playlists',
      key: 'id'
    }
  }
}, {
  tableName: 'PlaylistSubscriptions',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['userId', 'playlistId'] },
    { fields: ['userId'] },
    { fields: ['playlistId'] }
  ]
});

module.exports = PlaylistSubscription;
