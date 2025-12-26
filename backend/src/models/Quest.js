const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Quest = sequelize.define('Quest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for quest type'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  game: {
    type: DataTypes.ENUM('dota2', 'cs2', 'general'),
    allowNull: false,
    defaultValue: 'general'
  },
  type: {
    type: DataTypes.ENUM('daily', 'weekly', 'special'),
    allowNull: false,
    defaultValue: 'daily'
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard', 'epic'),
    allowNull: false,
    defaultValue: 'easy'
  },
  requirement: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Quest requirements (e.g., {type: "kills", value: 10})'
  },
  reward: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Rewards (e.g., {xp: 100, coins: 50})'
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'quests',
  timestamps: true,
  underscored: true
});

module.exports = Quest;
