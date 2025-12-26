const { Playlist } = require('./src/models');

async function updatePlaylists() {
  try {
    const result = await Playlist.update(
      { 
        metadata: { type: 'editorial', priority: 1 }
      },
      { 
        where: { isEditorial: true }
      }
    );
    
    console.log('✅ Обновлено плейлистов:', result[0]);
    
    // Проверка
    const count = await Playlist.count({
      where: {
        metadata: {
          type: 'editorial'
        }
      }
    });
    
    console.log('📊 Редакционных плейлистов:', count);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    process.exit(0);
  }
}

updatePlaylists();
