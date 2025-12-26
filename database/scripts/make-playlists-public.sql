UPDATE "Playlists" SET "isPublic" = true WHERE type = 'editorial';
SELECT id, name, "isPublic" FROM "Playlists" WHERE type = 'editorial' LIMIT 5;
