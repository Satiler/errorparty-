/**
 * Album Model
 * Музыкальные альбомы
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Album = sequelize.define('Album', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  coverPath: {
    type: DataTypes.TEXT
  },
  coverUrl: {
    type: DataTypes.TEXT,
    comment: 'URL обложки (для внешних источников)'
  },
  externalId: {
    type: DataTypes.STRING(255),
    comment: 'DEPRECATED: ID из внешнего источника (использовать providerAlbumId)'
  },
  sourceType: {
    type: DataTypes.STRING(50),
    comment: 'DEPRECATED: Тип источника (использовать provider)'
  },
  sourceUrl: {
    type: DataTypes.TEXT,
    comment: 'URL источника'
  },
  source: {
    type: DataTypes.STRING(100),
    comment: 'Источник альбома (kissvk.top, jamendo.com и т.д.)'
  },
  provider: {
    type: DataTypes.STRING(50),
    comment: 'Провайдер: local, kissvk, jamendo, vk, etc.'
  },
  providerAlbumId: {
    type: DataTypes.STRING(255),
    comment: 'ID альбома у провайдера'
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Пользователь, загрузивший альбом'
  },
  releaseYear: {
    type: DataTypes.INTEGER
  },
  releaseDate: {
    type: DataTypes.DATEONLY,
    comment: 'Точная дата релиза'
  },
  genre: {
    type: DataTypes.STRING(100)
  },
  totalTracks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  likeCount: {
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
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'Albums',
  timestamps: true,
  indexes: [
    { fields: ['artist'] },
    { fields: ['genre'] },
    { fields: ['createdBy'] },
    { fields: ['isPublic'] },
    { fields: ['releaseYear'] }
  ]
});

module.exports = Album;
