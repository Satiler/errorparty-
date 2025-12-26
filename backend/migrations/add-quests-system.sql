-- Создание таблицы квестов
CREATE TABLE IF NOT EXISTS quests (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  game VARCHAR(20) NOT NULL CHECK (game IN ('dota2', 'cs2', 'general')),
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'special')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
  requirement JSONB NOT NULL,
  reward JSONB NOT NULL,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Создание таблицы прогресса квестов пользователей
CREATE TABLE IF NOT EXISTS user_quests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_quest_id ON user_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests(status);
CREATE INDEX IF NOT EXISTS idx_user_quests_expires_at ON user_quests(expires_at);
CREATE INDEX IF NOT EXISTS idx_quests_game ON quests(game);
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);

-- Обновление timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_quests_updated_at BEFORE UPDATE ON user_quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Добавление полей уровня и опыта в user_stats если их нет
ALTER TABLE user_stats 
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;
