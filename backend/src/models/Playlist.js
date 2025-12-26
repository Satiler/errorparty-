/**
 * Playlist Model
 * Плейлисты пользователей
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Playlist = sequelize.define('Playlist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Can be null for system/auto playlists
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  coverPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Playlist cover image URL or gradient reference'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPersonal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Личный плейлист (Моя волна, Премьера и т.д.)'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Системный плейлист'
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'user' // user, editorial, auto
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  subscriberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  playCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT)
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'Playlists',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['isPublic'] },
    { fields: ['type'] }
  ]
});

module.exports = Playlist;
