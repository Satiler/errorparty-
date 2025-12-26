const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Achievement = sequelize.define('Achievement', {
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
  game: {
    type: DataTypes.ENUM('dota2', 'cs2', 'general'),
    allowNull: false,
    defaultValue: 'general'
  },
  achievementKey: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'achievement_key',
    comment: 'Unique identifier for achievement type (e.g., first_blood_king, rampage_master)'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Display title of achievement'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Achievement description'
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Emoji or icon identifier'
  },
  rarity: {
    type: DataTypes.ENUM('common', 'rare', 'epic', 'legendary', 'mythic'),
    allowNull: false,
    defaultValue: 'common'
  },
  earnedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'earned_at'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional data like match_id, score, etc.'
  }
}, {
  tableName: 'achievements',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'achievement_key']
    },
    {
      fields: ['game']
    },
    {
      fields: ['rarity']
    }
  ]
});

module.exports = Achievement;
