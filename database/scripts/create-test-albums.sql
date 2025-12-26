-- Create test albums and link existing tracks to them

-- Album 1: ABBA - Greatest Hits
INSERT INTO "Albums" (title, artist, "coverPath", genre, "totalTracks", "createdAt", "updatedAt")
VALUES ('Greatest Hits', 'ABBA', 'https://i.scdn.co/image/ab67616d0000b273e14f11f796cef9f9a82691a7', 'Pop', 1, NOW(), NOW());

-- Album 2: Ellie Goulding - Delirium
INSERT INTO "Albums" (title, artist, "coverPath", genre, "totalTracks", "createdAt", "updatedAt")
VALUES ('Delirium', 'Ellie_Goulding', 'https://i.scdn.co/image/ab67616d0000b273d8b9e9f8e5e3e4c5d9f8e7f6', 'Pop', 1, NOW(), NOW());

-- Album 3: Billie Eilish - Ocean Eyes Single
INSERT INTO "Albums" (title, artist, "coverPath", genre, "totalTracks", "createdAt", "updatedAt")
VALUES ('Ocean Eyes', '1', 'https://i.scdn.co/image/ab67616d0000b273a9f6c04ba168640b48aa5795', 'Alternative', 1, NOW(), NOW());

-- Link tracks to albums
UPDATE "Tracks" SET "albumId" = (SELECT id FROM "Albums" WHERE title = 'Greatest Hits') WHERE id = 3;
UPDATE "Tracks" SET "albumId" = (SELECT id FROM "Albums" WHERE title = 'Delirium') WHERE id = 2;
UPDATE "Tracks" SET "albumId" = (SELECT id FROM "Albums" WHERE title = 'Ocean Eyes') WHERE id = 1;

-- Show results
SELECT 'Created albums:' as status;
SELECT id, title, artist, "totalTracks" FROM "Albums";

SELECT '' as spacer;
SELECT 'Tracks with albums:' as status;
SELECT t.id, t.title, t.artist, a.title as album FROM "Tracks" t LEFT JOIN "Albums" a ON t."albumId" = a.id;
