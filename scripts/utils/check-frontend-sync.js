// Простая проверка синхронизации фронтенд-бэкенд
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function checkSync() {
  console.log('🔍 Проверка синхронизации фронтенд-бэкенд\n');
  
  const tests = [
    { name: 'Треки', url: `${API_URL}/music/tracks?limit=5` },
    { name: 'Альбомы', url: `${API_URL}/music/albums?limit=5` },
    { name: 'Плейлисты', url: `${API_URL}/music/playlists/editorial` },
    { name: 'Жанры', url: `${API_URL}/music/genres` },
    { name: 'Поиск', url: `${API_URL}/music/search?q=music&limit=3` }
  ];

  let passed = 0;
  
  for (const test of tests) {
    try {
      const response = await axios.get(test.url, { timeout: 5000 });
      const data = response.data;
      
      let count = 0;
      if (data.tracks) count = data.tracks.length;
      if (data.albums) count = data.albums.length;
      if (data.playlists) count = data.playlists.length;
      if (data.genres) count = data.genres.length;
      if (data.results) count = Object.values(data.results).flat().length;
      
      console.log(`✅ ${test.name}: ${count} записей`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: Ошибка - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Результат: ${passed}/${tests.length} тестов пройдено`);
  console.log(passed === tests.length ? '🎉 Синхронизация работает!' : '⚠️ Есть проблемы');
}

checkSync();
