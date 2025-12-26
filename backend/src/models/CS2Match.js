const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CS2Match = sequelize.define('CS2Match', {
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
  // Основная статистика
  kills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  deaths: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  assists: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  headshots: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  damage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  mvps: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  // Раунды
  roundsPlayed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'rounds_played'
  },
  roundsWon: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'rounds_won'
  },
  isWin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_win'
  },
  // Дополнительная статистика
  map: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rank: {
    type: DataTypes.STRING,
    allowNull: true
  },
  headshotPercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'headshot_percentage'
  },
  adr: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Average Damage per Round'
  },
  rating: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  // Клатчи
  clutch1v1: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'clutch_1v1'
  },
  clutch1v2: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'clutch_1v2'
  },
  clutch1v3: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'clutch_1v3'
  },
  clutch1v4: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'clutch_1v4'
  },
  clutch1v5: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'clutch_1v5'
  },
  // Мультикиллы
  kills3k: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'kills_3k'
  },
  kills4k: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'kills_4k'
  },
  kills5k: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'kills_5k'
  },
  // Источник данных
  source: {
    type: DataTypes.ENUM('steam_api', 'manual', 'faceit', 'demo_parser', 'share_code', 'gsi', 'auto_sync'),
    allowNull: false,
    defaultValue: 'steam_api'
  },
  // GSI полный payload (JSON)
  gsiData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'gsi_data',
    comment: 'Full GSI payload with all players, rounds, weapons, etc'
  },
  // Share Code данные
  shareCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'share_code',
    comment: 'CS2 match share code (CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx)'
  },
  matchId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'match_id',
    comment: 'Decoded match ID from share code'
  },
  outcomeId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'outcome_id',
    comment: 'Decoded outcome ID from share code'
  },
  tokenId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'token_id',
    comment: 'Decoded token ID from share code'
  },
  // Временные метки
  playedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'played_at'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'cs2_matches',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'played_at']
    },
    {
      fields: ['user_id', 'is_win']
    },
    { // ✅ Add for match_date queries
      fields: ['match_date']
    },
    { // ✅ Add for outcome filtering
      fields: ['user_id', 'outcome']
    }
  ]
});

module.exports = CS2Match;
