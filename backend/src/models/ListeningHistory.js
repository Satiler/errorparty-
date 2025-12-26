/**
 * ListeningHistory Model
 * История прослушиваний для ML рекомендаций
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ListeningHistory = sequelize.define('ListeningHistory', {
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
  },
  listenedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Сколько секунд прослушано'
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Прослушан до конца'
  },
  // Контекст для ML
  context: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Контекст: время суток, устройство, плейлист'
  }
}, {
  tableName: 'ListeningHistory',
  timestamps: false,
  indexes: [
    { fields: ['userId', 'listenedAt'] },
    { fields: ['trackId'] },
    { fields: ['listenedAt'] }
  ]
});

module.exports = ListeningHistory;
