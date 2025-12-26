const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CS2 Player Performance Model
 * Aggregated performance metrics and ratings
 */
const CS2PlayerPerformance = sequelize.define('CS2PlayerPerformance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Overall statistics
  totalMatches: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_matches'
  },
  matchesWon: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'matches_won'
  },
  matchesLost: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'matches_lost'
  },
  winrate: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Win percentage'
  },
  // KDA statistics
  totalKills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_kills'
  },
  totalDeaths: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_deaths'
  },
  totalAssists: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_assists'
  },
  kdRatio: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'kd_ratio',
    comment: 'Kill/Death ratio'
  },
  adRatio: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'ad_ratio',
    comment: 'Assist/Death ratio'
  },
  kaRatio: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'ka_ratio',
    comment: '(Kills + Assists) / Deaths'
  },
  // Damage statistics
  totalDamage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_damage'
  },
  averageDamagePerRound: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'average_damage_per_round',
    comment: 'ADR - Average Damage per Round'
  },
  averageDamagePerMatch: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'average_damage_per_match'
  },
  // Headshot statistics
  totalHeadshots: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_headshots'
  },
  headshotPercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'headshot_percentage'
  },
  // Round statistics
  totalRounds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_rounds'
  },
  roundsWon: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'rounds_won'
  },
  totalMVPs: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_mvps'
  },
  // Multi-kill statistics
  total3Kills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_3kills'
  },
  total4Kills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_4kills'
  },
  total5Kills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_5kills'
  },
  // Clutch statistics
  totalClutches: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_clutches'
  },
  clutchesWon: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'clutches_won'
  },
  clutchSuccessRate: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'clutch_success_rate'
  },
  // Entry statistics
  totalEntryAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_entry_attempts'
  },
  totalEntryKills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_entry_kills'
  },
  entrySuccessRate: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'entry_success_rate'
  },
  // Utility statistics
  totalFlashAssists: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_flash_assists'
  },
  totalUtilityDamage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_utility_damage'
  },
  // Economy statistics
  totalMoneyEarned: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'total_money_earned'
  },
  averageMoneyPerRound: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'average_money_per_round'
  },
  // Rating systems
  hltvRating: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'hltv_rating',
    comment: 'HLTV 2.0 Rating'
  },
  impactRating: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'impact_rating',
    comment: 'Impact rating (opening kills, clutches, MVPs)'
  },
  consistencyScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'consistency_score',
    comment: 'Performance consistency across matches'
  },
  // Recent form (last 10 matches)
  recentWinrate: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'recent_winrate',
    comment: 'Winrate in last 10 matches'
  },
  recentKD: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'recent_kd',
    comment: 'K/D in last 10 matches'
  },
  recentADR: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'recent_adr',
    comment: 'ADR in last 10 matches'
  },
  // Playtime
  totalPlaytimeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_playtime_minutes'
  },
  // Peak performance
  bestKillsInMatch: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'best_kills_in_match'
  },
  bestADRInMatch: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'best_adr_in_match'
  },
  longestWinStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'longest_win_streak'
  },
  currentWinStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'current_win_streak'
  },
  // Last updated
  lastMatchDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_match_date'
  },
  // Timestamps
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
  tableName: 'cs2_player_performance',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id'],
      unique: true
    },
    {
      fields: ['hltv_rating']
    },
    {
      fields: ['winrate']
    }
  ],
  hooks: {
    beforeSave: (performance) => {
      // Calculate winrate
      if (performance.totalMatches > 0) {
        performance.winrate = parseFloat(((performance.matchesWon / performance.totalMatches) * 100).toFixed(2));
      }
      
      // Calculate K/D ratio
      if (performance.totalDeaths > 0) {
        performance.kdRatio = parseFloat((performance.totalKills / performance.totalDeaths).toFixed(2));
        performance.adRatio = parseFloat((performance.totalAssists / performance.totalDeaths).toFixed(2));
        performance.kaRatio = parseFloat(((performance.totalKills + performance.totalAssists) / performance.totalDeaths).toFixed(2));
      }
      
      // Calculate headshot percentage
      if (performance.totalKills > 0) {
        performance.headshotPercentage = parseFloat(((performance.totalHeadshots / performance.totalKills) * 100).toFixed(2));
      }
      
      // Calculate ADR
      if (performance.totalRounds > 0) {
        performance.averageDamagePerRound = parseFloat((performance.totalDamage / performance.totalRounds).toFixed(2));
      }
      
      if (performance.totalMatches > 0) {
        performance.averageDamagePerMatch = parseFloat((performance.totalDamage / performance.totalMatches).toFixed(2));
        performance.averageMoneyPerRound = performance.totalRounds > 0 ? parseFloat((performance.totalMoneyEarned / performance.totalRounds).toFixed(2)) : 0;
      }
      
      // Calculate clutch success rate
      if (performance.totalClutches > 0) {
        performance.clutchSuccessRate = parseFloat(((performance.clutchesWon / performance.totalClutches) * 100).toFixed(2));
      }
      
      // Calculate entry success rate
      if (performance.totalEntryAttempts > 0) {
        performance.entrySuccessRate = parseFloat(((performance.totalEntryKills / performance.totalEntryAttempts) * 100).toFixed(2));
      }
      
      // Calculate HLTV 2.0 Rating (simplified version)
      if (performance.totalRounds > 0) {
        const killsPerRound = performance.totalKills / performance.totalRounds;
        const survivalRate = (performance.totalRounds - performance.totalDeaths) / performance.totalRounds;
        const assistsPerRound = performance.totalAssists / performance.totalRounds;
        const damagePerRound = performance.totalDamage / performance.totalRounds;
        
        performance.hltvRating = parseFloat((
          0.0073 * killsPerRound * 100 +
          0.3591 * survivalRate * 100 +
          -0.5329 * performance.totalDeaths / performance.totalRounds * 100 +
          0.2372 * assistsPerRound * 100 +
          0.0032 * damagePerRound
        ).toFixed(2));
      }
      
      // Calculate impact rating
      const impactScore = (
        performance.totalEntryKills * 3 +
        performance.clutchesWon * 5 +
        performance.totalMVPs * 2 +
        performance.total5Kills * 10 +
        performance.total4Kills * 5 +
        performance.total3Kills * 2
      );
      
      performance.impactRating = performance.totalMatches > 0 
        ? parseFloat((impactScore / performance.totalMatches).toFixed(2))
        : 0;
    }
  }
});

module.exports = CS2PlayerPerformance;
