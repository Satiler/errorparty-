const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'password_hash'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User biography/description'
  },
  steamId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    field: 'steam_id'
  },
  cs2AuthToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'cs2_auth_token',
    comment: 'CS2 Authentication Token for accessing match history'
  },
  cs2TokenLinkedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cs2_token_linked_at',
    comment: 'When CS2 token was linked'
  },
  cs2MatchToken: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'cs2_match_token',
    comment: 'CS2 Match Token (Share Code) of last competitive match - used as anchor for match history sync'
  },
  cs2MatchTokenLinkedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cs2_match_token_linked_at',
    comment: 'When Match Token was last linked'
  },
  discordId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    field: 'discord_id'
  },
  teamspeakUid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'teamspeak_uid'
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    defaultValue: 'user'
  },
  banned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  totalOnlineTime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_online_time',
    comment: 'Total time in seconds'
  },
  lastSeen: {
    type: DataTypes.DATE,
    field: 'last_seen'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  pushSubscription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'push_subscription',
    comment: 'Web Push subscription JSON for PWA notifications'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['steam_id']
    },
    {
      fields: ['teamspeak_uid']
    },
    { // ✅ Add for leaderboard queries  
      fields: ['total_online_time']
    },
    { // ✅ Add for role-based queries
      fields: ['role']
    }
  ]
});

module.exports = User;
