/**
 * Создание персональных плейлистов для пользователей
 * На основе их лайков и прослушиваний
 */

require('dotenv').config();
const smartDiscovery = require('./src/services/smart-discovery.service');
const { User, TrackLike } = require('./src/models');

async function createPersonalPlaylistsForAllUsers() {
  console.log('🎯 === СОЗДАНИЕ ПЕРСОНАЛЬНЫХ ПЛЕЙЛИСТОВ ===\n');
  console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}\n`);

  try {
    // Получаем всех пользователей с лайками
    const usersWithLikes = await User.findAll({
      include: [{
        model: TrackLike,
        as: 'likedTracks',
        required: true
      }],
      group: ['User.id']
    });

    console.log(`📊 Найдено ${usersWithLikes.length} пользователей с лайками\n`);

    let created = 0;
    let errors = 0;

    for (const user of usersWithLikes) {
      try {
        console.log(`\n👤 Обработка пользователя: ${user.displayName} (ID: ${user.id})`);
        
        const result = await smartDiscovery.createPersonalPlaylist(user.id);
        
        if (result) {
          console.log(`✅ Создан плейлист "${result.playlistName}"`);
          console.log(`   - Треков: ${result.tracksCount}`);
          console.log(`   - Жанры: ${result.topGenres.join(', ')}`);
          console.log(`   - Исполнители: ${result.topArtists.slice(0, 3).join(', ')}`);
          created++;
        }

      } catch (error) {
        console.error(`❌ Ошибка для пользователя ${user.id}:`, error.message);
        errors++;
      }

      // Задержка между пользователями
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n\n🎉 === СОЗДАНИЕ ЗАВЕРШЕНО ===');
    console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}\n`);
    console.log(`✅ Создано плейлистов: ${created}`);
    console.log(`❌ Ошибок: ${errors}`);

    process.exit(0);

  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Если запуск напрямую
if (require.main === module) {
  createPersonalPlaylistsForAllUsers();
}

module.exports = { createPersonalPlaylistsForAllUsers };
