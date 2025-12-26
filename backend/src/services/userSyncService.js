const User = require('../models/User');
const LinkToken = require('../models/LinkToken');
const teamspeakService = require('./teamspeakService');
const { Op } = require('sequelize');

/**
 * Сервис синхронизации пользователей между сайтом и TeamSpeak
 */
class UserSyncService {
  /**
   * Попытка автоматической связки пользователя с TeamSpeak клиентом
   * @param {Object} user - Объект пользователя из БД
   * @returns {Promise<boolean>} - true если связка успешна
   */
  async linkUserWithTeamSpeak(user) {
    try {
      if (!user.steamId) {
        console.log(`User ${user.username} has no Steam ID, skipping TS sync`);
        return false;
      }

      // Получаем список всех клиентов TeamSpeak
      const clients = await teamspeakService.getOnlineClients();
      
      if (!clients || clients.length === 0) {
        console.log('No TeamSpeak clients online');
        return false;
      }

      // Пытаемся найти клиента по разным критериям
      const matchedClient = this.findMatchingClient(clients, user);
      
      if (matchedClient) {
        // Сохраняем UID клиента TeamSpeak
        await user.update({
          teamspeakUid: matchedClient.client_unique_identifier
        });
        
        console.log(`✅ Linked user ${user.username} with TS client ${matchedClient.client_nickname}`);
        return true;
      } else {
        console.log(`⚠️ No matching TS client found for user ${user.username}`);
        return false;
      }
    } catch (error) {
      console.error('Error linking user with TeamSpeak:', error);
      return false;
    }
  }

  /**
   * Поиск подходящего TS клиента для пользователя
   * @param {Array} clients - Список TS клиентов
   * @param {Object} user - Пользователь
   * @returns {Object|null} - Найденный клиент или null
   */
  findMatchingClient(clients, user) {
    // Приоритет 1: Точное совпадение username
    let match = clients.find(client => 
      client.client_nickname?.toLowerCase() === user.username.toLowerCase()
    );
    if (match) {
      console.log(`Match found by exact username: ${match.client_nickname}`);
      return match;
    }

    // Приоритет 2: Username содержится в нике TS
    match = clients.find(client => 
      client.client_nickname?.toLowerCase().includes(user.username.toLowerCase())
    );
    if (match) {
      console.log(`Match found by username inclusion: ${match.client_nickname}`);
      return match;
    }

    // Приоритет 3: Steam ID в описании клиента (если сервер поддерживает)
    if (user.steamId) {
      match = clients.find(client => 
        client.client_description?.includes(user.steamId)
      );
      if (match) {
        console.log(`Match found by Steam ID in description: ${match.client_nickname}`);
        return match;
      }
    }

    return null;
  }

  /**
   * Синхронизация времени онлайн для пользователя
   * @param {string} teamspeakUid - UID клиента TeamSpeak
   * @param {number} onlineTime - Время онлайн в секундах
   */
  async updateOnlineTime(teamspeakUid, onlineTime) {
    try {
      const user = await User.findOne({ where: { teamspeakUid } });
      
      if (user) {
        // Обновляем общее время онлайн
        await user.update({
          totalOnlineTime: user.totalOnlineTime + onlineTime,
          lastSeen: new Date()
        });
        
        // Обновляем активность за сегодня
        const UserActivity = require('../models/UserActivity');
        const today = new Date().toISOString().split('T')[0];
        
        const [activity, created] = await UserActivity.findOrCreate({
          where: {
            userId: user.id,
            date: today
          },
          defaults: {
            voiceTime: 0,
            connections: 0
          }
        });
        
        // Добавляем время к сегодняшней активности
        await activity.increment('voiceTime', { by: onlineTime });
        
        console.log(`Updated online time for ${user.username}: +${onlineTime}s (${created ? 'created new' : 'updated existing'} activity for ${today})`);
      }
    } catch (error) {
      console.error('Error updating online time:', error);
    }
  }

