-- Загрузка новых современных треков 2025 по жанрам
-- Добавляем 200+ треков с разными жанрами для заполнения плейлистов

-- Найдем ID альбомов для привязки
DO $$
DECLARE
  neon_visions_id INT;
  urban_beats_id INT;
  harmonic_flow_id INT;
  electric_sunset_id INT;
  steel_horizon_id INT;
  soul_connection_id INT;
  summer_vibes_id INT;
  digital_dreams_id INT;
  indie_discovery_id INT;
  world_fusion_id INT;
BEGIN
  -- Получаем ID альбомов
  SELECT id INTO neon_visions_id FROM "Albums" WHERE title = 'Neon Visions' LIMIT 1;
  SELECT id INTO urban_beats_id FROM "Albums" WHERE title = 'Urban Beats' LIMIT 1;
  SELECT id INTO harmonic_flow_id FROM "Albums" WHERE title = 'Harmonic Flow' LIMIT 1;
  SELECT id INTO electric_sunset_id FROM "Albums" WHERE title = 'Electric Sunset' LIMIT 1;
  SELECT id INTO steel_horizon_id FROM "Albums" WHERE title = 'Steel Horizon' LIMIT 1;
  SELECT id INTO soul_connection_id FROM "Albums" WHERE title = 'Soul Connection' LIMIT 1;
  SELECT id INTO summer_vibes_id FROM "Albums" WHERE title = 'Summer Vibes 2025' LIMIT 1;
  SELECT id INTO digital_dreams_id FROM "Albums" WHERE title = 'Digital Dreams' LIMIT 1;
  SELECT id INTO indie_discovery_id FROM "Albums" WHERE title = 'Indie Discovery' LIMIT 1;
  SELECT id INTO world_fusion_id FROM "Albums" WHERE title = 'World Fusion' LIMIT 1;

  -- ========== POP ТРЕКИ (50 треков) ==========
  
  -- Альбом: Summer Vibes 2025
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Sunshine State', 'Pop Stars', 'Pop', 210, summer_vibes_id, '/music/pop/sunshine-state.mp3', NOW(), NOW()),
  ('Weekend Feeling', 'The Vibes', 'Pop', 195, summer_vibes_id, '/music/pop/weekend-feeling.mp3', NOW(), NOW()),
  ('Dancing All Night', 'Luna Ray', 'Pop', 223, summer_vibes_id, '/music/pop/dancing-all-night.mp3', NOW(), NOW()),
  ('Summer Love', 'Aria Belle', 'Pop', 201, summer_vibes_id, '/music/pop/summer-love.mp3', NOW(), NOW()),
  ('Good Vibes Only', 'Happy Collective', 'Pop', 188, summer_vibes_id, '/music/pop/good-vibes-only.mp3', NOW(), NOW()),
  ('Neon Lights', 'City Pop Band', 'Pop', 215, summer_vibes_id, '/music/pop/neon-lights.mp3', NOW(), NOW()),
  ('Forever Young', 'Youth Culture', 'Pop', 207, summer_vibes_id, '/music/pop/forever-young.mp3', NOW(), NOW()),
  ('Starlight Dreams', 'Nova Stars', 'Pop', 198, summer_vibes_id, '/music/pop/starlight-dreams.mp3', NOW(), NOW()),
  ('Electric Heart', 'Pulse Pop', 'Pop', 212, summer_vibes_id, '/music/pop/electric-heart.mp3', NOW(), NOW()),
  ('Paradise Found', 'Tropical Waves', 'Pop', 225, summer_vibes_id, '/music/pop/paradise-found.mp3', NOW(), NOW()),
  ('Rainbow Sky', 'Color Burst', 'Pop', 190, summer_vibes_id, '/music/pop/rainbow-sky.mp3', NOW(), NOW()),
  ('Magic Moments', 'Dream Pop', 'Pop', 203, summer_vibes_id, '/music/pop/magic-moments.mp3', NOW(), NOW()),
  ('Fireflies', 'Night Lights', 'Pop', 197, summer_vibes_id, '/music/pop/fireflies.mp3', NOW(), NOW()),
  ('Ocean Breeze', 'Coastal Vibes', 'Pop', 218, summer_vibes_id, '/music/pop/ocean-breeze.mp3', NOW(), NOW()),
  ('Golden Hour', 'Sunset Collective', 'Pop', 211, summer_vibes_id, '/music/pop/golden-hour.mp3', NOW(), NOW()),
  ('Crystal Clear', 'Pure Pop', 'Pop', 194, summer_vibes_id, '/music/pop/crystal-clear.mp3', NOW(), NOW()),
  ('Feel Alive', 'Energy Pop', 'Pop', 208, summer_vibes_id, '/music/pop/feel-alive.mp3', NOW(), NOW()),
  ('Moonlight Dance', 'Luna Pop', 'Pop', 216, summer_vibes_id, '/music/pop/moonlight-dance.mp3', NOW(), NOW()),
  ('Sunrise Boulevard', 'Morning Pop', 'Pop', 199, summer_vibes_id, '/music/pop/sunrise-boulevard.mp3', NOW(), NOW()),
  ('Sweet Escape', 'Getaway Pop', 'Pop', 221, summer_vibes_id, '/music/pop/sweet-escape.mp3', NOW(), NOW());

  -- Еще 30 поп-треков для других альбомов
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Heartbeat Rhythm', 'Pulse Pop', 'Pop', 205, neon_visions_id, '/music/pop/heartbeat-rhythm.mp3', NOW(), NOW()),
  ('City Lights Shine', 'Urban Pop', 'Pop', 213, neon_visions_id, '/music/pop/city-lights-shine.mp3', NOW(), NOW()),
  ('Velvet Dreams', 'Smooth Pop', 'Pop', 198, harmonic_flow_id, '/music/pop/velvet-dreams.mp3', NOW(), NOW()),
  ('Midnight Party', 'Party Pop', 'Pop', 227, digital_dreams_id, '/music/pop/midnight-party.mp3', NOW(), NOW()),
  ('Sweet Melody', 'Melody Pop', 'Pop', 192, harmonic_flow_id, '/music/pop/sweet-melody.mp3', NOW(), NOW()),
  ('Dreamcatcher', 'Fantasy Pop', 'Pop', 210, indie_discovery_id, '/music/pop/dreamcatcher.mp3', NOW(), NOW()),
  ('Spotlight Fever', 'Stage Pop', 'Pop', 218, summer_vibes_id, '/music/pop/spotlight-fever.mp3', NOW(), NOW()),
  ('Sugar Rush', 'Sweet Pop', 'Pop', 187, summer_vibes_id, '/music/pop/sugar-rush.mp3', NOW(), NOW()),
  ('Neon Paradise', 'Future Pop', 'Pop', 214, digital_dreams_id, '/music/pop/neon-paradise.mp3', NOW(), NOW()),
  ('Butterfly Effect', 'Nature Pop', 'Pop', 201, indie_discovery_id, '/music/pop/butterfly-effect.mp3', NOW(), NOW()),
  ('Diamond Sky', 'Precious Pop', 'Pop', 209, neon_visions_id, '/music/pop/diamond-sky.mp3', NOW(), NOW()),
  ('Thunder Vibes', 'Storm Pop', 'Pop', 196, electric_sunset_id, '/music/pop/thunder-vibes.mp3', NOW(), NOW()),
  ('Cosmic Love', 'Space Pop', 'Pop', 222, digital_dreams_id, '/music/pop/cosmic-love.mp3', NOW(), NOW()),
  ('Phoenix Rising', 'Epic Pop', 'Pop', 235, indie_discovery_id, '/music/pop/phoenix-rising.mp3', NOW(), NOW()),
  ('Velvet Touch', 'Soft Pop', 'Pop', 193, harmonic_flow_id, '/music/pop/velvet-touch.mp3', NOW(), NOW()),
  ('Electric Nights', 'Night Pop', 'Pop', 215, neon_visions_id, '/music/pop/electric-nights.mp3', NOW(), NOW()),
  ('Stargazer', 'Astro Pop', 'Pop', 207, digital_dreams_id, '/music/pop/stargazer.mp3', NOW(), NOW()),
  ('Blissful Moments', 'Happy Pop', 'Pop', 199, summer_vibes_id, '/music/pop/blissful-moments.mp3', NOW(), NOW()),
  ('Radiant Soul', 'Bright Pop', 'Pop', 212, soul_connection_id, '/music/pop/radiant-soul.mp3', NOW(), NOW()),
  ('Gravity Pull', 'Physics Pop', 'Pop', 204, electric_sunset_id, '/music/pop/gravity-pull.mp3', NOW(), NOW()),
  ('Horizon Glow', 'Sunset Pop', 'Pop', 217, electric_sunset_id, '/music/pop/horizon-glow.mp3', NOW(), NOW()),
  ('Whisper Waves', 'Quiet Pop', 'Pop', 189, harmonic_flow_id, '/music/pop/whisper-waves.mp3', NOW(), NOW()),
  ('Cascade Falls', 'Water Pop', 'Pop', 220, world_fusion_id, '/music/pop/cascade-falls.mp3', NOW(), NOW()),
  ('Prism Light', 'Color Pop', 'Pop', 195, neon_visions_id, '/music/pop/prism-light.mp3', NOW(), NOW()),
  ('Aurora Dreams', 'Sky Pop', 'Pop', 224, digital_dreams_id, '/music/pop/aurora-dreams.mp3', NOW(), NOW()),
  ('Velvet Night', 'Smooth Pop', 'Pop', 208, harmonic_flow_id, '/music/pop/velvet-night.mp3', NOW(), NOW()),
  ('Echo Chamber', 'Reverb Pop', 'Pop', 200, indie_discovery_id, '/music/pop/echo-chamber.mp3', NOW(), NOW()),
  ('Sonic Bloom', 'Fresh Pop', 'Pop', 191, summer_vibes_id, '/music/pop/sonic-bloom.mp3', NOW(), NOW()),
  ('Mirror Ball', 'Disco Pop', 'Pop', 228, summer_vibes_id, '/music/pop/mirror-ball.mp3', NOW(), NOW()),
  ('Crimson Sunset', 'Twilight Pop', 'Pop', 213, electric_sunset_id, '/music/pop/crimson-sunset.mp3', NOW(), NOW());

  -- ========== ELECTRONIC ТРЕКИ (40 треков) ==========
  
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Neon Pulse', 'Synth Masters', 'Electronic', 245, neon_visions_id, '/music/electronic/neon-pulse.mp3', NOW(), NOW()),
  ('Digital Horizon', 'Cyber Wave', 'Electronic', 267, digital_dreams_id, '/music/electronic/digital-horizon.mp3', NOW(), NOW()),
  ('Circuit Dreams', 'Tech Noir', 'Electronic', 298, digital_dreams_id, '/music/electronic/circuit-dreams.mp3', NOW(), NOW()),
  ('Quantum Leap', 'Future Bass', 'Electronic', 234, digital_dreams_id, '/music/electronic/quantum-leap.mp3', NOW(), NOW()),
  ('Voltage Drop', 'Electric Storm', 'Electronic', 256, electric_sunset_id, '/music/electronic/voltage-drop.mp3', NOW(), NOW()),
  ('Binary Sunset', 'Code Wave', 'Electronic', 289, electric_sunset_id, '/music/electronic/binary-sunset.mp3', NOW(), NOW()),
  ('Laser Show', 'Light Beam', 'Electronic', 223, neon_visions_id, '/music/electronic/laser-show.mp3', NOW(), NOW()),
  ('Cyber City', 'Neon Knights', 'Electronic', 278, digital_dreams_id, '/music/electronic/cyber-city.mp3', NOW(), NOW()),
  ('Tech Paradise', 'Digital Eden', 'Electronic', 245, digital_dreams_id, '/music/electronic/tech-paradise.mp3', NOW(), NOW()),
  ('Electric Storm', 'Thunder Tech', 'Electronic', 267, electric_sunset_id, '/music/electronic/electric-storm.mp3', NOW(), NOW()),
  ('Neon Nights', 'City Lights', 'Electronic', 234, neon_visions_id, '/music/electronic/neon-nights.mp3', NOW(), NOW()),
  ('Digital Love', 'Robot Hearts', 'Electronic', 256, digital_dreams_id, '/music/electronic/digital-love.mp3', NOW(), NOW()),
  ('Cosmic Rays', 'Space Tech', 'Electronic', 289, digital_dreams_id, '/music/electronic/cosmic-rays.mp3', NOW(), NOW()),
  ('Warp Speed', 'Hyper Drive', 'Electronic', 212, digital_dreams_id, '/music/electronic/warp-speed.mp3', NOW(), NOW()),
  ('Pixel Perfect', 'Bit Crusher', 'Electronic', 245, digital_dreams_id, '/music/electronic/pixel-perfect.mp3', NOW(), NOW()),
  ('Future Shock', 'Tomorrow Sound', 'Electronic', 267, digital_dreams_id, '/music/electronic/future-shock.mp3', NOW(), NOW()),
  ('Electric Dreams', 'Voltage Pop', 'Electronic', 234, electric_sunset_id, '/music/electronic/electric-dreams.mp3', NOW(), NOW()),
  ('Neon Genesis', 'Synth Wave', 'Electronic', 278, neon_visions_id, '/music/electronic/neon-genesis.mp3', NOW(), NOW()),
  ('Digital Rain', 'Matrix Sound', 'Electronic', 256, digital_dreams_id, '/music/electronic/digital-rain.mp3', NOW(), NOW()),
  ('Cyber Punk', 'Tech Rebel', 'Electronic', 289, digital_dreams_id, '/music/electronic/cyber-punk.mp3', NOW(), NOW()),
  ('Laser Beam', 'Light Speed', 'Electronic', 223, neon_visions_id, '/music/electronic/laser-beam.mp3', NOW(), NOW()),
  ('Circuit Break', 'Power Surge', 'Electronic', 245, electric_sunset_id, '/music/electronic/circuit-break.mp3', NOW(), NOW()),
  ('Digital Wave', 'Frequency', 'Electronic', 267, digital_dreams_id, '/music/electronic/digital-wave.mp3', NOW(), NOW()),
  ('Neon Flash', 'Light Burst', 'Electronic', 234, neon_visions_id, '/music/electronic/neon-flash.mp3', NOW(), NOW()),
  ('Electric Soul', 'Tech Heart', 'Electronic', 256, electric_sunset_id, '/music/electronic/electric-soul.mp3', NOW(), NOW()),
  ('Cyber Space', 'Virtual Reality', 'Electronic', 289, digital_dreams_id, '/music/electronic/cyber-space.mp3', NOW(), NOW()),
  ('Tech Noir', 'Dark Synth', 'Electronic', 278, digital_dreams_id, '/music/electronic/tech-noir.mp3', NOW(), NOW()),
  ('Digital Fortress', 'Cyber Guard', 'Electronic', 245, digital_dreams_id, '/music/electronic/digital-fortress.mp3', NOW(), NOW()),
  ('Neon Warrior', 'Tech Fighter', 'Electronic', 267, neon_visions_id, '/music/electronic/neon-warrior.mp3', NOW(), NOW()),
  ('Electric Pulse', 'Beat Machine', 'Electronic', 234, electric_sunset_id, '/music/electronic/electric-pulse.mp3', NOW(), NOW()),
  ('Cyber Symphony', 'Tech Orchestra', 'Electronic', 312, digital_dreams_id, '/music/electronic/cyber-symphony.mp3', NOW(), NOW()),
  ('Digital Dawn', 'New Day Tech', 'Electronic', 256, digital_dreams_id, '/music/electronic/digital-dawn.mp3', NOW(), NOW()),
  ('Neon Cascade', 'Light Flow', 'Electronic', 289, neon_visions_id, '/music/electronic/neon-cascade.mp3', NOW(), NOW()),
  ('Electric Euphoria', 'Voltage High', 'Electronic', 245, electric_sunset_id, '/music/electronic/electric-euphoria.mp3', NOW(), NOW()),
  ('Circuit Breaker', 'Power Grid', 'Electronic', 267, digital_dreams_id, '/music/electronic/circuit-breaker.mp3', NOW(), NOW()),
  ('Cyber Romance', 'Digital Love', 'Electronic', 234, digital_dreams_id, '/music/electronic/cyber-romance.mp3', NOW(), NOW()),
  ('Neon Odyssey', 'Journey Tech', 'Electronic', 298, neon_visions_id, '/music/electronic/neon-odyssey.mp3', NOW(), NOW()),
  ('Electric Avenue', 'Tech Street', 'Electronic', 256, electric_sunset_id, '/music/electronic/electric-avenue.mp3', NOW(), NOW()),
  ('Digital Mirage', 'Virtual Vision', 'Electronic', 278, digital_dreams_id, '/music/electronic/digital-mirage.mp3', NOW(), NOW()),
  ('Neon Symphony', 'Light Orchestra', 'Electronic', 289, neon_visions_id, '/music/electronic/neon-symphony.mp3', NOW(), NOW());

  -- ========== HIP-HOP ТРЕКИ (35 треков) ==========
  
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Street Dreams', 'MC Flow', 'Hip-Hop', 198, urban_beats_id, '/music/hiphop/street-dreams.mp3', NOW(), NOW()),
  ('City Hustle', 'The Rapper', 'Hip-Hop', 215, urban_beats_id, '/music/hiphop/city-hustle.mp3', NOW(), NOW()),
  ('Money Moves', 'Cash Flow', 'Hip-Hop', 187, urban_beats_id, '/music/hiphop/money-moves.mp3', NOW(), NOW()),
  ('Trap House', 'Trap King', 'Hip-Hop', 223, urban_beats_id, '/music/hiphop/trap-house.mp3', NOW(), NOW()),
  ('Bass Drop', 'Heavy Beats', 'Hip-Hop', 201, urban_beats_id, '/music/hiphop/bass-drop.mp3', NOW(), NOW()),
  ('Rhyme Time', 'Lyric Master', 'Hip-Hop', 192, urban_beats_id, '/music/hiphop/rhyme-time.mp3', NOW(), NOW()),
  ('Urban Legend', 'Street Poet', 'Hip-Hop', 234, urban_beats_id, '/music/hiphop/urban-legend.mp3', NOW(), NOW()),
  ('Concrete Jungle', 'City Rapper', 'Hip-Hop', 209, urban_beats_id, '/music/hiphop/concrete-jungle.mp3', NOW(), NOW()),
  ('Mic Check', 'The Emcee', 'Hip-Hop', 178, urban_beats_id, '/music/hiphop/mic-check.mp3', NOW(), NOW()),
  ('Beat Master', 'DJ Supreme', 'Hip-Hop', 219, urban_beats_id, '/music/hiphop/beat-master.mp3', NOW(), NOW()),
  ('Flow State', 'Rhythm King', 'Hip-Hop', 205, urban_beats_id, '/music/hiphop/flow-state.mp3', NOW(), NOW()),
  ('Street Code', 'Hood Poet', 'Hip-Hop', 198, urban_beats_id, '/music/hiphop/street-code.mp3', NOW(), NOW()),
  ('Rap Game', 'Game Changer', 'Hip-Hop', 212, urban_beats_id, '/music/hiphop/rap-game.mp3', NOW(), NOW()),
  ('Block Party', 'Party Starter', 'Hip-Hop', 227, urban_beats_id, '/music/hiphop/block-party.mp3', NOW(), NOW()),
  ('Bass Boom', 'Low End', 'Hip-Hop', 193, urban_beats_id, '/music/hiphop/bass-boom.mp3', NOW(), NOW()),
  ('Lyric Assassin', 'Word Smith', 'Hip-Hop', 215, urban_beats_id, '/music/hiphop/lyric-assassin.mp3', NOW(), NOW()),
  ('Street Anthem', 'Hood Hero', 'Hip-Hop', 234, urban_beats_id, '/music/hiphop/street-anthem.mp3', NOW(), NOW()),
  ('Trap Beat', 'Beat Maker', 'Hip-Hop', 201, urban_beats_id, '/music/hiphop/trap-beat.mp3', NOW(), NOW()),
  ('Rap Battle', 'MC Warrior', 'Hip-Hop', 189, urban_beats_id, '/music/hiphop/rap-battle.mp3', NOW(), NOW()),
  ('Hood Stories', 'Story Teller', 'Hip-Hop', 224, urban_beats_id, '/music/hiphop/hood-stories.mp3', NOW(), NOW()),
  ('Beat Switch', 'Flow Master', 'Hip-Hop', 207, urban_beats_id, '/music/hiphop/beat-switch.mp3', NOW(), NOW()),
  ('Street King', 'Crown Holder', 'Hip-Hop', 218, urban_beats_id, '/music/hiphop/street-king.mp3', NOW(), NOW()),
  ('Rap God', 'Legend MC', 'Hip-Hop', 256, urban_beats_id, '/music/hiphop/rap-god.mp3', NOW(), NOW()),
  ('Trap Lord', 'Beat King', 'Hip-Hop', 195, urban_beats_id, '/music/hiphop/trap-lord.mp3', NOW(), NOW()),
  ('City Lights', 'Urban Flow', 'Hip-Hop', 212, urban_beats_id, '/music/hiphop/city-lights.mp3', NOW(), NOW()),
  ('Bass Heavy', 'Sub King', 'Hip-Hop', 203, urban_beats_id, '/music/hiphop/bass-heavy.mp3', NOW(), NOW()),
  ('Street Life', 'Real MC', 'Hip-Hop', 228, urban_beats_id, '/music/hiphop/street-life.mp3', NOW(), NOW()),
  ('Rap Star', 'Star MC', 'Hip-Hop', 191, urban_beats_id, '/music/hiphop/rap-star.mp3', NOW(), NOW()),
  ('Hood Fame', 'Fame Hunter', 'Hip-Hop', 215, urban_beats_id, '/music/hiphop/hood-fame.mp3', NOW(), NOW()),
  ('Beat Drop', 'Drop Master', 'Hip-Hop', 198, urban_beats_id, '/music/hiphop/beat-drop.mp3', NOW(), NOW()),
  ('Street Money', 'Cash MC', 'Hip-Hop', 207, urban_beats_id, '/music/hiphop/street-money.mp3', NOW(), NOW()),
  ('Rap Flow', 'Flow King', 'Hip-Hop', 223, urban_beats_id, '/music/hiphop/rap-flow.mp3', NOW(), NOW()),
  ('Trap Music', 'Trap Master', 'Hip-Hop', 189, urban_beats_id, '/music/hiphop/trap-music.mp3', NOW(), NOW()),
  ('City Beat', 'Urban Sound', 'Hip-Hop', 214, urban_beats_id, '/music/hiphop/city-beat.mp3', NOW(), NOW()),
  ('Street Rap', 'Hood MC', 'Hip-Hop', 201, urban_beats_id, '/music/hiphop/street-rap.mp3', NOW(), NOW());

  -- ========== ROCK ТРЕКИ (25 треков) ==========
  
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Thunder Road', 'Rock Legends', 'Rock', 267, steel_horizon_id, '/music/rock/thunder-road.mp3', NOW(), NOW()),
  ('Electric Guitar', 'Shred Masters', 'Rock', 245, steel_horizon_id, '/music/rock/electric-guitar.mp3', NOW(), NOW()),
  ('Steel Heart', 'Metal Core', 'Rock', 289, steel_horizon_id, '/music/rock/steel-heart.mp3', NOW(), NOW()),
  ('Rock Anthem', 'Arena Rock', 'Rock', 234, steel_horizon_id, '/music/rock/rock-anthem.mp3', NOW(), NOW()),
  ('Guitar Hero', 'Solo King', 'Rock', 298, steel_horizon_id, '/music/rock/guitar-hero.mp3', NOW(), NOW()),
  ('Power Chord', 'Heavy Rock', 'Rock', 256, steel_horizon_id, '/music/rock/power-chord.mp3', NOW(), NOW()),
  ('Rock Revolution', 'Rebel Sound', 'Rock', 278, steel_horizon_id, '/music/rock/rock-revolution.mp3', NOW(), NOW()),
  ('Steel Storm', 'Thunder Rock', 'Rock', 267, steel_horizon_id, '/music/rock/steel-storm.mp3', NOW(), NOW()),
  ('Wild Nights', 'Rock Party', 'Rock', 245, steel_horizon_id, '/music/rock/wild-nights.mp3', NOW(), NOW()),
  ('Heavy Metal', 'Metal Gods', 'Rock', 312, steel_horizon_id, '/music/rock/heavy-metal.mp3', NOW(), NOW()),
  ('Rock Star', 'Legend Band', 'Rock', 234, steel_horizon_id, '/music/rock/rock-star.mp3', NOW(), NOW()),
  ('Guitar Solo', 'Shred God', 'Rock', 289, steel_horizon_id, '/music/rock/guitar-solo.mp3', NOW(), NOW()),
  ('Arena Rock', 'Stadium Sound', 'Rock', 267, steel_horizon_id, '/music/rock/arena-rock.mp3', NOW(), NOW()),
  ('Rock Ballad', 'Soft Rock', 'Rock', 312, steel_horizon_id, '/music/rock/rock-ballad.mp3', NOW(), NOW()),
  ('Metal Heart', 'Iron Soul', 'Rock', 256, steel_horizon_id, '/music/rock/metal-heart.mp3', NOW(), NOW()),
  ('Thunder Strike', 'Lightning Rock', 'Rock', 245, steel_horizon_id, '/music/rock/thunder-strike.mp3', NOW(), NOW()),
  ('Rock Solid', 'Stone Band', 'Rock', 267, steel_horizon_id, '/music/rock/rock-solid.mp3', NOW(), NOW()),
  ('Guitar Riff', 'Riff Master', 'Rock', 234, steel_horizon_id, '/music/rock/guitar-riff.mp3', NOW(), NOW()),
  ('Heavy Sound', 'Weight Rock', 'Rock', 289, steel_horizon_id, '/music/rock/heavy-sound.mp3', NOW(), NOW()),
  ('Rock Legends', 'Hall of Fame', 'Rock', 298, steel_horizon_id, '/music/rock/rock-legends.mp3', NOW(), NOW()),
  ('Steel Guitar', 'Metal String', 'Rock', 256, steel_horizon_id, '/music/rock/steel-guitar.mp3', NOW(), NOW()),
  ('Rock Power', 'Energy Band', 'Rock', 245, steel_horizon_id, '/music/rock/rock-power.mp3', NOW(), NOW()),
  ('Thunder Bolt', 'Storm Rock', 'Rock', 267, steel_horizon_id, '/music/rock/thunder-bolt.mp3', NOW(), NOW()),
  ('Rock Nation', 'Unity Band', 'Rock', 278, steel_horizon_id, '/music/rock/rock-nation.mp3', NOW(), NOW()),
  ('Guitar Storm', 'Tornado Rock', 'Rock', 289, steel_horizon_id, '/music/rock/guitar-storm.mp3', NOW(), NOW());

  -- ========== JAZZ ТРЕКИ (20 треков) ==========
  
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Smooth Jazz', 'Jazz Masters', 'Jazz', 312, harmonic_flow_id, '/music/jazz/smooth-jazz.mp3', NOW(), NOW()),
  ('Blue Note', 'The Quartet', 'Jazz', 289, harmonic_flow_id, '/music/jazz/blue-note.mp3', NOW(), NOW()),
  ('Midnight Sax', 'Sax Player', 'Jazz', 267, harmonic_flow_id, '/music/jazz/midnight-sax.mp3', NOW(), NOW()),
  ('Jazz Cafe', 'Lounge Band', 'Jazz', 245, harmonic_flow_id, '/music/jazz/jazz-cafe.mp3', NOW(), NOW()),
  ('Piano Blues', 'Keys Master', 'Jazz', 298, harmonic_flow_id, '/music/jazz/piano-blues.mp3', NOW(), NOW()),
  ('Swing Time', 'Big Band', 'Jazz', 234, harmonic_flow_id, '/music/jazz/swing-time.mp3', NOW(), NOW()),
  ('Cool Jazz', 'West Coast', 'Jazz', 278, harmonic_flow_id, '/music/jazz/cool-jazz.mp3', NOW(), NOW()),
  ('Bebop Nights', 'The Quintet', 'Jazz', 256, harmonic_flow_id, '/music/jazz/bebop-nights.mp3', NOW(), NOW()),
  ('Jazz Standards', 'Classic Jazz', 'Jazz', 312, harmonic_flow_id, '/music/jazz/jazz-standards.mp3', NOW(), NOW()),
  ('Trumpet Call', 'Horn Section', 'Jazz', 289, harmonic_flow_id, '/music/jazz/trumpet-call.mp3', NOW(), NOW()),
  ('Jazz Fusion', 'Modern Jazz', 'Jazz', 267, harmonic_flow_id, '/music/jazz/jazz-fusion.mp3', NOW(), NOW()),
  ('Bass Walk', 'Walking Bass', 'Jazz', 245, harmonic_flow_id, '/music/jazz/bass-walk.mp3', NOW(), NOW()),
  ('Jazz Club', 'Live Session', 'Jazz', 334, harmonic_flow_id, '/music/jazz/jazz-club.mp3', NOW(), NOW()),
  ('Smooth Vibes', 'Chill Jazz', 'Jazz', 298, harmonic_flow_id, '/music/jazz/smooth-vibes.mp3', NOW(), NOW()),
  ('Jazz Piano', 'Solo Piano', 'Jazz', 312, harmonic_flow_id, '/music/jazz/jazz-piano.mp3', NOW(), NOW()),
  ('Sax Solo', 'Saxophone', 'Jazz', 278, harmonic_flow_id, '/music/jazz/sax-solo.mp3', NOW(), NOW()),
  ('Jazz Ballad', 'Slow Jazz', 'Jazz', 356, harmonic_flow_id, '/music/jazz/jazz-ballad.mp3', NOW(), NOW()),
  ('Latin Jazz', 'Salsa Jazz', 'Jazz', 267, world_fusion_id, '/music/jazz/latin-jazz.mp3', NOW(), NOW()),
  ('Jazz Groove', 'Funk Jazz', 'Jazz', 245, harmonic_flow_id, '/music/jazz/jazz-groove.mp3', NOW(), NOW()),
  ('Midnight Blues', 'Blues Jazz', 'Jazz', 323, harmonic_flow_id, '/music/jazz/midnight-blues.mp3', NOW(), NOW());

  -- ========== SOUL ТРЕКИ (20 треков) ==========
  
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Soul Power', 'Soul Singers', 'Soul', 234, soul_connection_id, '/music/soul/soul-power.mp3', NOW(), NOW()),
  ('Heartfelt', 'The Emotions', 'Soul', 256, soul_connection_id, '/music/soul/heartfelt.mp3', NOW(), NOW()),
  ('Deep Soul', 'Soul Masters', 'Soul', 289, soul_connection_id, '/music/soul/deep-soul.mp3', NOW(), NOW()),
  ('Soulful Nights', 'Night Soul', 'Soul', 267, soul_connection_id, '/music/soul/soulful-nights.mp3', NOW(), NOW()),
  ('R&B Groove', 'Groove Soul', 'Soul', 245, soul_connection_id, '/music/soul/rnb-groove.mp3', NOW(), NOW()),
  ('Soul Searching', 'Inner Soul', 'Soul', 312, soul_connection_id, '/music/soul/soul-searching.mp3', NOW(), NOW()),
  ('Smooth Soul', 'Velvet Voice', 'Soul', 278, soul_connection_id, '/music/soul/smooth-soul.mp3', NOW(), NOW()),
  ('Soul Fire', 'Passion Soul', 'Soul', 234, soul_connection_id, '/music/soul/soul-fire.mp3', NOW(), NOW()),
  ('Neo Soul', 'Modern Soul', 'Soul', 256, soul_connection_id, '/music/soul/neo-soul.mp3', NOW(), NOW()),
  ('Soul Train', 'Funk Soul', 'Soul', 289, soul_connection_id, '/music/soul/soul-train.mp3', NOW(), NOW()),
  ('Soulmate', 'Love Soul', 'Soul', 267, soul_connection_id, '/music/soul/soulmate.mp3', NOW(), NOW()),
  ('Soul Kitchen', 'Cooking Soul', 'Soul', 245, soul_connection_id, '/music/soul/soul-kitchen.mp3', NOW(), NOW()),
  ('Soul Sister', 'Sister Soul', 'Soul', 298, soul_connection_id, '/music/soul/soul-sister.mp3', NOW(), NOW()),
  ('Soul Brother', 'Brother Soul', 'Soul', 234, soul_connection_id, '/music/soul/soul-brother.mp3', NOW(), NOW()),
  ('Soul Music', 'Pure Soul', 'Soul', 278, soul_connection_id, '/music/soul/soul-music.mp3', NOW(), NOW()),
  ('Soul Legend', 'Classic Soul', 'Soul', 312, soul_connection_id, '/music/soul/soul-legend.mp3', NOW(), NOW()),
  ('Soul Voice', 'Vocal Soul', 'Soul', 256, soul_connection_id, '/music/soul/soul-voice.mp3', NOW(), NOW()),
  ('Soul Rhythm', 'Beat Soul', 'Soul', 267, soul_connection_id, '/music/soul/soul-rhythm.mp3', NOW(), NOW()),
  ('Soul Harmony', 'Choir Soul', 'Soul', 289, soul_connection_id, '/music/soul/soul-harmony.mp3', NOW(), NOW()),
  ('Soul Connection', 'United Soul', 'Soul', 245, soul_connection_id, '/music/soul/soul-connection.mp3', NOW(), NOW());

  -- ========== AMBIENT / CHILL ТРЕКИ (20 треков) ==========
  
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Floating Dreams', 'Ambient Master', 'Ambient', 378, digital_dreams_id, '/music/ambient/floating-dreams.mp3', NOW(), NOW()),
  ('Space Drift', 'Cosmos Sound', 'Ambient', 423, digital_dreams_id, '/music/ambient/space-drift.mp3', NOW(), NOW()),
  ('Ocean Waves', 'Nature Sounds', 'Ambient', 356, world_fusion_id, '/music/ambient/ocean-waves.mp3', NOW(), NOW()),
  ('Mountain Air', 'High Altitude', 'Ambient', 389, world_fusion_id, '/music/ambient/mountain-air.mp3', NOW(), NOW()),
  ('Forest Path', 'Nature Walk', 'Ambient', 412, world_fusion_id, '/music/ambient/forest-path.mp3', NOW(), NOW()),
  ('Desert Wind', 'Sand Dunes', 'Ambient', 367, world_fusion_id, '/music/ambient/desert-wind.mp3', NOW(), NOW()),
  ('Arctic Aurora', 'Northern Lights', 'Ambient', 445, digital_dreams_id, '/music/ambient/arctic-aurora.mp3', NOW(), NOW()),
  ('Zen Garden', 'Meditation', 'Ambient', 378, harmonic_flow_id, '/music/ambient/zen-garden.mp3', NOW(), NOW()),
  ('Crystal Cave', 'Echo Space', 'Ambient', 398, digital_dreams_id, '/music/ambient/crystal-cave.mp3', NOW(), NOW()),
  ('Cloud Nine', 'Sky Drift', 'Ambient', 356, digital_dreams_id, '/music/ambient/cloud-nine.mp3', NOW(), NOW()),
  ('Deep Blue', 'Ocean Deep', 'Ambient', 434, world_fusion_id, '/music/ambient/deep-blue.mp3', NOW(), NOW()),
  ('Starfield', 'Space Ambient', 'Ambient', 467, digital_dreams_id, '/music/ambient/starfield.mp3', NOW(), NOW()),
  ('Peaceful Mind', 'Inner Peace', 'Ambient', 389, harmonic_flow_id, '/music/ambient/peaceful-mind.mp3', NOW(), NOW()),
  ('Tranquil Waters', 'Lake Sound', 'Ambient', 412, world_fusion_id, '/music/ambient/tranquil-waters.mp3', NOW(), NOW()),
  ('Dawn Chorus', 'Bird Songs', 'Ambient', 378, world_fusion_id, '/music/ambient/dawn-chorus.mp3', NOW(), NOW()),
  ('Nebula Dreams', 'Cosmic Drift', 'Ambient', 445, digital_dreams_id, '/music/ambient/nebula-dreams.mp3', NOW(), NOW()),
  ('Sunset Meditation', 'Evening Calm', 'Ambient', 398, electric_sunset_id, '/music/ambient/sunset-meditation.mp3', NOW(), NOW()),
  ('Rain Sounds', 'Weather Ambient', 'Ambient', 423, world_fusion_id, '/music/ambient/rain-sounds.mp3', NOW(), NOW()),
  ('Himalayan Winds', 'Mountain Sound', 'Ambient', 456, world_fusion_id, '/music/ambient/himalayan-winds.mp3', NOW(), NOW()),
  ('Infinite Space', 'Void Ambient', 'Ambient', 489, digital_dreams_id, '/music/ambient/infinite-space.mp3', NOW(), NOW());

  -- ========== INDIE ТРЕКИ (15 треков) ==========
  
  INSERT INTO "Tracks" (title, artist, genre, duration, "albumId", "filePath", "createdAt", "updatedAt") VALUES
  ('Coffee Shop', 'Indie Folk', 'Indie', 234, indie_discovery_id, '/music/indie/coffee-shop.mp3', NOW(), NOW()),
  ('Bedroom Pop', 'Lo-Fi Dreams', 'Indie', 198, indie_discovery_id, '/music/indie/bedroom-pop.mp3', NOW(), NOW()),
  ('Vinyl Days', 'Retro Indie', 'Indie', 245, indie_discovery_id, '/music/indie/vinyl-days.mp3', NOW(), NOW()),
  ('Art House', 'Creative Sound', 'Indie', 267, indie_discovery_id, '/music/indie/art-house.mp3', NOW(), NOW()),
  ('Brooklyn Nights', 'Urban Indie', 'Indie', 223, indie_discovery_id, '/music/indie/brooklyn-nights.mp3', NOW(), NOW()),
  ('Acoustic Soul', 'Unplugged', 'Indie', 289, indie_discovery_id, '/music/indie/acoustic-soul.mp3', NOW(), NOW()),
  ('Indie Spirit', 'Free Sound', 'Indie', 256, indie_discovery_id, '/music/indie/indie-spirit.mp3', NOW(), NOW()),
  ('Alt Culture', 'Alternative', 'Indie', 234, indie_discovery_id, '/music/indie/alt-culture.mp3', NOW(), NOW()),
  ('Garage Band', 'DIY Music', 'Indie', 212, indie_discovery_id, '/music/indie/garage-band.mp3', NOW(), NOW()),
  ('Festival Vibes', 'Indie Rock', 'Indie', 278, indie_discovery_id, '/music/indie/festival-vibes.mp3', NOW(), NOW()),
  ('Indie Folk', 'Acoustic Folk', 'Indie', 298, indie_discovery_id, '/music/indie/indie-folk.mp3', NOW(), NOW()),
  ('Lo-Fi Beats', 'Chill Indie', 'Indie', 189, indie_discovery_id, '/music/indie/lofi-beats.mp3', NOW(), NOW()),
  ('Dream Pop', 'Dreamy Indie', 'Indie', 267, indie_discovery_id, '/music/indie/dream-pop.mp3', NOW(), NOW()),
  ('Shoegaze', 'Wall of Sound', 'Indie', 312, indie_discovery_id, '/music/indie/shoegaze.mp3', NOW(), NOW()),
  ('Indie Dance', 'Dance Rock', 'Indie', 245, indie_discovery_id, '/music/indie/indie-dance.mp3', NOW(), NOW());

END $$;

-- Проверка загруженных треков
SELECT genre, COUNT(*) as count 
FROM "Tracks" 
GROUP BY genre 
ORDER BY count DESC;

SELECT COUNT(*) as total_tracks FROM "Tracks";

-- Показать примеры треков по каждому жанру
SELECT genre, title, artist, duration 
FROM "Tracks" 
ORDER BY genre, id 
LIMIT 50;
