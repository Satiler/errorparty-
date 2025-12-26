/**
 * Сервис для отправки уведомлений через Steam Bot
 */

class SteamNotificationService {
  constructor(steamBotService) {
    this.bot = steamBotService;
  }

  /**
   * Отправить отчет о Dota 2 матче
   */
  async sendDota2MatchReport(userId, steamId64, matchData, questResults) {
    try {
      const message = this.formatDota2Report(matchData, questResults);
      await this.bot.sendMessage(steamId64, message);
      console.log(`✅ Sent Dota 2 match report to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to send Dota 2 match report:', error);
      return false;
    }
  }

  /**
   * Отправить отчет о CS2 матче
   */
  async sendCS2MatchReport(userId, steamId64, matchData, questResults) {
    try {
      const message = this.formatCS2Report(matchData, questResults);
      await this.bot.sendMessage(steamId64, message);
      console.log(`✅ Sent CS2 match report to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to send CS2 match report:', error);
      return false;
    }
  }

  /**
   * Отформатировать отчет о Dota 2 матче
   */
  formatDota2Report(matchData, questResults) {
    const { 
      hero_name, win, kills, deaths, assists, duration,
      hero_damage, hero_healing, tower_damage, gold_per_min,
      last_hits, denies, xp_per_min
    } = matchData;
    
    const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists).toFixed(2);
    const durationMin = Math.floor(duration / 60);
    
    let message = `🎮 DOTA 2 MATCH REPORT\n\n`;
    
    // Эмоциональный заголовок с анализом
    if (win) {
      const victoryMessages = [
        '🏆 ПОБЕДА! Отличная игра!',
        '🏆 ПОБЕДА! Так держать!',
        '🏆 ПОБЕДА! Ты на высоте!',
        '🏆 ПОБЕДА! Красивая игра!',
        '🏆 ПОБЕДА! Продолжай в том же духе!'
      ];
      message += victoryMessages[Math.floor(Math.random() * victoryMessages.length)] + '\n\n';
    } else {
      const defeatMessages = [
        '💀 ПОРАЖЕНИЕ - но не сдавайся!',
        '💀 ПОРАЖЕНИЕ - в следующий раз повезёт!',
        '💀 ПОРАЖЕНИЕ - ты старался!',
        '💀 ПОРАЖЕНИЕ - учись на ошибках!'
      ];
      message += defeatMessages[Math.floor(Math.random() * defeatMessages.length)] + '\n\n';
    }
    
    message += `Герой: ${hero_name}\n`;
    message += `K/D/A: ${kills}/${deaths}/${assists}\n`;
    message += `KDA: ${kda}\n`;
    message += `Длительность: ${durationMin} мин\n`;
    
    // Детальная статистика
    message += `\n📊 СТАТИСТИКА:\n`;
    if (hero_damage) message += `⚔️ Урон героям: ${hero_damage.toLocaleString()}\n`;
    if (hero_healing) message += `💚 Лечение: ${hero_healing.toLocaleString()}\n`;
    if (tower_damage) message += `🏰 Урон башням: ${tower_damage.toLocaleString()}\n`;
    if (last_hits) message += `⚡ Last Hits: ${last_hits}\n`;
    if (denies) message += `🚫 Denies: ${denies}\n`;
    if (gold_per_min) message += `💰 GPM: ${gold_per_min}\n`;
    if (xp_per_min) message += `📈 XPM: ${xp_per_min}\n`;
    
    // Анализ сильных сторон
    message += `\n💪 ТВОИ СИЛЬНЫЕ СТОРОНЫ:\n`;
    const strengths = [];
    
    if (kda >= 5) strengths.push('🌟 Отличный KDA!');
    else if (kda >= 3) strengths.push('👍 Хороший KDA');
    
    if (kills >= 15) strengths.push('⚔️ Много убийств!');
    if (assists >= 20) strengths.push('🤝 Отличная поддержка команды!');
    if (deaths <= 3) strengths.push('🛡️ Мало смертей - хороший контроль!');
    
    if (hero_damage && hero_damage >= 25000) strengths.push('💥 Огромный урон по героям!');
    else if (hero_damage && hero_damage >= 15000) strengths.push('⚔️ Высокий урон');
    
    if (hero_healing && hero_healing >= 10000) strengths.push('💚 Отличная поддержка - много лечения!');
    
    if (tower_damage && tower_damage >= 5000) strengths.push('🏰 Хороший пуш!');
    
    if (last_hits >= 200) strengths.push('💰 Отличный фарм!');
    else if (last_hits >= 100) strengths.push('⚡ Хороший фарм');
    
    if (gold_per_min >= 600) strengths.push('💎 Отличная экономика!');
    
    if (strengths.length > 0) {
      message += strengths.join('\n') + '\n';
    } else {
      if (!win) {
        message += '💪 Не получилось в этот раз, но опыт - лучший учитель!\n';
      } else {
        message += '✨ Главное - вклад в победу команды!\n';
      }
    }
    
    // Мотивация при поражении
    if (!win && strengths.length > 0) {
      message += `\n🔥 Ты играл хорошо, но команде не хватило синергии. Продолжай!\n`;
    }

    // Прогресс по квестам - questResults это объект с массивом questResults
    if (questResults && questResults.questResults && questResults.questResults.length > 0) {
      message += `\n📋 ПРОГРЕСС ПО КВЕСТАМ:\n\n`;
      
      for (const result of questResults.questResults) {
        const { quest, oldProgress, newProgress, completed, xpEarned } = result;
        
        if (completed) {
          message += `✅ ${quest.icon || '🎯'} ${quest.title}\n`;
          message += `   КВЕСТ ЗАВЕРШЕН! +${xpEarned} XP\n\n`;
        } else if (newProgress > oldProgress) {
          const targetValue = quest.requirement?.value || 1;
          const percent = Math.round((newProgress / targetValue) * 100);
          message += `📈 ${quest.icon || '•'} ${quest.title}\n`;
          message += `   ${newProgress}/${targetValue} (${percent}%)\n`;
          if (xpEarned > 0) {
            message += `   +${xpEarned} XP\n`;
          }
          message += `\n`;
        }
      }
    }

    // Статистика уровня
    if (questResults && questResults.levelInfo) {
      const { oldLevel, newLevel, oldXP, newXP, xpNeeded } = questResults.levelInfo;
      
      if (newLevel > oldLevel) {
        message += `\n🎉 LEVEL UP! ${oldLevel} → ${newLevel}\n`;
      }
      
      message += `\nУровень: ${newLevel}\n`;
      message += `XP: ${newXP}/${xpNeeded}\n`;
    }

    return message;
  }

