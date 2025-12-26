/**
 * Тестирование editorial API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testEditorialAPI() {
  console.log('🧪 Тестирование /api/music/playlists/editorial\n');

  try {
    const response = await axios.get(`${API_BASE}/music/playlists/editorial`);
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Success: ${response.data.success}`);
    console.log(`✅ Total playlists: ${response.data.pagination?.total || response.data.playlists?.length}\n`);
    
    console.log('📋 Плейлисты:');
    response.data.playlists.slice(0, 10).forEach((p, index) => {
      console.log(`  ${index + 1}. [${p.id}] ${p.name}`);
      console.log(`     Треков: ${p.trackCount || 0}`);
      console.log(`     Обложка: ${p.coverUrl ? '✅' : '❌ НЕТ'}`);
      if (p.coverUrl) {
        console.log(`     URL: ${p.coverUrl.substring(0, 80)}...`);
      }
      console.log('');
    });

    console.log('\n✅ API работает корректно!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testEditorialAPI();
