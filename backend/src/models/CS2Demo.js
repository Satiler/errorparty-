const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CS2Demo = sequelize.define('CS2Demo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'match_id',
    references: {
      model: 'cs2_matches',
      key: 'id'
    }
  },
  shareCode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'share_code',
    comment: 'CS2 match share code'
  },
  demoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'demo_url',
    comment: 'URL to demo file on Valve servers'
  },
  cluster: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Replay cluster number (0-255)'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'file_path',
    comment: 'Local file path if demo was downloaded'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
    comment: 'Demo file size in bytes'
  },
  status: {
    type: DataTypes.ENUM(
      'pending',      // Waiting to be downloaded
      'downloading',  // Currently downloading
      'downloaded',   // Downloaded but not parsed
      'parsing',      // Currently being parsed
      'parsed',       // Successfully parsed
      'failed',       // Failed to download or parse
      'unavailable',  // Demo not yet available (will retry)
      'expired'       // Demo no longer available
    ),
    allowNull: false,
    defaultValue: 'pending'
  },
  nextRetryAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_retry_at',
    comment: 'Scheduled time for next download attempt'
  },
  downloadedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'downloaded_at'
  },
  parsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'parsed_at'
  },
  parseError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'parse_error',
    comment: 'Error message if parsing failed'
  },
  // Parsed statistics (JSON)
  parsedData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'parsed_data',
    comment: 'Full parsed statistics from demo file'
  },
  // Metadata
  mapName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'map_name'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Match duration in seconds'
  },
  tickRate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tick_rate',
    comment: 'Demo tick rate'
  },
  serverType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'server_type',
    comment: 'Matchmaking, Premier, etc.'
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
  tableName: 'cs2_demos',
  timestamps: true,
  indexes: [
    {
      fields: ['match_id']
    },
    {
      fields: ['share_code']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = CS2Demo;
