const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CS2 Weapon Statistics Model
 * Tracks detailed weapon usage statistics per player
 */
const CS2WeaponStats = sequelize.define('CS2WeaponStats', {
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
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'match_id',
    references: {
      model: 'cs2_matches',
      key: 'id'
    }
  },
  // Weapon information
  weaponName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'weapon_name',
    comment: 'Name of the weapon (e.g., ak47, m4a1, awp, usp_silencer)'
  },
  weaponType: {
    type: DataTypes.ENUM('rifle', 'pistol', 'smg', 'sniper', 'shotgun', 'heavy', 'grenade', 'knife', 'equipment'),
    allowNull: false,
    field: 'weapon_type'
  },
  // Kill statistics
  kills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total kills with this weapon'
  },
  headshots: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total headshot kills'
  },
  wallbangKills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'wallbang_kills',
    comment: 'Kills through walls/objects'
  },
  airshotKills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'airshot_kills',
    comment: 'Kills while enemy was in air'
  },
  blindKills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'blind_kills',
    comment: 'Kills while flashed'
  },
  // Damage statistics
  totalDamage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_damage',
    comment: 'Total damage dealt'
  },
  // Accuracy statistics
  shotsHit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'shots_hit',
    comment: 'Number of shots that hit'
  },
  shotsFired: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'shots_fired',
    comment: 'Total shots fired'
  },
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Hit percentage (hits/fired * 100)'
  },
  headshotPercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'headshot_percentage',
    comment: 'Headshot percentage (headshots/kills * 100)'
  },
  // Additional metrics
  deaths: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Deaths while holding this weapon'
  },
  firstKills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'first_kills',
    comment: 'Opening kills in rounds'
  },
  multiKills: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'multi_kills',
    comment: 'Rounds with 2+ kills'
  },
  // Time statistics
  timeUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'time_used',
    comment: 'Total seconds holding this weapon'
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
  tableName: 'cs2_weapon_stats',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'weapon_name']
    },
    {
      fields: ['user_id', 'weapon_type']
    },
    {
      fields: ['match_id']
    }
  ],
  hooks: {
    beforeSave: (weaponStats) => {
      // Calculate accuracy
      if (weaponStats.shotsFired > 0) {
        weaponStats.accuracy = parseFloat(((weaponStats.shotsHit / weaponStats.shotsFired) * 100).toFixed(2));
      }
      
      // Calculate headshot percentage
      if (weaponStats.kills > 0) {
        weaponStats.headshotPercentage = parseFloat(((weaponStats.headshots / weaponStats.kills) * 100).toFixed(2));
      }
    }
  }
});

module.exports = CS2WeaponStats;
