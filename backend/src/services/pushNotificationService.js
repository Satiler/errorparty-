/**
 * Push Notification Service
 * Handles Web Push notifications for PWA
 */

const webpush = require('web-push');
const { User } = require('../models');
const { Op } = require('sequelize');

class PushNotificationService {
  constructor() {
    // Vapid keys for web push (generate these with: npx web-push generate-vapid-keys)
    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
      privateKey: process.env.VAPID_PRIVATE_KEY || ''
    };

    if (vapidKeys.publicKey && vapidKeys.privateKey) {
      webpush.setVapidDetails(
        `mailto:${process.env.ADMIN_EMAIL || 'admin@errorparty.ru'}`,
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );
      console.log('✅ Web Push initialized');
    } else {
      console.warn('⚠️ VAPID keys not configured. Push notifications disabled.');
    }
  }

  /**
   * Send push notification to user
   * @param {number} userId - User ID
   * @param {object} notification - Notification data
   */
  async sendToUser(userId, notification) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user || !user.pushSubscription) {
        return { success: false, error: 'No push subscription found' };
      }

      const subscription = JSON.parse(user.pushSubscription);
      const payload = JSON.stringify(notification);

      await webpush.sendNotification(subscription, payload);
      
      console.log(`✅ Push sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // If subscription is invalid, remove it
      if (error.statusCode === 410) {
        await User.update(
          { pushSubscription: null },
          { where: { id: userId } }
        );
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple users
   * @param {array} userIds - Array of user IDs
   * @param {object} notification - Notification data
   */
  async sendToUsers(userIds, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, notification))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(`📊 Push notifications sent: ${successful} success, ${failed} failed`);
    return { successful, failed };
  }

  /**
   * Send push notification to all users
   * @param {object} notification - Notification data
   */
  async sendToAll(notification) {
    const users = await User.findAll({
      where: {
        pushSubscription: { [Op.ne]: null }
      },
      attributes: ['id']
    });
    
    const userIds = users.map(u => u.id);
    return this.sendToUsers(userIds, notification);
  }

  /**
   * Notification templates
   */
  notifications = {
    // Quest completed
    questCompleted: (questTitle, reward) => ({
      title: '🎯 Квест выполнен!',
      body: `${questTitle} - Награда: ${reward.xp} XP`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'quest-completed',
      data: { url: '/quests' },
      actions: [
        { action: 'view', title: 'Посмотреть' },
        { action: 'claim', title: 'Забрать награду' }
      ]
    }),

    // Level up
    levelUp: (newLevel) => ({
      title: '🎉 Новый уровень!',
      body: `Поздравляем! Теперь вы ${newLevel} уровня`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'level-up',
      requireInteraction: true,
      data: { url: '/profile' }
    }),

    // New match
    newMatch: (game, result) => ({
      title: `🎮 Новый матч ${game}`,
      body: result === 'win' ? '🏆 Победа!' : '💪 Поражение, но опыт получен!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'new-match',
      data: { url: game === 'dota2' ? '/dota2' : '/cs2' }
    }),

    // Achievement unlocked
    achievementUnlocked: (title, description) => ({
      title: '🏅 Достижение разблокировано!',
      body: `${title}: ${description}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'achievement',
      requireInteraction: true,
      data: { url: '/profile' }
    }),

    // Meme liked
    memeLiked: (username, memeTitle) => ({
      title: '❤️ Новый лайк!',
      body: `${username} оценил ваш мем "${memeTitle}"`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'meme-liked',
      data: { url: '/memes' }
    }),

    // New comment
    newComment: (username, memeTitle) => ({
      title: '💬 Новый комментарий',
      body: `${username} прокомментировал ваш мем "${memeTitle}"`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'new-comment',
      data: { url: '/memes' }
    }),

    // Friend request
    friendRequest: (username) => ({
      title: '👥 Заявка в друзья',
      body: `${username} хочет добавить вас в друзья`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'friend-request',
      data: { url: '/friends' },
      actions: [
        { action: 'accept', title: 'Принять' },
        { action: 'decline', title: 'Отклонить' }
      ]
    }),

    // Tournament starting
    tournamentStarting: (tournamentName, time) => ({
      title: '🏆 Турнир начинается!',
      body: `${tournamentName} начнётся через ${time} минут`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'tournament-start',
      requireInteraction: true,
      data: { url: '/tournaments' }
    }),

    // Daily reminder
    dailyReminder: () => ({
      title: '⏰ Не забудьте зайти!',
      body: 'Ежедневные квесты ждут вас. Получите награды!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'daily-reminder',
      data: { url: '/quests' }
    })
  };

  /**
   * Send quest completed notification
   */
  async notifyQuestCompleted(userId, questTitle, reward) {
    return this.sendToUser(
      userId, 
      this.notifications.questCompleted(questTitle, reward)
    );
  }

  /**
   * Send level up notification
   */
  async notifyLevelUp(userId, newLevel) {
    return this.sendToUser(
      userId,
      this.notifications.levelUp(newLevel)
    );
  }

  /**
   * Send new match notification
   */
  async notifyNewMatch(userId, game, result) {
    return this.sendToUser(
      userId,
      this.notifications.newMatch(game, result)
    );
  }

  /**
   * Send achievement unlocked notification
   */
  async notifyAchievement(userId, title, description) {
    return this.sendToUser(
      userId,
      this.notifications.achievementUnlocked(title, description)
    );
  }

  /**
   * Send meme liked notification
   */
  async notifyMemeLiked(userId, username, memeTitle) {
    return this.sendToUser(
      userId,
      this.notifications.memeLiked(username, memeTitle)
    );
  }

  /**
   * Send new comment notification
   */
  async notifyNewComment(userId, username, memeTitle) {
    return this.sendToUser(
      userId,
      this.notifications.newComment(username, memeTitle)
    );
  }

  /**
   * Send friend request notification
   */
  async notifyFriendRequest(userId, username) {
    return this.sendToUser(
      userId,
      this.notifications.friendRequest(username)
    );
  }

  /**
   * Send tournament starting notification
   */
  async notifyTournamentStarting(userIds, tournamentName, time) {
    return this.sendToUsers(
      userIds,
      this.notifications.tournamentStarting(tournamentName, time)
    );
  }

  /**
   * Send daily reminder to all users
   */
  async sendDailyReminder() {
    return this.sendToAll(this.notifications.dailyReminder());
  }
}

module.exports = new PushNotificationService();
