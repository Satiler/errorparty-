/**
 * TrackLike Model
 * Лайки треков пользователями
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrackLike = sequelize.define('TrackLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  trackId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Tracks',
      key: 'id'
    }
  }
}, {
  tableName: 'TrackLikes',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { unique: true, fields: ['userId', 'trackId'] },
    { fields: ['trackId'] },
    { fields: ['userId'] }
  ]
});

module.exports = TrackLike;
