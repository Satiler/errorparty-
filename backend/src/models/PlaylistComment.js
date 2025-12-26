/**
 * PlaylistComment Model
 * Комментарии к подборкам
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlaylistComment = sequelize.define('PlaylistComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  playlistId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Playlists',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parentId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'PlaylistComments',
      key: 'id'
    }
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'PlaylistComments',
  timestamps: true,
  indexes: [
    { fields: ['playlistId'] },
    { fields: ['userId'] },
    { fields: ['parentId'] }
  ]
});

module.exports = PlaylistComment;
