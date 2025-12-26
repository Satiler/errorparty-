/**
 * Тест ручного запуска scheduler
 */
const axios = require('axios');

async function testScheduler() {
  console.log('\n🔄 ТЕСТ РУЧНОГО ЗАПУСКА SCHEDULER');
  console.log('=' .repeat(80));
  
  try {
    // 1. Проверка статистики до запуска
    console.log('\n1️⃣ Получение статистики scheduler...');
    const statsResponse = await axios.get('http://localhost:3000/api/kissvk/scheduler/stats');
    console.log('Статистика:', JSON.stringify(statsResponse.data, null, 2));
    
    // 2. Ручной запуск импорта
    console.log('\n2️⃣ Ручной запуск импорта...');
    const runResponse = await axios.post('http://localhost:3000/api/kissvk/scheduler/run');
    console.log('Результат:', JSON.stringify(runResponse.data, null, 2));
    
    // 3. Проверка статистики после запуска
    console.log('\n3️⃣ Статистика после запуска...');
    const statsAfter = await axios.get('http://localhost:3000/api/kissvk/scheduler/stats');
    console.log('Статистика:', JSON.stringify(statsAfter.data, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ТЕСТ ЗАВЕРШЕН!');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Ошибка:', error.response.status, error.response.data);
    } else {
      console.error('❌ Ошибка:', error.message);
    }
  }
}

testScheduler();
