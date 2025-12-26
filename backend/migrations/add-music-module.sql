-- Migration: Create Music Module Tables
-- Создание таблиц для музыкального модуля

-- Tracks table
CREATE TABLE IF NOT EXISTS "Tracks" (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  genre VARCHAR(255),
  year INTEGER,
  duration INTEGER,
  "filePath" VARCHAR(500) NOT NULL,
  "coverPath" VARCHAR(500),
  "fileFormat" VARCHAR(50) NOT NULL,
  "fileSize" BIGINT NOT NULL,
  bitrate INTEGER,
  "uploadedBy" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "isPublic" BOOLEAN DEFAULT true,
  "allowDownload" BOOLEAN DEFAULT true,
  "playCount" INTEGER DEFAULT 0,
  "likeCount" INTEGER DEFAULT 0,
  "downloadCount" INTEGER DEFAULT 0,
  "externalSource" VARCHAR(255),
  "externalId" VARCHAR(255),
  "externalUrl" VARCHAR(500),
  features JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TrackLikes table
CREATE TABLE IF NOT EXISTS "TrackLikes" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "trackId" INTEGER NOT NULL REFERENCES "Tracks"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "trackId")
);

-- ListeningHistory table
CREATE TABLE IF NOT EXISTS "ListeningHistory" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "trackId" INTEGER NOT NULL REFERENCES "Tracks"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "listenedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER,
  completed BOOLEAN DEFAULT false,
  device VARCHAR(255),
  ip VARCHAR(50),
  context VARCHAR(255)
);

-- Playlists table
CREATE TABLE IF NOT EXISTS "Playlists" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "isPublic" BOOLEAN DEFAULT false,
  "coverPath" VARCHAR(500),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PlaylistTracks table
CREATE TABLE IF NOT EXISTS "PlaylistTracks" (
  id SERIAL PRIMARY KEY,
  "playlistId" INTEGER NOT NULL REFERENCES "Playlists"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "trackId" INTEGER NOT NULL REFERENCES "Tracks"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  position INTEGER NOT NULL,
  "addedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "addedBy" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE("playlistId", "trackId")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_uploaded_by ON "Tracks"("uploadedBy");
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON "Tracks"(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON "Tracks"(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_is_public ON "Tracks"("isPublic");
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON "Tracks"("playCount" DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON "Tracks"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_track_likes_user ON "TrackLikes"("userId");
CREATE INDEX IF NOT EXISTS idx_track_likes_track ON "TrackLikes"("trackId");

CREATE INDEX IF NOT EXISTS idx_listening_history_user ON "ListeningHistory"("userId");
CREATE INDEX IF NOT EXISTS idx_listening_history_track ON "ListeningHistory"("trackId");
CREATE INDEX IF NOT EXISTS idx_listening_history_listened_at ON "ListeningHistory"("listenedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_playlists_user ON "Playlists"("userId");
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON "Playlists"("isPublic");

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON "PlaylistTracks"("playlistId");
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON "PlaylistTracks"("trackId");
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON "PlaylistTracks"("playlistId", position);

COMMENT ON TABLE "Tracks" IS 'Музыкальные треки';
COMMENT ON TABLE "TrackLikes" IS 'Лайки треков';
COMMENT ON TABLE "ListeningHistory" IS 'История прослушиваний для ML';
COMMENT ON TABLE "Playlists" IS 'Плейлисты пользователей';
COMMENT ON TABLE "PlaylistTracks" IS 'Треки в плейлистах';
