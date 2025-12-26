const Album = require('../src/models/Album');

(async () => {
  try {
    // Обновляем альбом 2210
    const album = await Album.findByPk(2210);
    
    if (!album) {
      console.log('Альбом 2210 не найден');
      process.exit(1);
    }
    
    const coverUrl = 'https://sun1-98.userapi.com/impg/R9TSiB_Y4QTsYqBTMgJAtiZVFQ7iGFBvfgWnZk4vI31oR8XDK7yZ3sZwjz1fRVB7Ug8lRw/HlJ0Gv4tTgs.jpg?size=600x600&quality=95&sign=aef80eeb9d13ba74c9aec2a17dcef8e0&c_uniq_tag=8Wr7xoS6rAIyV8TRMz3CW9kQUwpXbGCM2NJQY-mJKdE&type=audio';
    
    await album.update({ coverUrl });
    
    console.log(`✅ Альбом "${album.title}" (ID: ${album.id}) обновлен с обложкой`);
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
})();
