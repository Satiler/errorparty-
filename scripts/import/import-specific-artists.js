/**
 * Импорт треков конкретных артистов с KissVK
 */

const axios = require('axios');
const { Track } = require('./src/models');
const { Op } = require('sequelize');

async function importArtistTracks() {
  try {
    const artists = ['Eminem', 'Rihanna', 'Bones', 'Miyagi'];
    
    console.log('\n=== ИМПОРТ ТРЕКОВ АРТИСТОВ С KISSVK ===\n');

    for (const artistName of artists) {
      console.log(`\n🔍 Ищем треки артиста: ${artistName}`);
      
      try {
        // Запрос к API KissVK для поиска артиста
        const searchUrl = `https://kissvk.top/api/search?q=${encodeURIComponent(artistName)}&type=track&limit=50`;
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://kissvk.top/'
          },
          timeout: 10000
        });

        if (!response.data || !response.data.tracks || response.data.tracks.length === 0) {
          console.log(`   ⚠️  Треки не найдены`);
          continue;
        }

        const tracks = response.data.tracks;
        console.log(`   📦 Найдено ${tracks.length} треков`);

        let imported = 0;
        let skipped = 0;

        for (const track of tracks) {
          // Проверяем, есть ли уже такой трек
          const existing = await Track.findOne({
            where: {
              [Op.or]: [
                { externalId: track.id?.toString() },
                {
                  [Op.and]: [
                    { title: track.title },
                    { artist: track.artist }
                  ]
                }
              ]
            }
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Создаем новый трек
          await Track.create({
            title: track.title,
            artist: track.artist,
            duration: track.duration || 0,
            streamUrl: track.url || null,
            externalUrl: track.url || null,
            coverUrl: track.cover_url || track.coverUrl || null,
            externalId: track.id?.toString() || null,
            source: 'kissvk',
            year: track.year || new Date().getFullYear()
          });

          imported++;
        }

        console.log(`   ✅ Импортировано: ${imported}, Пропущено: ${skipped}`);

      } catch (error) {
        console.error(`   ❌ Ошибка при импорте ${artistName}:`, error.message);
      }

      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ ИМПОРТ ЗАВЕРШЕН!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

importArtistTracks();