  /**
   * Отформатировать отчет о CS2 матче
   */
  formatCS2Report(matchData, questResults) {
    const { map_name, win, kills, deaths, assists, mvps, score } = matchData;
    const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists).toFixed(2);
    
    let message = `🔫 CS2 MATCH REPORT\n\n`;
    message += `${win ? '🏆 ПОБЕДА' : '💀 ПОРАЖЕНИЕ'}\n\n`;
    message += `Карта: ${map_name}\n`;
    message += `Счёт: ${score}\n`;
    message += `K/D/A: ${kills}/${deaths}/${assists}\n`;
    message += `KDA: ${kda}\n`;
    message += `MVP: ${mvps}\n`;

    // Прогресс по квестам
    if (questResults && questResults.length > 0) {
      message += `\n📋 ПРОГРЕСС ПО КВЕСТАМ:\n\n`;
      
      for (const result of questResults) {
        const { quest, oldProgress, newProgress, completed, xpEarned } = result;
        
        if (completed) {
          message += `✅ ${quest.emoji || '🎯'} ${quest.title}\n`;
          message += `   КВЕСТ ЗАВЕРШЕН! +${xpEarned} XP\n\n`;
        } else if (newProgress > oldProgress) {
          const percent = Math.round((newProgress / quest.target_value) * 100);
          message += `📈 ${quest.emoji || '•'} ${quest.title}\n`;
          message += `   ${newProgress}/${quest.target_value} (${percent}%)\n`;
          if (xpEarned > 0) {
            message += `   +${xpEarned} XP\n`;
          }
          message += `\n`;
        }
      }
    }

    // Статистика уровня
    if (questResults && questResults.levelInfo) {
      const { oldLevel, newLevel, oldXP, newXP, xpNeeded } = questResults.levelInfo;
      
      if (newLevel > oldLevel) {
        message += `\n🎉 LEVEL UP! ${oldLevel} → ${newLevel}\n`;
      }
      
      message += `\nУровень: ${newLevel}\n`;
      message += `XP: ${newXP}/${xpNeeded}\n`;
    }

    return message;
  }

  /**
   * Отправить уведомление о завершении квеста
   */
  async sendQuestCompletedNotification(userId, steamId64, questData) {
    try {
      const { title, emoji, xp_reward } = questData;
      
      let message = `🎉 КВЕСТ ЗАВЕРШЕН!\n\n`;
      message += `${emoji || '🎯'} ${title}\n`;
      message += `+${xp_reward} XP\n\n`;
      message += `Выбери новый квест на сайте!`;
      
      await this.bot.sendMessage(steamId64, message);
      console.log(`✅ Sent quest completion notification to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to send quest completion:', error);
      return false;
    }
  }

  /**
   * Отправить уведомление о повышении уровня
   */
  async sendLevelUpNotification(userId, steamId64, oldLevel, newLevel, rewards) {
    try {
      let message = `🎉 LEVEL UP!\n\n`;
      message += `${oldLevel} → ${newLevel}\n\n`;
      
      if (rewards && rewards.length > 0) {
        message += `Получены награды:\n`;
        for (const reward of rewards) {
          message += `${reward.emoji || '🎁'} ${reward.name}\n`;
        }
      }
      
      await this.bot.sendMessage(steamId64, message);
      console.log(`✅ Sent level up notification to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to send level up notification:', error);
      return false;
    }
  }
}

module.exports = SteamNotificationService;
