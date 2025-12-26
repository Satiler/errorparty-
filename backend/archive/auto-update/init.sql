-- Инициализация базы данных для автообновления плейлистов

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- История прослушиваний
CREATE TABLE IF NOT EXISTS listening_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_played INTEGER,
    source VARCHAR(50)
);

-- Избранное пользователей
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    track_id INTEGER,
    artist_id INTEGER,
    album_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_type CHECK (
        (track_id IS NOT NULL AND artist_id IS NULL AND album_id IS NULL) OR
        (track_id IS NULL AND artist_id IS NOT NULL AND album_id IS NULL) OR
        (track_id IS NULL AND artist_id IS NULL AND album_id IS NOT NULL)
    )
);

-- Ожидающие изменения плейлистов
CREATE TABLE IF NOT EXISTS playlist_pending_changes (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER NOT NULL,
    changes_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER
);

-- Отслеживание артистов пользователями
CREATE TABLE IF NOT EXISTS user_artist_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    artist_id INTEGER NOT NULL,
    notify_new_releases BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, artist_id)
);

-- Логи импорта
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    tracks_imported INTEGER DEFAULT 0,
    tracks_skipped INTEGER DEFAULT 0,
    tracks_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- История чартов
CREATE TABLE IF NOT EXISTS chart_history (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    track_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    score DECIMAL(5,3),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Уведомления пользователей
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_listening_history_user ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_track ON listening_history(track_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_played_at ON listening_history(played_at);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_track ON user_favorites(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_pending_changes_status ON playlist_pending_changes(status);
CREATE INDEX IF NOT EXISTS idx_chart_history_source ON chart_history(source);
CREATE INDEX IF NOT EXISTS idx_chart_history_track ON chart_history(track_id);
CREATE INDEX IF NOT EXISTS idx_chart_history_recorded_at ON chart_history(recorded_at);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
