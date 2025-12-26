-- Fix trigger for album track count

DROP FUNCTION IF EXISTS update_album_track_count() CASCADE;

CREATE OR REPLACE FUNCTION update_album_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW."albumId" IS NOT NULL) THEN
    UPDATE "Albums" 
    SET "totalTracks" = "totalTracks" + 1
    WHERE "id" = NEW."albumId";
  ELSIF (TG_OP = 'DELETE' AND OLD."albumId" IS NOT NULL) THEN
    UPDATE "Albums" 
    SET "totalTracks" = GREATEST("totalTracks" - 1, 0)
    WHERE "id" = OLD."albumId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_album_track_count
AFTER INSERT OR DELETE ON "Tracks"
FOR EACH ROW
EXECUTE FUNCTION update_album_track_count();
