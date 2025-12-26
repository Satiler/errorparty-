const { User, CS2Match } = require('../models');
const { updateQuestProgress } = require('../services/questService');

// Хранилище активных матчей в памяти (для live tracking)
const activeMatches = new Map();

/**
 * Endpoint для Game State Integration CS2
 * Клиент CS2 отправляет данные в реальном времени
 */
const handleGSI = async (req, res) => {
  try {
    const gsiData = req.body;
    
    // Сразу отправляем 200 OK для быстрого ответа
    res.status(200).json({ success: true, message: 'GSI data received' });
    
    const mapPhase = gsiData.map?.phase;
    const playerData = gsiData.player;
    const steamId = playerData?.steamid;
    
    // Логируем ВСЕ фазы и steamId для отладки
    console.log(`🔍 [GSI] Received: steamId=${steamId}, mapPhase=${mapPhase}, timestamp=${new Date().toISOString()}`);
    
    // КРИТИЧЕСКАЯ ОТЛАДКА: логируем всю структуру gsiData
    if (!mapPhase) {
      console.log(`⚠️ [GSI] mapPhase is undefined! Checking gsiData structure...`);
      console.log(`📦 [GSI] gsiData keys:`, Object.keys(gsiData).join(', '));
      if (gsiData.map) {
        console.log(`🗺️ [GSI] map keys:`, Object.keys(gsiData.map).join(', '));
        console.log(`🗺️ [GSI] map data:`, JSON.stringify(gsiData.map));
      }
      if (gsiData.round) {
        console.log(`🔄 [GSI] round data:`, JSON.stringify(gsiData.round));
      }
    }
    
    // Дополнительное логирование для важных фаз
    if (mapPhase === 'over') {
      console.log(`🏁 [GSI] !!!MATCH END DETECTED!!! steamId=${steamId}`);
    } else if (mapPhase === 'live') {
      console.log(`🎮 [GSI] Live match active for steamId=${steamId}`);
    } else if (mapPhase === 'warmup') {
      console.log(`🔥 [GSI] Warmup phase for steamId=${steamId}`);
    }
    
    // Очистка старых матчей (старше 10 минут)
    await cleanupOldMatches();
    
    // Обрабатываем live данные (во время игры)
    // Проверяем несколько условий для определения активной игры
    const matchStats = playerData?.match_stats;
    const isLive = mapPhase === 'live' || (!mapPhase && playerData && matchStats && steamId);
    if (isLive && matchStats) {
      await handleLiveMatch(gsiData);
    }
    
    // Обрабатываем конец матча (фаза "over" ИЛИ "gameover")
    // Также проверяем round.phase === 'over'
    const isMatchEnd = mapPhase === 'over' || 
                       mapPhase === 'gameover' || 
                       gsiData.round?.phase === 'over';
    
    if (isMatchEnd && playerData && steamId) {
      console.log(`🏁 [GSI] Match ended for ${steamId}, saving to database...`);
      await handleMatchEnd(gsiData);
      // Сразу очищаем матч после сохранения
      cleanupPlayerMatches(steamId);
    }
    
    // Очищаем завершенные матчи (warmup = начало новой игры)
    if (mapPhase === 'warmup' || mapPhase === 'intermission') {
      if (steamId) {
        console.log(`🧹 [GSI] Cleaning up matches for ${steamId} (phase: ${mapPhase})`);
        cleanupPlayerMatches(steamId);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка GSI:', error);
    // Не отправляем ошибку клиенту, чтобы не блокировать игру
  }
};

/**
 * Очистка старых матчей из памяти
 * Сохраняет несохранённые матчи перед удалением
 */
async function cleanupOldMatches() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 минут
  const matchEndAge = 3 * 60 * 1000; // 3 минуты без обновлений = матч закончился
  
  for (const [key, match] of activeMatches.entries()) {
    const age = now - match.lastUpdate;
    
    // Если матч не обновлялся 3 минуты И имеет статистику - сохраняем как завершённый
    if (age > matchEndAge && age < maxAge && !match.savedToDb && match.kills > 0) {
      console.log(`🏁 [GSI] Auto-saving match after 3min inactivity: ${key}`);
      console.log(`📊 [GSI] Match stats: K/D/A ${match.kills}/${match.deaths}/${match.assists}, Rounds: ${match.roundWins}-${match.roundLosses}`);
      
      try {
        // Получаем пользователя
        const user = await User.findOne({ where: { steamId: match.steamId } });
        if (user) {
          await saveMatchFromMemory(match, user);
        }
      } catch (err) {
        console.error(`❌ [GSI] Error auto-saving match:`, err.message);
      }
    }
    
    // Полное удаление старых матчей (старше 10 минут)
    if (age > maxAge) {
      console.log(`🧹 [GSI] Найден старый матч (${key}), возраст: ${Math.round(age / 1000 / 60)} мин`);
      
      // Если матч не был сохранён в БД, попытаемся его сохранить
      if (!match.savedToDb && match.steamId) {
        console.log(`💾 [GSI] Попытка сохранить несохранённый старый матч: ${key}`);
        try {
          await saveUnfinishedMatch(match);
        } catch (err) {
          console.error(`❌ [GSI] Ошибка сохранения старого матча:`, err.message);
        }
      }
      
      activeMatches.delete(key);
      console.log(`🧹 [GSI] Удален старый матч: ${key}`);
    }
  }
}

/**
 * Сохранение матча из памяти (когда фаза "over" не пришла)
 */
async function saveMatchFromMemory(match, user) {
  try {
    const kills = match.kills || 0;
    const deaths = match.deaths || 0;
    const assists = match.assists || 0;
    const roundsWon = match.roundWins || 0;
    const roundsLost = match.roundLosses || 0;
    const roundsPlayed = roundsWon + roundsLost;
    const isWin = roundsWon > roundsLost;
    
    // Не сохраняем матчи с нулевой статистикой
    if (kills === 0 && deaths === 0 && assists === 0 && roundsPlayed === 0) {
      console.log(`⏭️ [GSI] Пропускаем матч без статистики`);
      return;
    }
    
    console.log(`💾 [GSI] Сохраняем матч из памяти: Map=${match.mapName}, K/D/A=${kills}/${deaths}/${assists}`);
    
    // Проверяем дубликаты
    const recentMatch = await CS2Match.findOne({
      where: {
        userId: user.id,
        source: 'gsi',
        map: match.mapName,
        playedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 60000)
        }
      }
    });
    
    if (recentMatch) {
      console.log(`⚠️ [GSI] Матч уже сохранён (ID: ${recentMatch.id}), пропускаем`);
      match.savedToDb = true;
      return;
    }
    
    const cs2Match = await CS2Match.create({
      userId: user.id,
      kills,
      deaths,
      assists,
      headshots: 0,
      damage: 0,
      mvps: match.mvps || 0,
      roundsPlayed,
      roundsWon,
      isWin,
      map: match.mapName,
      headshotPercentage: 0,
      adr: 0,
      source: 'gsi',
      playedAt: match.startedAt || new Date(),
      gsiData: {
        autoSaved: true,
        reason: 'No "over" phase received, auto-saved after inactivity',
        lastUpdate: new Date(match.lastUpdate),
        ...match.gsiData
      }
    });
    
    // Обновляем квесты
    const matchData = {
      isWin,
      kills,
      deaths,
      assists,
      headshots: 0,
      damage: 0,
      mvps: match.mvps || 0,
      rounds_won: roundsWon,
      rounds_played: roundsPlayed,
      adr: 0
    };
    
    try {
      const questResult = await updateQuestProgress(user.id, matchData, 'cs2');
      console.log(`📊 [GSI] Квесты обновлены: ${questResult.completedQuests.length} завершено, +${questResult.totalXp} XP`);
    } catch (questError) {
      console.error('❌ [GSI] Ошибка обновления квестов:', questError.message);
    }
    
    console.log(`✅ [GSI] Матч автоматически сохранён (ID: ${cs2Match.id}) для ${user.username}`);
    match.savedToDb = true;
    
  } catch (error) {
    console.error(`❌ [GSI] Ошибка сохранения матча из памяти:`, error.message);
    throw error;
  }
}

