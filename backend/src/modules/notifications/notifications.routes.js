/**
 * Notifications Routes
 * Роуты для push-уведомлений
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notificationController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * @route   POST /api/notifications/subscribe
 * @desc    Subscribe to push notifications
 * @access  Private
 */
router.post('/subscribe', authenticateToken, notificationController.subscribe);

/**
 * @route   POST /api/notifications/unsubscribe
 * @desc    Unsubscribe from push notifications
 * @access  Private
 */
router.post('/unsubscribe', authenticateToken, notificationController.unsubscribe);

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authenticateToken, notificationController.getNotifications);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification
 * @access  Private
 */
router.post('/test', authenticateToken, notificationController.sendTestNotification);

module.exports = router;
