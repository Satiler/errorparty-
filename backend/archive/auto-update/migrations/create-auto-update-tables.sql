-- Миграция базы данных для системы автообновления плейлистов

-- Таблица для хранения истории прослушивания
CREATE TABLE IF NOT EXISTS listening_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMP DEFAULT NOW(),
  play_count INTEGER DEFAULT 1,
  duration_played INTEGER DEFAULT 0, -- секунды
  UNIQUE(user_id, track_id, played_at)
);

CREATE INDEX idx_listening_history_user ON listening_history(user_id);
CREATE INDEX idx_listening_history_track ON listening_history(track_id);
CREATE INDEX idx_listening_history_played_at ON listening_history(played_at);

-- Таблица избранного пользователя
CREATE TABLE IF NOT EXISTS user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_track ON user_favorites(track_id);

-- Таблица ожидающих изменений плейлистов (для модерации)
CREATE TABLE IF NOT EXISTS playlist_pending_changes (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  changes_data JSONB NOT NULL, -- JSON с изменениями (toAdd, toRemove, toKeep)
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  moderator_id INTEGER REFERENCES users(id),
  notes TEXT
);

CREATE INDEX idx_pending_changes_playlist ON playlist_pending_changes(playlist_id);
CREATE INDEX idx_pending_changes_status ON playlist_pending_changes(status);
CREATE INDEX idx_pending_changes_created ON playlist_pending_changes(created_at);

-- Таблица для отслеживания артистов
CREATE TABLE IF NOT EXISTS user_artist_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_name VARCHAR(255) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  notify_on_new_release BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, artist_name)
);

CREATE INDEX idx_artist_tracking_user ON user_artist_tracking(user_id);
CREATE INDEX idx_artist_tracking_artist ON user_artist_tracking(artist_name);

-- Добавление полей к существующей таблице tracks
ALTER TABLE tracks 
  ADD COLUMN IF NOT EXISTS popularity_score DECIMAL(3,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS apple_music_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shazam_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS billboard_position INTEGER,
  ADD COLUMN IF NOT EXISTS last_chart_update TIMESTAMP,
  ADD COLUMN IF NOT EXISTS isrc VARCHAR(20),
  ADD COLUMN IF NOT EXISTS preview_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON tracks(popularity_score);
CREATE INDEX IF NOT EXISTS idx_tracks_spotify ON tracks(spotify_id);
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON tracks(isrc);

-- Таблица логов импорта
CREATE TABLE IF NOT EXISTS import_logs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL, -- kissvk, spotify, applemusic, billboard, shazam
  import_type VARCHAR(50) NOT NULL, -- new_releases, charts, albums
  tracks_imported INTEGER DEFAULT 0,
  tracks_skipped INTEGER DEFAULT 0,
  tracks_failed INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
  error_message TEXT,
  details JSONB
);

CREATE INDEX idx_import_logs_source ON import_logs(source);
CREATE INDEX idx_import_logs_started ON import_logs(started_at);

-- Таблица для хранения истории чартов
CREATE TABLE IF NOT EXISTS chart_history (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  chart_name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  track_title VARCHAR(255) NOT NULL,
  track_artist VARCHAR(255) NOT NULL,
  track_id INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP DEFAULT NOW(),
  additional_data JSONB -- для хранения доп. информации (weeks on chart, peak position и т.д.)
);

CREATE INDEX idx_chart_history_source ON chart_history(source);
CREATE INDEX idx_chart_history_track ON chart_history(track_id);
CREATE INDEX idx_chart_history_recorded ON chart_history(recorded_at);

-- Таблица уведомлений пользователей
CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- new_release, trending_track, playlist_update
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
  related_playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_notifications_read ON user_notifications(is_read);
CREATE INDEX idx_notifications_created ON user_notifications(created_at);

-- Функция для автоматического обновления timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для playlists
DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггер для tracks
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Представление для популярных треков
CREATE OR REPLACE VIEW popular_tracks AS
SELECT 
  t.id,
  t.title,
  t.artist,
  t.genre,
  t.popularity_score,
  COUNT(DISTINCT lh.user_id) as unique_listeners,
  COUNT(lh.id) as total_plays,
  COUNT(DISTINCT uf.user_id) as favorites_count
FROM tracks t
LEFT JOIN listening_history lh ON t.id = lh.track_id
  AND lh.played_at > NOW() - INTERVAL '30 days'
LEFT JOIN user_favorites uf ON t.id = uf.track_id
GROUP BY t.id
HAVING t.popularity_score > 0.5 OR COUNT(lh.id) > 10
ORDER BY t.popularity_score DESC, total_plays DESC;

-- Представление для новых релизов
CREATE OR REPLACE VIEW new_releases AS
SELECT 
  t.id,
  t.title,
  t.artist,
  t.album,
  t.genre,
  t.cover_url,
  t.created_at,
  COUNT(DISTINCT lh.user_id) as early_listeners
FROM tracks t
LEFT JOIN listening_history lh ON t.id = lh.track_id
WHERE t.created_at > NOW() - INTERVAL '14 days'
GROUP BY t.id
ORDER BY t.created_at DESC;

-- Комментарии для документации
COMMENT ON TABLE listening_history IS 'История прослушивания треков пользователями';
COMMENT ON TABLE user_favorites IS 'Избранные треки пользователей';
COMMENT ON TABLE playlist_pending_changes IS 'Изменения плейлистов, ожидающие модерации';
COMMENT ON TABLE user_artist_tracking IS 'Отслеживаемые пользователями артисты для уведомлений';
COMMENT ON TABLE import_logs IS 'Логи импорта треков из внешних источников';
COMMENT ON TABLE chart_history IS 'История позиций треков в чартах';
COMMENT ON TABLE user_notifications IS 'Уведомления для пользователей';

-- Вставка тестовых данных (опционально)
-- INSERT INTO playlists (name, description, is_public, user_id) VALUES
--   ('Глобальный топ-100', 'Автоматически обновляемый плейлист с мировыми хитами', true, 1),
--   ('Сейчас в тренде', 'Треки, популярные в данный момент', true, 1),
--   ('Новые релизы', 'Свежие релизы этой недели', true, 1);
