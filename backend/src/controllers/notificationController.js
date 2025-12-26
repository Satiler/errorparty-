/**
 * Notification Controller (Stub)
 * Push-уведомления
 */
const pushNotificationService = require('../services/pushNotificationService');

/**
 * Subscribe to push notifications
 */
const subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription) {
      return res.status(400).json({ success: false, error: 'Subscription data required' });
    }

    await pushNotificationService.saveSubscription(userId, subscription);

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
};

/**
 * Unsubscribe from push notifications
 */
const unsubscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    await pushNotificationService.removeSubscription(userId);

    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
  }
};

/**
 * Get user notifications
 */
const getNotifications = async (req, res) => {
  try {
    res.json({ success: true, notifications: [] });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

/**
 * Send test notification
 */
const sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await pushNotificationService.sendNotification(userId, {
      title: 'Тестовое уведомление',
      body: 'Это тестовое push-уведомление от ErrorParty',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    });

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  getNotifications,
  markAsRead,
  deleteNotification,
  sendTestNotification
};
