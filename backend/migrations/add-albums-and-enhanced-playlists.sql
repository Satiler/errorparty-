-- Migration: Add Albums and Enhanced Playlists
-- Добавляет альбомы, комментарии, подписки на подборки

-- ============================================
-- ALBUMS (Альбомы)
-- ============================================

CREATE TABLE IF NOT EXISTS "Albums" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "artist" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "coverPath" TEXT,
  "releaseYear" INTEGER,
  "genre" VARCHAR(100),
  "totalTracks" INTEGER DEFAULT 0,
  "totalDuration" INTEGER DEFAULT 0, -- в секундах
  "createdBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "isPublic" BOOLEAN DEFAULT true,
  "likeCount" INTEGER DEFAULT 0,
  "playCount" INTEGER DEFAULT 0,
  "viewCount" INTEGER DEFAULT 0,
  "metadata" JSONB, -- дополнительные данные (label, copyright, etc)
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_albums_artist ON "Albums"("artist");
CREATE INDEX idx_albums_genre ON "Albums"("genre");
CREATE INDEX idx_albums_created_by ON "Albums"("createdBy");
CREATE INDEX idx_albums_public ON "Albums"("isPublic");
CREATE INDEX idx_albums_release_year ON "Albums"("releaseYear");

COMMENT ON TABLE "Albums" IS 'Музыкальные альбомы';

-- ============================================
-- ALBUM LIKES (Лайки альбомов)
-- ============================================

CREATE TABLE IF NOT EXISTS "AlbumLikes" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "albumId" INTEGER NOT NULL REFERENCES "Albums"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "albumId")
);

CREATE INDEX idx_album_likes_user ON "AlbumLikes"("userId");
CREATE INDEX idx_album_likes_album ON "AlbumLikes"("albumId");

COMMENT ON TABLE "AlbumLikes" IS 'Лайки альбомов';

-- ============================================
-- ALBUM COMMENTS (Комментарии к альбомам)
-- ============================================

CREATE TABLE IF NOT EXISTS "AlbumComments" (
  "id" SERIAL PRIMARY KEY,
  "albumId" INTEGER NOT NULL REFERENCES "Albums"(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "parentId" INTEGER REFERENCES "AlbumComments"(id) ON DELETE CASCADE, -- для вложенных комментариев
  "likeCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_album_comments_album ON "AlbumComments"("albumId");
CREATE INDEX idx_album_comments_user ON "AlbumComments"("userId");
CREATE INDEX idx_album_comments_parent ON "AlbumComments"("parentId");

COMMENT ON TABLE "AlbumComments" IS 'Комментарии к альбомам';

-- ============================================
-- PLAYLIST ENHANCEMENTS (Улучшения подборок)
-- ============================================

-- Добавляем новые поля к существующей таблице Playlists
ALTER TABLE "Playlists" 
  ADD COLUMN IF NOT EXISTS "coverPath" TEXT,
  ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) DEFAULT 'user', -- user, editorial, auto
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "likeCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "subscriberCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "playCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[], -- теги для поиска
  ADD COLUMN IF NOT EXISTS "metadata" JSONB; -- mood, tempo, etc

CREATE INDEX IF NOT EXISTS idx_playlists_type ON "Playlists"("type");
CREATE INDEX IF NOT EXISTS idx_playlists_public ON "Playlists"("isPublic");
CREATE INDEX IF NOT EXISTS idx_playlists_tags ON "Playlists" USING GIN("tags");

-- ============================================
-- PLAYLIST SUBSCRIPTIONS (Подписки на подборки)
-- ============================================

CREATE TABLE IF NOT EXISTS "PlaylistSubscriptions" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "playlistId" INTEGER NOT NULL REFERENCES "Playlists"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "playlistId")
);

CREATE INDEX idx_playlist_subscriptions_user ON "PlaylistSubscriptions"("userId");
CREATE INDEX idx_playlist_subscriptions_playlist ON "PlaylistSubscriptions"("playlistId");

COMMENT ON TABLE "PlaylistSubscriptions" IS 'Подписки пользователей на подборки';

-- ============================================
-- PLAYLIST LIKES (Лайки подборок)
-- ============================================

CREATE TABLE IF NOT EXISTS "PlaylistLikes" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "playlistId" INTEGER NOT NULL REFERENCES "Playlists"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "playlistId")
);

CREATE INDEX idx_playlist_likes_user ON "PlaylistLikes"("userId");
CREATE INDEX idx_playlist_likes_playlist ON "PlaylistLikes"("playlistId");

COMMENT ON TABLE "PlaylistLikes" IS 'Лайки подборок';

-- ============================================
-- PLAYLIST COMMENTS (Комментарии к подборкам)
-- ============================================

CREATE TABLE IF NOT EXISTS "PlaylistComments" (
  "id" SERIAL PRIMARY KEY,
  "playlistId" INTEGER NOT NULL REFERENCES "Playlists"(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "parentId" INTEGER REFERENCES "PlaylistComments"(id) ON DELETE CASCADE,
  "likeCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playlist_comments_playlist ON "PlaylistComments"("playlistId");
CREATE INDEX idx_playlist_comments_user ON "PlaylistComments"("userId");
CREATE INDEX idx_playlist_comments_parent ON "PlaylistComments"("parentId");

COMMENT ON TABLE "PlaylistComments" IS 'Комментарии к подборкам';

-- ============================================
-- TRACK-ALBUM RELATIONSHIP (Связь треков с альбомами)
-- ============================================

ALTER TABLE "Tracks"
  ADD COLUMN IF NOT EXISTS "albumId" INTEGER REFERENCES "Albums"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "trackNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "discNumber" INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_tracks_album ON "Tracks"("albumId");

-- ============================================
-- TRIGGERS (Автоматическое обновление счётчиков)
-- ============================================

-- Обновление счётчика треков в альбоме
CREATE OR REPLACE FUNCTION update_album_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE "Albums" 
    SET "totalTracks" = "totalTracks" + 1
    WHERE "id" = NEW."albumId";
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE "Albums" 
    SET "totalTracks" = GREATEST("totalTracks" - 1, 0)
    WHERE "id" = OLD."albumId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_album_track_count ON "Tracks";
CREATE TRIGGER trigger_album_track_count
AFTER INSERT OR DELETE ON "Tracks"
FOR EACH ROW
WHEN (NEW."albumId" IS NOT NULL OR OLD."albumId" IS NOT NULL)
EXECUTE FUNCTION update_album_track_count();

-- Обновление счётчика подписчиков
CREATE OR REPLACE FUNCTION update_playlist_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE "Playlists" 
    SET "subscriberCount" = "subscriberCount" + 1
    WHERE "id" = NEW."playlistId";
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE "Playlists" 
    SET "subscriberCount" = GREATEST("subscriberCount" - 1, 0)
    WHERE "id" = OLD."playlistId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_playlist_subscriber_count ON "PlaylistSubscriptions";
CREATE TRIGGER trigger_playlist_subscriber_count
AFTER INSERT OR DELETE ON "PlaylistSubscriptions"
FOR EACH ROW
EXECUTE FUNCTION update_playlist_subscriber_count();

COMMENT ON COLUMN "Albums"."metadata" IS 'Дополнительные метаданные альбома (label, copyright, etc)';
COMMENT ON COLUMN "Playlists"."type" IS 'Тип подборки: user (пользовательская), editorial (редакционная), auto (автоматическая)';
COMMENT ON COLUMN "Playlists"."metadata" IS 'Метаданные подборки (mood, tempo, activity, etc)';

SELECT 'Albums and Enhanced Playlists migration completed successfully!' AS status;
