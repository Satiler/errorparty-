const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Предпочтения пользователя для персонализации
 */
const UserPreferences = sequelize.define('UserPreferences', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  favoriteGenres: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  favoriteArtists: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  listeningHabits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Паттерны прослушивания'
  },
  moodProfile: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Профиль настроения'
  },
  discoveryProfile: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Открытость к новому'
  },
  lastAnalyzedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'UserPreferences',
  indexes: [
    { fields: ['userId'] },
    { fields: ['lastAnalyzedAt'] }
  ]
});

module.exports = UserPreferences;
