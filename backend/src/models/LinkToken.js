const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель для временных токенов связывания TeamSpeak аккаунтов
 */
const LinkToken = sequelize.define('LinkToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.STRING(8),
    allowNull: false,
    comment: 'Уникальный код для связывания (например, ABC123)'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID пользователя, который запросил связывание'
  },
  teamspeakUid: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'UID клиента TeamSpeak (заполняется после связывания)'
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Использован ли токен'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Время истечения токена (обычно +15 минут)'
  }
}, {
  tableName: 'link_tokens',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['token']
    }
  ]
});

/**
 * Генерация случайного токена
 */
LinkToken.generateToken = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

module.exports = LinkToken;
