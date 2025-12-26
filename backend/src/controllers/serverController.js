const teamspeakService = require('../services/teamspeakService');
const { User, Meme, Quote } = require('../models');
const { Op, QueryTypes, fn, col } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Get comprehensive server statistics
 */
const getStats = async (req, res) => {
  try {
    // Get TeamSpeak server info
    const tsInfo = await teamspeakService.getServerInfo();
    const tsClients = await teamspeakService.getOnlineClients();
    const tsChannels = await teamspeakService.getChannelList();

    // Get database statistics
    const [totalUsers, activeUsers, totalMemes, totalQuotes] = await Promise.all([
      User.count(),
      User.count({
        where: {
          lastSeen: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      Meme.count(),
      // Quotes count
      Quote ? Quote.count() : sequelize.query('SELECT COUNT(*) as count FROM "Quotes"', { 
        type: QueryTypes.SELECT 
      }).then(result => result[0]?.count || 0).catch(() => 0)
    ]);

    // Calculate total online time (sum of all users)
    const totalOnlineTime = await User.sum('totalOnlineTime') || 0;
    const totalOnlineHours = Math.floor(totalOnlineTime / 3600);

    // Get top players count
    const topPlayersCount = await User.count({
      where: {
        totalOnlineTime: {
          [Op.gt]: 0
        }
      }
    });

    // Get active games data (users who played in last 7 days)
    const activeGamesCount = await User.count({
      where: {
        lastSeen: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const stats = {
      teamspeak: {
        online: tsInfo.virtualserver_status === 'online',
        clientsOnline: parseInt(tsInfo.virtualserver_clientsonline) || 0,
        maxClients: parseInt(tsInfo.virtualserver_maxclients) || 32,
        channelsOnline: parseInt(tsInfo.virtualserver_channelsonline) || 0,
        uptime: parseInt(tsInfo.virtualserver_uptime) || 0,
        serverName: tsInfo.virtualserver_name || 'ErrorParty.ru',
        clients: tsClients.length,
        channels: tsChannels.length
      },
      community: {
        totalUsers,
        activeUsers,
        totalMemes,
        totalQuotes,
        totalOnlineHours,
        topPlayersCount
      },
      games: {
        activeGames: activeGamesCount
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching server stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch server statistics',
      stats: {
        teamspeak: {
          online: false,
          clientsOnline: 0,
          maxClients: 32,
          channelsOnline: 0,
          uptime: 0,
          serverName: 'ErrorParty.ru',
          clients: 0,
          channels: 0
        },
        community: {
          totalUsers: 0,
          activeUsers: 0,
          totalMemes: 0,
          totalQuotes: 0,
          totalOnlineHours: 0,
          topPlayersCount: 0
        },
        games: {
          activeGames: 0
        }
      }
    });
  }
};

/**
 * Get TeamSpeak server info only
 */
const getTeamSpeakInfo = async (req, res) => {
  try {
    const info = await teamspeakService.getServerInfo();
    const clients = await teamspeakService.getOnlineClients();

    res.json({
      success: true,
      server: {
        online: info.virtualserver_status === 'online',
        name: info.virtualserver_name,
        clientsOnline: parseInt(info.virtualserver_clientsonline) || clients.length,
        maxClients: parseInt(info.virtualserver_maxclients) || 32,
        channelsOnline: parseInt(info.virtualserver_channelsonline) || 0,
        uptime: parseInt(info.virtualserver_uptime) || 0,
        platform: info.virtualserver_platform,
        version: info.virtualserver_version
      },
      clients: clients.map(c => ({
        nickname: c.client_nickname,
        away: c.client_away,
        idleTime: c.client_idle_time,
        country: c.client_country
      }))
    });
  } catch (error) {
    console.error('Error fetching TeamSpeak info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TeamSpeak info',
      server: {
        online: false,
        name: 'ErrorParty.ru',
        clientsOnline: 0,
        maxClients: 32,
        channelsOnline: 0,
        uptime: 0
      },
      clients: []
    });
  }
};

/**
 * Get simple server status (for Navbar)
 */
const getStatus = async (req, res) => {
  try {
    const tsInfo = await teamspeakService.getServerInfo();
    const tsClients = await teamspeakService.getOnlineClients();

    res.json({
      online: tsInfo.virtualserver_status === 'online',
      clients: tsClients.length,
      maxClients: parseInt(tsInfo.virtualserver_maxclients) || 32
    });
  } catch (error) {
    console.error('Error fetching server status:', error);
    res.json({
      online: false,
      clients: 0,
      maxClients: 32
    });
  }
};

module.exports = {
  getStats,
  getTeamSpeakInfo,
  getStatus
};
