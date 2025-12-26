const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Meme = require('./Meme');

const MemeComment = sequelize.define('MemeComment', {
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
  memeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'meme_id',
    references: {
      model: 'memes',
      key: 'id'
    }
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 1000]
    }
  }
}, {
  tableName: 'meme_comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Associations
MemeComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
MemeComment.belongsTo(Meme, { foreignKey: 'memeId', as: 'meme' });
User.hasMany(MemeComment, { foreignKey: 'userId', as: 'memeComments' });
Meme.hasMany(MemeComment, { foreignKey: 'memeId', as: 'comments' });

module.exports = MemeComment;
