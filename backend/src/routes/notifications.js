const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User } = require('../models');
const pushNotificationService = require('../services/pushNotificationService');

/**
 * @route   POST /api/notifications/subscribe
 * @desc    Subscribe to push notifications
 * @access  Private
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: 'Subscription object is required'
      });
    }

    // Save subscription to user
    await User.update(
      { pushSubscription: JSON.stringify(subscription) },
      { where: { id: req.user.id } }
    );

    console.log(`✅ User ${req.user.id} subscribed to push notifications`);

    res.json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to push notifications'
    });
  }
});

/**
 * @route   POST /api/notifications/unsubscribe
 * @desc    Unsubscribe from push notifications
 * @access  Private
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    await User.update(
      { pushSubscription: null },
      { where: { id: req.user.id } }
    );

    console.log(`✅ User ${req.user.id} unsubscribed from push notifications`);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe from push notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/status
 * @desc    Get push notification subscription status
 * @access  Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pushSubscription']
    });

    res.json({
      success: true,
      subscribed: !!user.pushSubscription
    });
  } catch (error) {
    console.error('Error checking notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check notification status'
    });
  }
});

/**
 * @route   GET /api/notifications/vapid-public-key
 * @desc    Get VAPID public key for push notifications
 * @access  Public
 */
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured'
    });
  }

  res.json({
    success: true,
    publicKey
  });
});

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (for testing)
 * @access  Private
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const result = await pushNotificationService.sendToUser(
      req.user.id,
      {
        title: '🔔 Тестовое уведомление',
        body: 'Если вы видите это, push-уведомления работают!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test',
        data: { url: '/' }
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Test notification sent'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

module.exports = router;
