const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Meme = require('./Meme');

const MemeRating = sequelize.define('MemeRating', {
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
  rating: {
    type: DataTypes.ENUM('like', 'dislike'),
    allowNull: false
  }
}, {
  tableName: 'meme_ratings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'meme_id'],
      name: 'unique_user_meme_rating'
    }
  ]
});

// Associations
MemeRating.belongsTo(User, { foreignKey: 'userId', as: 'user' });
MemeRating.belongsTo(Meme, { foreignKey: 'memeId', as: 'meme' });
User.hasMany(MemeRating, { foreignKey: 'userId', as: 'memeRatings' });
Meme.hasMany(MemeRating, { foreignKey: 'memeId', as: 'ratings' });

module.exports = MemeRating;
