/**
 * Сервис для отправки уведомлений пользователям в TeamSpeak
 */

const teamspeakService = require('./teamspeakService');
const { User } = require('../models');

class TeamspeakNotificationService {
  /**
   * Отправить отчёт о матче Dota 2 пользователю
   */
  async sendDota2MatchReport(userId, matchData, questResult) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user || !user.teamspeakUid) {
        console.log(`⚠️ Пользователь ${userId} не связан с TeamSpeak`);
        return false;
      }

      // Проверяем, онлайн ли пользователь
      const clients = await teamspeakService.getOnlineClients();
      const client = clients.find(c => c.client_unique_identifier === user.teamspeakUid);

      if (!client) {
        console.log(`⚠️ Пользователь ${user.username} не онлайн в TeamSpeak`);
        return false;
      }

      // Формируем отчёт
      const report = this.formatDota2Report(matchData, questResult);
      
      // Отправляем сообщение
      await teamspeakService.sendMessageToClient(client.clid, report);
      
      console.log(`✅ Отчёт о матче отправлен пользователю ${user.username} в TeamSpeak`);
      return true;

    } catch (error) {
      console.error('Error sending Dota2 match report:', error);
      return false;
    }
  }

  /**
   * Форматирование отчёта о матче Dota 2
   */
  formatDota2Report(matchData, questResult) {
    const isWin = matchData.isWin;
    const kda = matchData.deaths > 0 
      ? ((matchData.kills + matchData.assists) / matchData.deaths).toFixed(2)
      : (matchData.kills + matchData.assists);

    const duration = Math.floor(matchData.duration / 60);
    
    let report = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += `🎮 ОТЧЁТ О МАТЧЕ DOTA 2\n`;
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    // Результат
    report += isWin ? '✅ ПОБЕДА!\n' : '❌ Поражение\n';
    report += `⏱️ Длительность: ${duration} мин\n\n`;
    
    // Статистика
    report += '📊 СТАТИСТИКА:\n';
    report += `💀 K/D/A: ${matchData.kills}/${matchData.deaths}/${matchData.assists}\n`;
    report += `📈 KDA: ${kda}\n`;
    report += `⚔️ Last Hits: ${matchData.last_hits || 0}\n`;
    report += `🚫 Denies: ${matchData.denies || 0}\n`;
    report += `💰 GPM: ${matchData.gold_per_min || 0}\n`;
    report += `⚡ XPM: ${matchData.xp_per_min || 0}\n`;
    
    if (matchData.hero_damage) {
      report += `💥 Урон героям: ${Math.floor(matchData.hero_damage).toLocaleString()}\n`;
    }
    
    if (matchData.tower_damage) {
      report += `🏰 Урон по башням: ${Math.floor(matchData.tower_damage).toLocaleString()}\n`;
    }

    // Квесты
    if (questResult && questResult.completedQuests && questResult.completedQuests.length > 0) {
      report += '\n🎯 КВЕСТЫ ВЫПОЛНЕНЫ:\n';
      questResult.completedQuests.forEach(quest => {
        report += `✅ ${quest.title}\n`;
        report += `   +${quest.reward.xp} XP, +${quest.reward.coins} монет\n`;
      });
      
      report += `\n💫 Всего получено: +${questResult.totalXp} XP\n`;
      
      if (questResult.leveledUp) {
        report += `\n🎉 НОВЫЙ УРОВЕНЬ: ${questResult.newLevel}! 🎉\n`;
      }
    } else {
      report += '\n📋 Активные квесты не завершены\n';
    }

    report += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '🌐 Подробности на errorparty.ru\n';
    
    return report;
  }

  /**
   * Отправить отчёт о матче CS2 пользователю
   */
  async sendCS2MatchReport(userId, matchData, questResult) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user || !user.teamspeakUid) {
        console.log(`⚠️ Пользователь ${userId} не связан с TeamSpeak`);
        return false;
      }

      const clients = await teamspeakService.getOnlineClients();
      const client = clients.find(c => c.client_unique_identifier === user.teamspeakUid);

      if (!client) {
        console.log(`⚠️ Пользователь ${user.username} не онлайн в TeamSpeak`);
        return false;
      }

      const report = this.formatCS2Report(matchData, questResult);
      await teamspeakService.sendMessageToClient(client.clid, report);
      
      console.log(`✅ Отчёт о CS2 матче отправлен пользователю ${user.username} в TeamSpeak`);
      return true;

    } catch (error) {
      console.error('Error sending CS2 match report:', error);
      return false;
    }
  }

  /**
   * Форматирование отчёта о матче CS2
   */
  formatCS2Report(matchData, questResult) {
    const isWin = matchData.isWin;
    const kd = matchData.deaths > 0 
      ? (matchData.kills / matchData.deaths).toFixed(2)
      : matchData.kills;

    let report = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += `🎮 ОТЧЁТ О МАТЧЕ CS2\n`;
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    report += isWin ? '✅ ПОБЕДА!\n' : '❌ Поражение\n';
    report += `🗺️ Карта: ${matchData.map || 'Unknown'}\n`;
    report += `📊 Счёт: ${matchData.roundsWon || 0}-${matchData.roundsPlayed - matchData.roundsWon || 0}\n\n`;
    
    report += '📊 СТАТИСТИКА:\n';
    report += `💀 K/D/A: ${matchData.kills}/${matchData.deaths}/${matchData.assists}\n`;
    report += `📈 K/D: ${kd}\n`;
    report += `🎯 HS%: ${matchData.headshotPercentage || 0}%\n`;
    report += `💥 ADR: ${Math.floor(matchData.adr || 0)}\n`;
    report += `⭐ MVP: ${matchData.mvps || 0}\n`;

    if (questResult && questResult.completedQuests && questResult.completedQuests.length > 0) {
      report += '\n🎯 КВЕСТЫ ВЫПОЛНЕНЫ:\n';
      questResult.completedQuests.forEach(quest => {
        report += `✅ ${quest.title}\n`;
        report += `   +${quest.reward.xp} XP, +${quest.reward.coins} монет\n`;
      });
      
      report += `\n💫 Всего получено: +${questResult.totalXp} XP\n`;
      
      if (questResult.leveledUp) {
        report += `\n🎉 НОВЫЙ УРОВЕНЬ: ${questResult.newLevel}! 🎉\n`;
      }
    } else {
      report += '\n📋 Активные квесты не завершены\n';
    }

    report += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '🌐 Подробности на errorparty.ru\n';
    
    return report;
  }

  /**
   * Отправить информацию о прогрессе квестов
   */
  async sendQuestProgress(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user || !user.teamspeakUid) {
        return false;
      }

      const clients = await teamspeakService.getOnlineClients();
      const client = clients.find(c => c.client_unique_identifier === user.teamspeakUid);

      if (!client) {
        return false;
      }

      const { getUserQuests } = require('./questService');
      const { UserStats } = require('../models');
      
      const dota2Quests = await getUserQuests(userId, 'dota2');
      const cs2Quests = await getUserQuests(userId, 'cs2');
      const stats = await UserStats.findOne({ where: { userId } });

      let report = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      report += `📋 ПРОГРЕСС КВЕСТОВ\n`;
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      
      if (stats) {
        report += `⭐ Уровень: ${stats.level}\n`;
        report += `💫 Опыт: ${stats.experience} XP\n`;
        report += `💰 Монеты: ${stats.coins}\n\n`;
      }

      if (dota2Quests.length > 0) {
        report += '🎮 DOTA 2:\n';
        dota2Quests.slice(0, 5).forEach(q => {
          const progress = Math.min(100, Math.floor((q.progress / q.quest.requirement.value) * 100));
          report += `${q.quest.icon} ${q.quest.title}\n`;
          report += `   📊 ${progress}% (${q.progress}/${q.quest.requirement.value})\n`;
        });
        report += '\n';
      }

      if (cs2Quests.length > 0) {
        report += '🔫 CS2:\n';
        cs2Quests.slice(0, 5).forEach(q => {
          const progress = Math.min(100, Math.floor((q.progress / q.quest.requirement.value) * 100));
          report += `${q.quest.icon} ${q.quest.title}\n`;
          report += `   📊 ${progress}% (${q.progress}/${q.quest.requirement.value})\n`;
        });
      }

      if (dota2Quests.length === 0 && cs2Quests.length === 0) {
        report += '⚠️ У вас нет активных квестов\n';
        report += '💡 Возьмите квесты на сайте!\n';
      }

      report += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      report += '🌐 errorparty.ru/quests\n';

      await teamspeakService.sendMessageToClient(client.clid, report);
      console.log(`✅ Прогресс квестов отправлен пользователю ${user.username}`);
      return true;

    } catch (error) {
      console.error('Error sending quest progress:', error);
      return false;
    }
  }

  /**
   * Отправить уведомление о повышении уровня
   */
  async sendLevelUpNotification(userId, newLevel, rewards) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user || !user.teamspeakUid) {
        return false;
      }

      const clients = await teamspeakService.getOnlineClients();
      const client = clients.find(c => c.client_unique_identifier === user.teamspeakUid);

      if (!client) {
        return false;
      }

      let message = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      message += `🎉 ПОЗДРАВЛЯЕМ! 🎉\n`;
      message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      message += `⭐ Вы достигли уровня ${newLevel}!\n\n`;
      
      if (rewards && rewards.tsRole) {
        message += `🎖️ Новая роль в TeamSpeak:\n`;
        message += `   "${rewards.tsRole}"\n\n`;
      }

      message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      message += '🌐 errorparty.ru\n';

      await teamspeakService.sendMessageToClient(client.clid, message);
      console.log(`✅ Уведомление о уровне ${newLevel} отправлено ${user.username}`);
      return true;

    } catch (error) {
      console.error('Error sending level up notification:', error);
      return false;
    }
  }
}

module.exports = new TeamspeakNotificationService();
