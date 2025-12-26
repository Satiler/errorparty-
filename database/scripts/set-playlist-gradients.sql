-- Устанавливаем уникальные градиентные обложки для плейлистов
UPDATE "Playlists" SET image = 'gradient://purple-blue' WHERE id = 308;
UPDATE "Playlists" SET image = 'gradient://orange-red' WHERE id = 309;
UPDATE "Playlists" SET image = 'gradient://emerald-teal' WHERE id = 310;
UPDATE "Playlists" SET image = 'gradient://pink-purple' WHERE id = 311;
UPDATE "Playlists" SET image = 'gradient://cyan-blue' WHERE id = 312;
UPDATE "Playlists" SET image = 'gradient://yellow-orange' WHERE id = 313;
UPDATE "Playlists" SET image = 'gradient://indigo-purple' WHERE id = 314;
UPDATE "Playlists" SET image = 'gradient://slate-blue' WHERE id = 315;
UPDATE "Playlists" SET image = 'gradient://red-pink' WHERE id = 340;
UPDATE "Playlists" SET image = 'gradient://green-emerald' WHERE id = 341;

SELECT id, name, image FROM "Playlists" WHERE id IN (308,309,310,311,312,313,314,315,340,341);
