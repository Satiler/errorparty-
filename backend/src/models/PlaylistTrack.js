/**
 * PlaylistTrack Model
 * Many-to-many связь между плейлистами и треками
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlaylistTrack = sequelize.define('PlaylistTrack', {
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
  trackId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Tracks',
      key: 'id'
    }
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Порядок трека в плейлисте'
  },
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Пользователь, добавивший трек'
  }
}, {
  tableName: 'PlaylistTracks',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['playlistId', 'trackId'] },
    { fields: ['playlistId', 'position'] }
  ]
});

module.exports = PlaylistTrack;
