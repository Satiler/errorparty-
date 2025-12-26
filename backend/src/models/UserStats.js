const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const UserStats = sequelize.define('UserStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  totalConnections: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_connections'
  },
  totalMessages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_messages'
  },
  favoriteChannel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'favorite_channel'
  },
  longestSession: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'longest_session',
    comment: 'In seconds'
  },
  averageSessionTime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'average_session_time',
    comment: 'In seconds'
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  experience: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  achievements: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
}, {
  tableName: 'user_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Associations
UserStats.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(UserStats, { foreignKey: 'userId', as: 'stats' });

module.exports = UserStats;
