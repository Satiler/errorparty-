const sequelize = require('../../config/database');

async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS cs2_matches (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      
      -- Основная статистика
      kills INTEGER NOT NULL DEFAULT 0,
      deaths INTEGER NOT NULL DEFAULT 0,
      assists INTEGER NOT NULL DEFAULT 0,
      headshots INTEGER NOT NULL DEFAULT 0,
      damage INTEGER NOT NULL DEFAULT 0,
      mvps INTEGER NOT NULL DEFAULT 0,
      
      -- Раунды
      rounds_played INTEGER NOT NULL DEFAULT 0,
      rounds_won INTEGER NOT NULL DEFAULT 0,
      is_win BOOLEAN NOT NULL DEFAULT false,
      
      -- Дополнительная статистика
      map VARCHAR(255),
      rank VARCHAR(255),
      headshot_percentage FLOAT,
      adr FLOAT,
      rating FLOAT,
      
      -- Клатчи
      clutch_1v1 INTEGER DEFAULT 0,
      clutch_1v2 INTEGER DEFAULT 0,
      clutch_1v3 INTEGER DEFAULT 0,
      clutch_1v4 INTEGER DEFAULT 0,
      clutch_1v5 INTEGER DEFAULT 0,
      
      -- Мультикиллы
      kills_3k INTEGER DEFAULT 0,
      kills_4k INTEGER DEFAULT 0,
      kills_5k INTEGER DEFAULT 0,
      
      -- Источник данных
      source VARCHAR(50) NOT NULL DEFAULT 'steam_api',
      
      -- Временные метки
      played_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    -- Индексы
    CREATE INDEX IF NOT EXISTS idx_cs2_matches_user_played ON cs2_matches(user_id, played_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cs2_matches_user_win ON cs2_matches(user_id, is_win);
  `);
  
  console.log('✅ Таблица cs2_matches создана успешно');
}

async function down() {
  await sequelize.query(`
    DROP TABLE IF EXISTS cs2_matches CASCADE;
  `);
  
  console.log('✅ Таблица cs2_matches удалена');
}

module.exports = { up, down };
