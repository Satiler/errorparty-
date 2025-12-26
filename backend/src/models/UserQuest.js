const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserQuest = sequelize.define('UserQuest', {
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
  questId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'quest_id',
    references: {
      model: 'quests',
      key: 'id'
    }
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current progress value'
  },
  targetValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'target_value',
    comment: 'Target value to complete quest'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'claimed'),
    defaultValue: 'active'
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  }
}, {
  tableName: 'user_quests',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'quest_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expires_at']
    },
    { // ✅ Add for quest panel filtering
      fields: ['user_id', 'status']
    },
    { // ✅ Add for quest expiry cleanup
      fields: ['user_id', 'expires_at']
    }
  ]
});

module.exports = UserQuest;
