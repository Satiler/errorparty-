/**
 * CS2 Demo Parser Mock - Для демонстрации UI без реальных демок
 * Генерирует реалистичные данные для тестирования
 */

/**
 * Генерирует случайного игрока с полной статистикой
 */
function generatePlayer(name, team, isBot = false) {
  const randomRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  const kills = randomRange(10, 25);
  const deaths = randomRange(8, 20);
  const assists = randomRange(3, 12);
  const headshots = Math.floor(kills * (0.3 + Math.random() * 0.3)); // 30-60% HS
  const damage = kills * randomRange(80, 120);
  
  return {
    name,
    steamId: isBot ? '0' : randomRange(100000000000000000, 999999999999999999).toString(),
    team,
    kills,
    deaths,
    assists,
    mvps: randomRange(0, 5),
    headshots,
    damage,
    damageDealt: damage,
    damageTaken: randomRange(damage * 0.3, damage * 0.8),
    
    // Гранаты
    grenades: {
      smoke: randomRange(1, 5),
      flash: randomRange(2, 8),
      he: randomRange(0, 3),
    },
    
    // Блинды и специальные условия
    blinding: randomRange(2, 8),
    killsInSmoke: randomRange(0, 2),
    openKills: randomRange(2, 8),
    
    // Оружие
    weaponKills: {
      ak47: randomRange(2, 8),
      m4: randomRange(2, 8),
      awp: randomRange(0, 4),
      deagle: randomRange(0, 2),
      knife: randomRange(0, 1),
      grenade: randomRange(0, 1),
    },
    weaponHeadshots: randomRange(2, 8),
    
    // Кур и прочее
    chickenKills: randomRange(0, 3),
    plantedBomb: randomRange(0, 3),
    defusedBomb: randomRange(0, 2),
    
    // Multi-kills
    multiKills: {
      '2k': randomRange(1, 5),
      '3k': randomRange(0, 3),
      '4k': randomRange(0, 2),
      '5k': randomRange(0, 1),
    },
    
    // Точность
    accuracy: Math.floor((30 + Math.random() * 40) * 100) / 100, // 30-70%
    firstBulletAccuracy: Math.floor((40 + Math.random() * 50) * 100) / 100, // 40-90%
    kast: Math.floor((45 + Math.random() * 50) * 100) / 100, // 45-95%
  };
}

/**
 * Генерирует полный набор данных демо
 */
function generateMockDemoData(matchId, mapName = 'de_dust2') {
  const maps = ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_vertigo', 'de_ancient', 'de_overpass'];
  const actualMap = maps.includes(mapName) ? mapName : maps[Math.floor(Math.random() * maps.length)];
  
  const ctScore = Math.floor(Math.random() * 10) + 8;  // 8-17 раундов
  const tScore = Math.floor(Math.random() * 10) + 8;
  const ctWon = ctScore > tScore;
  
  // Генерируем 10 игроков (5 CT + 5 T)
  const players = [];
  const ctPlayers = [];
  const tPlayers = [];
  
  // CT команда
  for (let i = 0; i < 5; i++) {
    const player = generatePlayer(
      `Player_CT_${i + 1}`,
      'ct',
      false
    );
    ctPlayers.push(player);
    players.push(player);
  }
  
  // T команда
  for (let i = 0; i < 5; i++) {
    const player = generatePlayer(
      `Player_T_${i + 1}`,
      't',
      false
    );
    tPlayers.push(player);
    players.push(player);
  }
  
  // Сортируем по фрагам (реалистично)
  ctPlayers.sort((a, b) => b.kills - a.kills);
  tPlayers.sort((a, b) => b.kills - a.kills);
  
  return {
    matchId,
    map: actualMap,
    duration: Math.floor(Math.random() * 30) + 40, // 40-70 минут
    rounds: ctScore + tScore,
    
    teams: {
      ct: {
        name: 'CT',
        score: ctScore,
        players: ctPlayers,
      },
      t: {
        name: 'T',
        score: tScore,
        players: tPlayers,
      },
    },
    
    // Общая статистика по раундам
    rounds: Array.from({ length: ctScore + tScore }, (_, i) => ({
      round: i + 1,
      winner: i % 2 === 0 ? 'ct' : 't',
      ctAlive: Math.floor(Math.random() * 5) + 1,
      tAlive: Math.floor(Math.random() * 5) + 1,
      bombPlanted: Math.random() > 0.5,
      bombExploded: Math.random() > 0.7,
    })),
    
    // Top фрагеры
    topFrags: ctPlayers.slice(0, 3).concat(tPlayers.slice(0, 2)),
    
    // Общие статистики
    totalKills: players.reduce((sum, p) => sum + p.kills, 0),
    totalDeaths: players.reduce((sum, p) => sum + p.deaths, 0),
    totalAssists: players.reduce((sum, p) => sum + p.assists, 0),
  };
}

module.exports = {
  generateMockDemoData,
  generatePlayer,
};
