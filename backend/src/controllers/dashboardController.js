const { ServerActivity, User } = require('../models');
const { Op } = require('sequelize');
const teamspeakService = require('../services/teamspeakService');

// Simple in-memory cache
const cache = {
  activityHistory: { data: null, timestamp: 0 },
  peakTimes: { data: null, timestamp: 0 },
  topChannels: { data: null, timestamp: 0 },
  weeklyComparison: { data: null, timestamp: 0 }
};

const CACHE_TTL = {
  activityHistory: 5 * 60 * 1000,    // 5 minutes - historical data
  peakTimes: 5 * 60 * 1000,           // 5 minutes - historical data
  topChannels: 30 * 1000,             // 30 seconds - live data
  weeklyComparison: 10 * 60 * 1000    // 10 minutes - statistical data
};

const getCachedData = (key) => {
  const cached = cache[key];
  const now = Date.now();
  const ttl = CACHE_TTL[key] || 60000;
  
  if (cached.data && (now - cached.timestamp) < ttl) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
};

/**
 * Get activity history for charts (last 7 days)
 */
exports.getActivityHistory = async (req, res) => {
  try {
    // Check cache first
    const cached = getCachedData('activityHistory');
    if (cached) {
      return res.json(cached);
    }

    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get hourly activity data
    const activities = await ServerActivity.findAll({
      where: {
        timestamp: {
          [Op.gte]: startDate
        }
      },
      order: [['timestamp', 'ASC']],
      raw: true
    });

    // Group by hour for better visualization
    const hourlyData = {};
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).toISOString().slice(0, 13) + ':00:00';
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          timestamp: hour,
          clients: [],
          avgClients: 0
        };
      }
      hourlyData[hour].clients.push(activity.clients_online);
    });

    // Calculate averages
    const chartData = Object.values(hourlyData).map(data => ({
      timestamp: data.timestamp,
      clients: Math.round(data.clients.reduce((a, b) => a + b, 0) / data.clients.length)
    }));

    const response = {
      success: true,
      data: chartData,
      period: `${days} days`
    };

    setCachedData('activityHistory', response);
    res.json(response);
  } catch (error) {
    console.error('Get activity history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity history'
    });
  }
};

/**
 * Get peak times analysis
 */
exports.getPeakTimes = async (req, res) => {
  try {
    // Check cache first
    const cached = getCachedData('peakTimes');
    if (cached) {
      return res.json(cached);
    }

    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await ServerActivity.findAll({
      where: {
        timestamp: {
          [Op.gte]: startDate
        }
      },
      raw: true
    });

    // Group by hour of day (0-23)
    const hourlyStats = Array(24).fill(0).map((_, hour) => ({
      hour,
      totalClients: 0,
      count: 0,
      avgClients: 0
    }));

    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourlyStats[hour].totalClients += activity.clients_online;
      hourlyStats[hour].count += 1;
    });

    // Calculate averages
    hourlyStats.forEach(stat => {
      stat.avgClients = stat.count > 0 ? Math.round(stat.totalClients / stat.count) : 0;
    });

    // Find peak hour
    const peakHour = hourlyStats.reduce((max, stat) => 
      stat.avgClients > max.avgClients ? stat : max
    );

    const response = {
      success: true,
      hourlyStats,
      peakHour: {
        hour: peakHour.hour,
        avgClients: peakHour.avgClients,
        timeRange: `${peakHour.hour}:00 - ${peakHour.hour + 1}:00`
      }
    };

    setCachedData('peakTimes', response);
    res.json(response);
  } catch (error) {
    console.error('Get peak times error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch peak times'
    });
  }
};

/**
 * Get top active channels
 */
exports.getTopChannels = async (req, res) => {
  try {
    // Check cache first
    const cached = getCachedData('topChannels');
    if (cached) {
      return res.json(cached);
    }

    const clients = await teamspeakService.getOnlineClients();
    const channels = await teamspeakService.getChannelList();

    // Count clients per channel
    const channelStats = {};
    channels.forEach(channel => {
      channelStats[channel.cid] = {
        id: channel.cid,
        name: channel.channel_name,
        clientCount: 0,
        clients: []
      };
    });

    clients.forEach(client => {
      if (channelStats[client.cid]) {
        channelStats[client.cid].clientCount++;
        channelStats[client.cid].clients.push({
          nickname: client.client_nickname,
          away: client.client_away || false
        });
      }
    });

    // Sort by client count and get top channels
    const topChannels = Object.values(channelStats)
      .filter(ch => ch.clientCount > 0)
      .sort((a, b) => b.clientCount - a.clientCount)
      .slice(0, 10);

    const response = {
      success: true,
      channels: topChannels,
      totalChannels: channels.length,
      activeChannels: topChannels.length
    };

    setCachedData('topChannels', response);
    res.json(response);
  } catch (error) {
    console.error('Get top channels error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top channels'
    });
  }
};

/**
 * Get weekly comparison
 */
exports.getWeeklyComparison = async (req, res) => {
  try {
    // Check cache first
    const cached = getCachedData('weeklyComparison');
    if (cached) {
      return res.json(cached);
    }

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    lastWeekStart.setHours(0, 0, 0, 0);

    // Get this week's data
    const thisWeekActivities = await ServerActivity.findAll({
      where: {
        timestamp: {
          [Op.gte]: thisWeekStart
        }
      },
      raw: true
    });

    // Get last week's data
    const lastWeekActivities = await ServerActivity.findAll({
      where: {
        timestamp: {
          [Op.gte]: lastWeekStart,
          [Op.lt]: thisWeekStart
        }
      },
      raw: true
    });

    const calcStats = (activities) => {
      if (activities.length === 0) return { avg: 0, max: 0, total: 0 };
      const clients = activities.map(a => a.clients_online);
      return {
        avg: Math.round(clients.reduce((a, b) => a + b, 0) / clients.length),
        max: Math.max(...clients),
        total: clients.reduce((a, b) => a + b, 0)
      };
    };

    const thisWeek = calcStats(thisWeekActivities);
    const lastWeek = calcStats(lastWeekActivities);

    const avgChange = lastWeek.avg > 0 
      ? Math.round(((thisWeek.avg - lastWeek.avg) / lastWeek.avg) * 100)
      : 0;

    const response = {
      success: true,
      thisWeek,
      lastWeek,
      change: {
        avg: avgChange,
        trend: avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : 'stable'
      }
    };

    setCachedData('weeklyComparison', response);
    res.json(response);
  } catch (error) {
    console.error('Get weekly comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly comparison'
    });
  }
};
