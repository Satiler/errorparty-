/**
 * TeamSpeak Controller
 * Интеграция с TeamSpeak 3
 */
const teamspeakService = require('../services/teamspeakService');
const { User } = require('../models');

/**
 * Get TeamSpeak server status
 */
const getServerStatus = async (req, res) => {
  try {
    const status = teamspeakService.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting TeamSpeak status:', error);
    res.status(500).json({ success: false, error: 'Failed to get server status' });
  }
};

/**
 * Get online clients
 */
const getClients = async (req, res) => {
  try {
    const clients = teamspeakService.getClients();
    res.json({ success: true, clients });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ success: false, error: 'Failed to get clients' });
  }
};

/**
 * Get channel list
 */
const getChannels = async (req, res) => {
  try {
    const channels = teamspeakService.getChannels();
    res.json({ success: true, channels });
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({ success: false, error: 'Failed to get channels' });
  }
};

/**
 * Link user to TeamSpeak identity
 */
const linkIdentity = async (req, res) => {
  try {
    const { tsUid } = req.body;
    const userId = req.user.id;

    if (!tsUid) {
      return res.status(400).json({ success: false, error: 'TeamSpeak UID required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.teamspeakUid = tsUid;
    await user.save();

    res.json({ success: true, message: 'TeamSpeak identity linked' });
  } catch (error) {
    console.error('Error linking TeamSpeak identity:', error);
    res.status(500).json({ success: false, error: 'Failed to link identity' });
  }
};

/**
 * Get user's total time on TeamSpeak
 */
const getUserTime = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      totalTime: user.totalOnlineTime || 0,
      teamspeakUid: user.teamspeakUid
    });
  } catch (error) {
    console.error('Error getting user time:', error);
    res.status(500).json({ success: false, error: 'Failed to get user time' });
  }
};

module.exports = {
  getServerStatus,
  getClients,
  getChannels,
  linkIdentity,
  getUserTime
};
