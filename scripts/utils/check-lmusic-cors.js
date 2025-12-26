#!/usr/bin/env node

const axios = require('axios');

async function checkCORS() {
  const url = 'https://lmusic.kz/api/download/263078';
  
  console.log('🔍 Проверка CORS и заголовков\n');
  console.log('URL:', url, '\n');
  
  try {
    const response = await axios.head(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://errorparty.ru',
        'Referer': 'https://errorparty.ru/'
      },
      timeout: 10000
    });
    
    console.log('✅ Status:', response.status);
    console.log('\n📋 Заголовки ответа:');
    console.log('  Content-Type:', response.headers['content-type']);
    console.log('  Content-Length:', response.headers['content-length']);
    console.log('  Accept-Ranges:', response.headers['accept-ranges']);
    console.log('  Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'] || '❌ НЕТ');
    console.log('  Access-Control-Allow-Methods:', response.headers['access-control-allow-methods'] || '❌ НЕТ');
    console.log('  Access-Control-Allow-Headers:', response.headers['access-control-allow-headers'] || '❌ НЕТ');
    
    console.log('\n📦 Все заголовки:');
    Object.keys(response.headers).forEach(key => {
      console.log(`  ${key}: ${response.headers[key]}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
    }
  }
}

checkCORS().then(() => process.exit(0));
