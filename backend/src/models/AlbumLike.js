/**
 * AlbumLike Model
 * Лайки альбомов
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AlbumLike = sequelize.define('AlbumLike', {
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
  albumId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Albums',
      key: 'id'
    }
  }
}, {
  tableName: 'AlbumLikes',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['userId', 'albumId'] },
    { fields: ['userId'] },
    { fields: ['albumId'] }
  ]
});

module.exports = AlbumLike;
