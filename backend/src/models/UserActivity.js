const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Дата активности (YYYY-MM-DD)'
  },
  voiceTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'voice_time',
    comment: 'Время в голосовых каналах в секундах'
  },
  connections: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Количество подключений за день'
  }
}, {
  tableName: 'user_activity',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id', 'date'],
      unique: true
    },
    {
      fields: ['date']
    }
  ]
});

module.exports = UserActivity;
