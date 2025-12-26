const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Meme = sequelize.define('Meme', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'image_url'
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
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  dislikes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_approved'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved'
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  memeText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'meme_text'
  },
  matchId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'match_id'
  },
  matchData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'match_data'
  },
  steamId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'steam_id'
  }
}, {
  tableName: 'memes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Associations
Meme.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(Meme, { foreignKey: 'userId', as: 'memes' });

module.exports = Meme;