  /**
   * Обновление статуса "последний раз онлайн" при отключении
   * @param {string} teamspeakUid - UID клиента TeamSpeak
   */
  async updateLastSeen(teamspeakUid) {
    try {
      const user = await User.findOne({ where: { teamspeakUid } });
      
      if (user) {
        await user.update({
          lastSeen: new Date()
        });
        
        console.log(`Updated last seen for ${user.username}`);
      }
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  /**
   * Увеличить счетчик подключений за день
   * @param {string} teamspeakUid - UID клиента TeamSpeak
   */
  async incrementDailyConnections(teamspeakUid) {
    try {
      const user = await User.findOne({ where: { teamspeakUid } });
      
      if (user) {
        const UserActivity = require('../models/UserActivity');
        const today = new Date().toISOString().split('T')[0];
        
        const [activity, created] = await UserActivity.findOrCreate({
          where: {
            userId: user.id,
            date: today
          },
          defaults: {
            voiceTime: 0,
            connections: 1
          }
        });
        
        if (!created) {
          await activity.increment('connections');
        }
        
        console.log(`Incremented connections for ${user.username} on ${today}`);
      }
    } catch (error) {
      console.error('Error incrementing daily connections:', error);
    }
  }

  /**
   * Попытка связать всех пользователей с Steam ID с TS клиентами
   */
  async syncAllUsers() {
    try {
      // Получаем всех пользователей с Steam ID, но без TS UID
      const users = await User.findAll({
        where: {
          steamId: { [require('sequelize').Op.ne]: null },
          teamspeakUid: null
        }
      });

      console.log(`Found ${users.length} users to sync with TeamSpeak`);

      for (const user of users) {
        await this.linkUserWithTeamSpeak(user);
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ User sync completed');
    } catch (error) {
      console.error('Error syncing all users:', error);
    }
  }

  /**
   * Получить информацию о пользователе с данными из TeamSpeak
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} - Пользователь с TS данными
   */
  async getUserWithTeamSpeakInfo(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user || !user.teamspeakUid) {
        return user;
      }

      // Проверяем, онлайн ли пользователь в TS сейчас
      const clients = await teamspeakService.getOnlineClients();
      const tsClient = clients.find(c => c.client_unique_identifier === user.teamspeakUid);

      return {
        ...user.toJSON(),
        teamspeak: {
          isOnline: !!tsClient,
          nickname: tsClient?.client_nickname || null,
          channelId: tsClient?.cid || null,
          idleTime: tsClient?.client_idle_time || 0
        }
      };
    } catch (error) {
      console.error('Error getting user with TS info:', error);
      return user;
    }
  }

  /**
   * Связать пользователя с TeamSpeak по токену
   * @param {string} token - Токен связывания
   * @param {string} teamspeakUid - UID клиента TeamSpeak
   * @param {string} clientNickname - Ник клиента в TeamSpeak
   * @returns {Promise<Object>} - Результат связывания
   */
  async linkUserByToken(token, teamspeakUid, clientNickname) {
    try {
      // Находим токен
      const linkToken = await LinkToken.findOne({
        where: {
          token,
          isUsed: false,
          expiresAt: { [Op.gt]: new Date() }
        }
      });

      if (!linkToken) {
        return {
          success: false,
          message: '❌ Токен не найден или истёк. Попробуйте сгенерировать новый на сайте.'
        };
      }

      // Находим пользователя
      const user = await User.findByPk(linkToken.userId);

      if (!user) {
        return {
          success: false,
          message: '❌ Пользователь не найден.'
        };
      }

      // Проверяем, не связан ли уже
      if (user.teamspeakUid) {
        return {
          success: false,
          message: '❌ Этот аккаунт уже связан с другим TeamSpeak клиентом.'
        };
      }

      // Сохраняем связку
      await user.update({
        teamspeakUid
      });

      // Помечаем токен как использованный
      await linkToken.update({
        isUsed: true,
        teamspeakUid
      });

      console.log(`✅ Linked user ${user.username} with TS client ${clientNickname} (UID: ${teamspeakUid})`);

      return {
        success: true,
        message: `✅ Аккаунт успешно связан! Добро пожаловать, ${user.username}!`,
        username: user.username,
        steamUsername: user.username
      };
    } catch (error) {
      console.error('Error linking user by token:', error);
      return {
        success: false,
        message: '❌ Ошибка при связывании аккаунта.'
      };
    }
  }
}

module.exports = new UserSyncService();