/**
 * Сохранение незавершённого матча (когда игрок вышел без фазы "over")
 */
async function saveUnfinishedMatch(match) {
  try {
    const user = await User.findOne({ where: { steamId: match.steamId } });
    
    if (!user) {
      console.log(`⚠️ [GSI] Пользователь не найден для сохранения незавершённого матча: ${match.steamId}`);
      return;
    }
    
    const kills = match.kills || 0;
    const deaths = match.deaths || 0;
    const assists = match.assists || 0;
    const roundsWon = match.roundWins || 0;
    const roundsLost = match.roundLosses || 0;
    const roundsPlayed = roundsWon + roundsLost;
    
    // Не сохраняем матчи с нулевой статистикой (warmup)
    if (kills === 0 && deaths === 0 && assists === 0 && roundsPlayed === 0) {
      console.log(`⏭️ [GSI] Пропускаем матч без статистики (warmup): ${match.steamId}`);
      return;
    }
    
    console.log(`💾 [GSI] Сохраняем незавершённый матч: Map=${match.mapName}, K/D/A=${kills}/${deaths}/${assists}`);
    
    const cs2Match = await CS2Match.create({
      userId: user.id,
      kills,
      deaths,
      assists,
      headshots: 0,
      damage: 0,
      mvps: match.mvps || 0,
      roundsPlayed,
      roundsWon,
      isWin: roundsWon > roundsLost,
      map: match.mapName,
      headshotPercentage: 0,
      adr: 0,
      source: 'gsi',
      playedAt: match.startedAt || new Date(),
      gsiData: {
        incomplete: true, // Помечаем как незавершённый
        reason: 'Player left before match end',
        lastUpdate: new Date(match.lastUpdate)
      }
    });
    
    console.log(`✅ [GSI] Незавершённый матч сохранён (ID: ${cs2Match.id})`);
    match.savedToDb = true;
    
  } catch (error) {
    console.error(`❌ [GSI] Ошибка сохранения незавершённого матча:`, error.message);
    throw error;
  }
}

