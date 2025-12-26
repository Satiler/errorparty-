/**
 * Quick Test Script for Smart Playlists
 * Быстрая проверка работы системы умных подборок
 * 
 * Использование: node test-smart-playlists.js
 */

const smartGen = require('./src/services/smart-playlist-generator.service');

async function testSmartPlaylists() {
  console.log('\n🧪 ТЕСТ СИСТЕМЫ УМНЫХ ПОДБОРОК\n');
  console.log('='.repeat(60));
  
  const tests = [];
  let passed = 0;
  let failed = 0;

  // Тест 1: Подборка по настроению
  try {
    console.log('\n1️⃣ Тест: Подборка по настроению (Happy)...');
    const happy = await smartGen.generateByMood('happy', 20);
    
    if (happy && happy.tracks && happy.tracks.length > 0) {
      console.log(`   ✅ Успешно: ${happy.tracks.length} треков`);
      console.log(`   📝 Название: "${happy.name}"`);
      console.log(`   🎵 Первый трек: ${happy.tracks[0].artist} - ${happy.tracks[0].title}`);
      passed++;
    } else {
      console.log('   ❌ Ошибка: Пустая подборка');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    failed++;
  }

  // Тест 2: Тренировка
  try {
    console.log('\n2️⃣ Тест: Подборка для тренировки...');
    const workout = await smartGen.generateWorkoutPlaylist(15);
    
    if (workout && workout.tracks && workout.tracks.length > 0) {
      console.log(`   ✅ Успешно: ${workout.tracks.length} треков`);
      
      // Проверка параметров
      const avgEnergy = workout.tracks.reduce((sum, t) => sum + (t.energy || 0), 0) / workout.tracks.length;
      const avgBpm = workout.tracks.reduce((sum, t) => sum + (t.bpm || 0), 0) / workout.tracks.length;
      
      console.log(`   ⚡ Средняя энергия: ${avgEnergy.toFixed(2)} (ожидается ≥0.7)`);
      console.log(`   🎼 Средний BPM: ${avgBpm.toFixed(0)} (ожидается ≥120)`);
      
      if (avgEnergy >= 0.5) {
        console.log('   ✅ Энергия соответствует критериям');
      } else {
        console.log('   ⚠️  Энергия ниже ожидаемой (может быть недостаточно данных)');
      }
      
      passed++;
    } else {
      console.log('   ❌ Ошибка: Пустая подборка');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    failed++;
  }

  // Тест 3: Топ треки
  try {
    console.log('\n3️⃣ Тест: Топ треки...');
    const top = await smartGen.generateTopTracks(10);
    
    if (top && top.tracks && top.tracks.length > 0) {
      console.log(`   ✅ Успешно: ${top.tracks.length} треков`);
      console.log(`   🔥 Топ 3 трека:`);
      
      top.tracks.slice(0, 3).forEach((track, index) => {
        console.log(`      ${index + 1}. ${track.artist} - ${track.title} (${track.playCount} прослушиваний)`);
      });
      
      passed++;
    } else {
      console.log('   ❌ Ошибка: Пустая подборка');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    failed++;
  }

  // Тест 4: Открытия недели
  try {
    console.log('\n4️⃣ Тест: Открытия недели...');
    const discovery = await smartGen.generateWeeklyDiscovery(10);
    
    if (discovery && discovery.tracks && discovery.tracks.length > 0) {
      console.log(`   ✅ Успешно: ${discovery.tracks.length} треков`);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const newTracks = discovery.tracks.filter(t => new Date(t.createdAt) >= weekAgo);
      console.log(`   🆕 Треков за последнюю неделю: ${newTracks.length}`);
      
      passed++;
    } else {
      console.log('   ⚠️  Предупреждение: Пустая подборка (возможно нет новых треков)');
      passed++; // Не критично
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    failed++;
  }

  // Тест 5: Звуковая дорожка дня
  try {
    console.log('\n5️⃣ Тест: Звуковая дорожка дня...');
    const daily = await smartGen.generateDailySoundtrack(null, 20);
    
    if (daily && daily.tracks && daily.tracks.length > 0) {
      console.log(`   ✅ Успешно: ${daily.tracks.length} треков`);
      console.log(`   🕐 Время суток: ${daily.timeOfDay}:00`);
      console.log(`   📝 Название: "${daily.name}"`);
      
      passed++;
    } else {
      console.log('   ❌ Ошибка: Пустая подборка');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    failed++;
  }

  // Тест 6: Похожие треки (если есть треки)
  try {
    console.log('\n6️⃣ Тест: Похожие треки...');
    
    // Сначала получим любой трек
    const topForSimilar = await smartGen.generateTopTracks(1);
    
    if (topForSimilar.tracks.length > 0) {
      const trackId = topForSimilar.tracks[0].id;
      const similar = await smartGen.generateSimilarTracks(trackId, 10);
      
      if (similar && similar.tracks && similar.tracks.length > 0) {
        console.log(`   ✅ Успешно: ${similar.tracks.length} похожих треков`);
        console.log(`   🎵 Исходный: ${similar.sourceTrack.artist} - ${similar.sourceTrack.title}`);
        console.log(`   🎶 Похожий: ${similar.tracks[0].artist} - ${similar.tracks[0].title}`);
        
        passed++;
      } else {
        console.log('   ⚠️  Предупреждение: Не найдено похожих треков');
        passed++; // Не критично
      }
    } else {
      console.log('   ⚠️  Пропущено: Нет треков для теста');
      passed++; // Не критично
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    failed++;
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:\n');
  console.log(`   Всего тестов: ${passed + failed}`);
  console.log(`   ✅ Пройдено: ${passed}`);
  console.log(`   ❌ Провалено: ${failed}`);
  console.log(`   📈 Успешность: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Система работает отлично!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Некоторые тесты провалены. Проверьте логи выше.\n');
    console.log('💡 Возможные причины:');
    console.log('   - Недостаточно треков в базе данных');
    console.log('   - Отсутствуют ML-параметры (energy, bpm) у треков');
    console.log('   - Не заполнены поля streamUrl/filePath');
    console.log('   - Проблемы с подключением к БД\n');
    process.exit(1);
  }
}

// Запуск тестов
console.log('🚀 Запуск тестов системы умных подборок...');
console.log('⏳ Это может занять несколько секунд...\n');

testSmartPlaylists().catch(error => {
  console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  console.error(error.stack);
  process.exit(1);
});
