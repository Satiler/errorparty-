/**
 * AlbumComment Model
 * Комментарии к альбомам
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AlbumComment = sequelize.define('AlbumComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  albumId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Albums',
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
      model: 'AlbumComments',
      key: 'id'
    }
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'AlbumComments',
  timestamps: true,
  indexes: [
    { fields: ['albumId'] },
    { fields: ['userId'] },
    { fields: ['parentId'] }
  ]
});

module.exports = AlbumComment;