/**
 * Очистка матчей конкретного игрока
 */
function cleanupPlayerMatches(steamId) {
  let deleted = 0;
  for (const [key, match] of activeMatches.entries()) {
    if (match.steamId === steamId) {
      console.log(`🧹 [GSI] Удален матч игрока: ${key}`);
      activeMatches.delete(key);
      deleted++;
    }
  }
  if (deleted > 0) {
    console.log(`🧹 [GSI] Всего удалено матчей для ${steamId}: ${deleted}, осталось: ${activeMatches.size}`);
  }
}

/**
 * Обработка live матча (во время игры)
 */
async function handleLiveMatch(gsiData) {
  const playerData = gsiData.player;
  const mapData = gsiData.map;
  
  // Проверяем наличие всех необходимых данных
  if (!playerData || !playerData.steamid || !playerData.match_stats) {
    console.log(`⚠️ [GSI] handleLiveMatch: missing required data`);
    return;
  }
  
  const matchStats = playerData.match_stats;
  const playerState = playerData.state;
  
  if (!matchStats) return;
  
  const steamId = playerData.steamid;
  const rawMapName = mapData?.name || 'unknown';
  // Убираем префиксы de_, cs_, и делаем первую букву заглавной
  const mapName = rawMapName
    .replace(/^(de_|cs_)/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const matchKey = `${steamId}_current`;
  
  console.log(`🔍 [GSI] handleLiveMatch: steamId=${steamId}, key=${matchKey}, activeMatches.size=${activeMatches.size}`);
  
  // Обновляем или создаем активный матч
  let match = activeMatches.get(matchKey);
  
  if (!match) {
    match = {
      steamId,
      mapName,
      rawMapName,
      team: playerData.team,
      startedAt: new Date(),
      savedToDb: false // Флаг для отслеживания сохранения в БД
    };
    activeMatches.set(matchKey, match);
    console.log(`🎮 [GSI] Начат матч: ${mapName} для Steam ID ${steamId}`);
  }
  
  // Обновляем имя карты на случай изменения
  match.mapName = mapName;
  match.rawMapName = rawMapName;
  
  // Обновляем полную live статистику
  match.kills = matchStats.kills || 0;
  match.deaths = matchStats.deaths || 0;
  match.assists = matchStats.assists || 0;
  match.mvps = matchStats.mvps || 0;
  match.score = matchStats.score || 0;
  match.team = playerData.team || match.team;
  
  // Добавляем информацию о раундах и счете
  match.roundWins = mapData?.team_ct?.score || 0;
  match.roundLosses = mapData?.team_t?.score || 0;
  
  // Если игрок в команде CT/T, корректируем счет
  if (playerData.team === 'CT') {
    match.roundWins = mapData?.team_ct?.score || 0;
    match.roundLosses = mapData?.team_t?.score || 0;
  } else if (playerData.team === 'T') {
    match.roundWins = mapData?.team_t?.score || 0;
    match.roundLosses = mapData?.team_ct?.score || 0;
  }
  
  // Добавляем информацию о текущем состоянии
  match.health = playerState?.health || 0;
  match.armor = playerState?.armor || 0;
  match.helmet = playerState?.helmet || false;
  match.money = playerState?.money || 0;
  match.equipValue = playerState?.equip_value || 0;
  match.roundKills = playerState?.round_kills || 0;
  match.roundKillhs = playerState?.round_killhs || 0;
  
  // Информация о фазе раунда и времени
  match.phase = mapData?.phase || 'unknown';
  match.roundPhase = mapData?.round?.phase || 'unknown';
  
  // Оружие (активное)
  if (playerData.weapons) {
    const activeWeapon = Object.values(playerData.weapons).find(w => w.state === 'active');
    if (activeWeapon) {
      match.activeWeapon = activeWeapon.name?.replace('weapon_', '') || 'knife';
    }
  }
  
  // Обновляем timestamp последнего обновления
  match.lastUpdate = Date.now();
  
  // Сохраняем полные GSI данные для детальной статистики
  match.gsiData = {
    player: playerData,
    map: mapData,
    allplayers: gsiData.allplayers || {},
    bomb: gsiData.bomb,
    round: gsiData.round,
    phase_countdowns: gsiData.phase_countdowns
  };
  
  // Логируем количество игроков для отладки
  const playersCount = Object.keys(gsiData.allplayers || {}).length;
  if (playersCount > 0) {
    console.log(`👥 [GSI] Players in match: ${playersCount}`);
    // Логируем имена игроков для проверки
    const playerNames = Object.values(gsiData.allplayers || {}).map(p => p.name).join(', ');
    console.log(`👤 [GSI] Players: ${playerNames}`);
  } else {
    console.log(`⚠️ [GSI] No allplayers data available (observer mode or warmup?)`);
    // Логируем доступные ключи в gsiData для отладки
    console.log(`🔑 [GSI] Available keys in gsiData:`, Object.keys(gsiData).join(', '));
  }
  
  console.log(`📊 [GSI LIVE] ${steamId}: ${match.mapName} | ${match.roundWins}-${match.roundLosses} | K/D/A: ${match.kills}/${match.deaths}/${match.assists} | HP:${match.health} Money:$${match.money}`);
}

/**
 * Обработка завершения матча
 */
async function handleMatchEnd(gsiData) {
  const player = gsiData.player;
  const matchStats = player?.match_stats;
  const mapData = gsiData.map;
  
  if (!player || !matchStats) return;
  
  const steamId = player.steamid;
  const user = await User.findOne({ where: { steamId } });
  
  if (!user) {
    console.log(`⚠️ [GSI] Пользователь с Steam ID ${steamId} не найден`);
    return;
  }
  
  const matchKey = `${steamId}_current`;
  const activeMatch = activeMatches.get(matchKey);
  
  // Форматируем имя карты так же, как в handleLiveMatch
  const rawMapName = mapData?.name || activeMatch?.rawMapName || 'unknown';
  const mapName = rawMapName
    .replace(/^(de_|cs_)/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Определяем победу
  const playerTeam = activeMatch?.team || player.team;
  const ctScore = mapData?.team_ct?.score || 0;
  const tScore = mapData?.team_t?.score || 0;
  const roundsPlayed = ctScore + tScore;
  const roundsWon = playerTeam === 'CT' ? ctScore : tScore;
  const roundsLost = playerTeam === 'CT' ? tScore : ctScore;
  const isWin = roundsWon > roundsLost;
  
  // Рассчитываем дополнительную статистику
  const kills = matchStats.kills || 0;
  const deaths = matchStats.deaths || 0;
  const assists = matchStats.assists || 0;
  const mvps = matchStats.mvps || 0;
  
  // Headshots
  const headshotKills = player.state?.round_killhs || matchStats.headshot_kills || 0;
  const headshotPercentage = kills > 0 ? (headshotKills / kills) * 100 : 0;
  
  // ADR (Average Damage per Round)
  const totalDamage = player.state?.total_damage || matchStats.damage || 0;
  const adr = roundsPlayed > 0 ? totalDamage / roundsPlayed : 0;
  
  console.log(`📊 [GSI END] ${user.username}: Map=${mapName}, Team=${playerTeam}, Score=${roundsWon}-${roundsLost}, K/D/A=${kills}/${deaths}/${assists}`);
  
  // Проверяем, не был ли уже сохранен этот матч (защита от дублирования)
  const recentMatch = await CS2Match.findOne({
    where: {
      userId: user.id,
      source: 'gsi',
      map: mapName,
      playedAt: {
        [require('sequelize').Op.gte]: new Date(Date.now() - 60000) // Последняя минута
      }
    }
  });
  
  if (recentMatch) {
    console.log(`⚠️ [GSI] Матч уже был сохранен (ID: ${recentMatch.id}), пропускаем дубликат`);
    // Всё равно удаляем из памяти
    activeMatches.delete(matchKey);
    return;
  }
  
  console.log(`💾 [GSI] Сохраняем матч в БД...`);
  
  // Сохраняем матч с ПОЛНЫМИ данными GSI
  const cs2Match = await CS2Match.create({
    userId: user.id,
    kills,
    deaths,
    assists,
    headshots: headshotKills,
    damage: totalDamage,
    mvps,
    roundsPlayed,
    roundsWon,
    isWin,
    map: mapName,
    headshotPercentage,
    adr,
    source: 'gsi',
    playedAt: activeMatch?.startedAt || new Date(),
    
    // Сохраняем ПОЛНЫЙ GSI payload для детального анализа
    gsiData: {
      player: {
        steamid: player.steamid,
        name: player.name,
        team: playerTeam,
        observer_slot: player.observer_slot,
        activity: player.activity,
        state: player.state,
        weapons: player.weapons,
        match_stats: matchStats
      },
      map: mapData,
      round: gsiData.round,
      allplayers: gsiData.allplayers,
      bomb: gsiData.bomb,
      phase_countdowns: gsiData.phase_countdowns,
      provider: gsiData.provider
    }
  });
  
  // Обновляем квесты
  const matchData = {
    isWin,
    kills,
    deaths,
    assists,
    headshots: headshotKills,
    damage: totalDamage,
    mvps,
    rounds_won: roundsWon,
    rounds_played: roundsPlayed,
    adr
  };
  
  console.log(`🎮 [GSI] Автоматический анализ квестов CS2 для пользователя ${user.id}`);
  
  try {
    const questResult = await updateQuestProgress(user.id, matchData, 'cs2');
    console.log(`📊 [GSI] Результат квестов: ${questResult.completedQuests.length} завершено, +${questResult.totalXp} XP`);
    
    if (questResult.leveledUp) {
      console.log(`🎉 [GSI] Новый уровень: ${questResult.newLevel}!`);
    }
  } catch (questError) {
    console.error('❌ [GSI] Ошибка обновления квестов:', questError.message);
  }
  
  console.log(`✅ [GSI] CS2 матч сохранен для ${user.username} (ID: ${cs2Match.id}), K/D/A: ${kills}/${deaths}/${assists}, Результат: ${isWin ? 'Победа' : 'Поражение'}`);
  console.log(`💾 [GSI] Match saved to DB: userId=${user.id}, matchId=${cs2Match.id}, source=gsi, map=${mapName}`);
  
  // Помечаем матч как сохранённый в БД
  if (activeMatch) {
    activeMatch.savedToDb = true;
    console.log(`✅ [GSI] Marked match as saved in DB: ${matchKey}`);
  }
  
  // Удаляем из активных матчей
  const wasInMemory = activeMatches.has(matchKey);
  activeMatches.delete(matchKey);
  console.log(`🧹 [GSI] Матч удален из памяти: ${matchKey} (was in memory: ${wasInMemory})`);
  console.log(`📊 [GSI] Active matches count: ${activeMatches.size}`);
}

// Запускаем периодическую очистку старых матчей каждые 5 минут
setInterval(async () => {
  try {
    await cleanupOldMatches();
  } catch (err) {
    console.error('❌ [GSI] Ошибка при очистке старых матчей:', err.message);
  }
}, 5 * 60 * 1000);

/**
 * Получить активные матчи (для debug)
 * GET /api/gsi/active
 */
const getActiveMatches = async (req, res) => {
  try {
    const matches = Array.from(activeMatches.entries()).map(([key, match]) => {
      // Преобразуем данные для фронтенда
      const matchData = {
        key,
        steamId: match.steamId,
        mapName: match.mapName,
        rawMapName: match.rawMapName,
        team: match.team,
        kills: match.kills || 0,
        deaths: match.deaths || 0,
        assists: match.assists || 0,
        mvps: match.mvps || 0,
        score: match.score || 0,
        roundWins: match.roundWins || 0,
        roundLosses: match.roundLosses || 0,
        health: match.health || 0,
        armor: match.armor || 0,
        helmet: match.helmet || false,
        money: match.money || 0,
        equipValue: match.equipValue || 0,
        roundKills: match.roundKills || 0,
        roundKillhs: match.roundKillhs || 0,
        activeWeapon: match.activeWeapon,
        phase: match.phase,
        roundPhase: match.roundPhase,
        startedAt: match.startedAt,
        lastUpdate: match.lastUpdate,
        savedToDb: match.savedToDb || false,
        // Добавляем полные данные GSI для детальной статистики
        gsiData: match.gsiData || null
      };
      
      return matchData;
    });
    
    res.json({
      success: true,
      count: matches.length,
      matches
    });
  } catch (error) {
    console.error('Ошибка получения активных матчей:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Получить live статистику по Steam ID
 * GET /api/gsi/live/:steamId
 */
const getLiveStats = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    // Ищем активный матч для этого пользователя
    const userMatches = Array.from(activeMatches.entries())
      .filter(([key, match]) => match.steamId === steamId)
      .map(([key, match]) => match);
    
    if (userMatches.length === 0) {
      return res.json({
        success: true,
        inGame: false,
        match: null
      });
    }
    
    // Возвращаем последний активный матч
    const match = userMatches[userMatches.length - 1];
    
    res.json({
      success: true,
      inGame: true,
      match: {
        // Основная информация
        map: match.mapName?.replace('de_', '').replace('cs_', '') || 'Unknown',
        team: match.team || 'Unknown',
        phase: match.phase,
        roundPhase: match.roundPhase,
        
        // Статистика матча
        kills: match.kills || 0,
        deaths: match.deaths || 0,
        assists: match.assists || 0,
        mvps: match.mvps || 0,
        score: match.score || 0,
        
        // Счет раундов
        roundWins: match.roundWins || 0,
        roundLosses: match.roundLosses || 0,
        
        // Текущее состояние игрока
        health: match.health || 0,
        armor: match.armor || 0,
        helmet: match.helmet || false,
        money: match.money || 0,
        equipValue: match.equipValue || 0,
        
        // Статистика раунда
        roundKills: match.roundKills || 0,
        roundKillhs: match.roundKillhs || 0,
        
        // Оружие
        activeWeapon: match.activeWeapon || 'knife',
        
        // Временные метки
        startedAt: match.startedAt,
        lastUpdate: match.lastUpdate
      }
    });
  } catch (error) {
    console.error('Ошибка получения live статистики:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  handleGSI,
  getActiveMatches,
  getLiveStats
};
