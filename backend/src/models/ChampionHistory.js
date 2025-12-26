const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const ChampionHistory = sequelize.define('ChampionHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  category: {
    type: DataTypes.ENUM('voice', 'memes', 'gaming', 'overall'),
    allowNull: false,
    defaultValue: 'overall'
  },
  weekNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'week_number'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'champion_history',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'category', 'week_number', 'year']
    },
    {
      fields: ['category', 'week_number', 'year']
    }
  ]
});

// Associations
ChampionHistory.belongsTo(require('./User'), { foreignKey: 'userId', as: 'user' });

module.exports = ChampionHistory;
