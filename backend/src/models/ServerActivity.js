const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServerActivity = sequelize.define('ServerActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  onlineUsers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'online_users'
  },
  activeChannels: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'active_channels'
  },
  totalBandwidth: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'total_bandwidth',
    comment: 'In bytes'
  }
}, {
  tableName: 'server_activity',
  timestamps: false,
  indexes: [
    {
      fields: ['timestamp']
    }
  ]
});

module.exports = ServerActivity;
