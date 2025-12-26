const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Quote = sequelize.define('Quote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  author: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Who said it'
  },
  context: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'When/where it was said'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Who submitted the quote'
  },
  votes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_approved'
  }
}, {
  tableName: 'quotes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Associations
Quote.belongsTo(User, { foreignKey: 'userId', as: 'submitter' });
User.hasMany(Quote, { foreignKey: 'userId', as: 'quotes' });

module.exports = Quote;
