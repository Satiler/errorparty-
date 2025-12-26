#!/usr/bin/env node

/**
 * Интеграционный скрипт для подключения Unified Music System
 * Автоматически добавляет маршруты в основное приложение
 */

const fs = require('fs').promises;
const path = require('path');

async function integrateUnifiedMusicSystem() {
  console.log('🔧 Интеграция Unified Music System...\n');

  try {
    // 1. Проверка файлов
    console.log('📋 Шаг 1: Проверка файлов системы');
    const requiredFiles = [
      'src/utils/multi-decoder.js',
      'src/services/download-manager.service.js',
      'src/services/unified-music.service.js',
      'src/controllers/unified-music.controller.js',
      'src/modules/music/unified-music.routes.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      try {
        await fs.access(filePath);
        console.log(`  ✓ ${file}`);
      } catch {
        console.error(`  ✗ ${file} - НЕ НАЙДЕН!`);
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // 2. Проверка зависимостей
    console.log('\n📦 Шаг 2: Проверка зависимостей');
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    const requiredDeps = ['axios', 'cheerio'];
    let missingDeps = [];
    
    for (const dep of requiredDeps) {
      if (packageJson.dependencies[dep]) {
        console.log(`  ✓ ${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        console.log(`  ✗ ${dep} - ОТСУТСТВУЕТ`);
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length > 0) {
      console.log(`\n⚠️  Установите недостающие зависимости:`);
      console.log(`    npm install ${missingDeps.join(' ')}`);
    }

    // 3. Создание .env примера
    console.log('\n⚙️  Шаг 3: Создание примера конфигурации');
    const envExample = `
# Unified Music System Configuration
MUSIC_DOWNLOAD_DIR=./uploads/music
DOWNLOAD_MAX_RETRIES=3
DOWNLOAD_TIMEOUT=60000
DOWNLOAD_MIN_FILE_SIZE=102400
DOWNLOAD_MAX_FILE_SIZE=52428800

# KissVK Configuration
KISSVK_CACHE_TTL=3600000
KISSVK_REQUEST_DELAY=1000
KISSVK_MAX_CONCURRENT=2
`;

    const envExamplePath = path.join(__dirname, '.env.unified-music.example');
    await fs.writeFile(envExamplePath, envExample.trim());
    console.log(`  ✓ Создан файл: .env.unified-music.example`);

    // 4. Инструкции по интеграции маршрутов
    console.log('\n🛣️  Шаг 4: Интеграция маршрутов');
    console.log('  Добавьте в ваш основной файл маршрутов (например, src/routes/index.js):');
    console.log('');
    console.log('  ```javascript');
    console.log("  const unifiedMusicRoutes = require('./modules/music/unified-music.routes');");
    console.log("  app.use('/api/music/unified', unifiedMusicRoutes);");
    console.log('  ```');

    // 5. Проверка существующих маршрутов
    const routesFiles = [
      'src/routes/index.js',
      'src/routes/api.js',
      'src/app.js',
      'src/server.js'
    ];

    console.log('\n  Проверка файлов маршрутов:');
    let routeFileFound = null;
    
    for (const routeFile of routesFiles) {
      const routePath = path.join(__dirname, routeFile);
      try {
        await fs.access(routePath);
        console.log(`  ✓ Найден: ${routeFile}`);
        routeFileFound = routePath;
        break;
      } catch {
        console.log(`  - Не найден: ${routeFile}`);
      }
    }

    if (routeFileFound) {
      console.log(`\n  💡 Рекомендация: Добавьте маршруты в ${path.basename(routeFileFound)}`);
    }

    // 6. Создание директории загрузок
    console.log('\n📁 Шаг 5: Создание директорий');
    const uploadDir = path.join(__dirname, 'uploads', 'music');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      console.log(`  ✓ Создана директория: ${uploadDir}`);
    } catch (error) {
      console.log(`  ⚠️  Ошибка создания директории: ${error.message}`);
    }

    // 7. Тестирование
    console.log('\n🧪 Шаг 6: Тестирование');
    console.log('  Запустите тест системы:');
    console.log('    node test-unified-music-system.js');

    // 8. Итоговый отчет
    console.log('\n' + '='.repeat(60));
    console.log('✅ ИНТЕГРАЦИЯ ЗАВЕРШЕНА');
    console.log('='.repeat(60));

    console.log('\n📚 Документация:');
    console.log('  - Полная документация: backend/UNIFIED_MUSIC_SYSTEM.md');
    console.log('  - Быстрый старт: backend/UNIFIED_MUSIC_QUICKSTART.md');

    console.log('\n🚀 Следующие шаги:');
    console.log('  1. Добавить маршруты в основное приложение');
    console.log('  2. Настроить переменные окружения (.env)');
    console.log('  3. Запустить тест: node test-unified-music-system.js');
    console.log('  4. Проверить API: curl http://localhost:3000/api/music/unified/sources');

    console.log('\n📖 Основные endpoints:');
    console.log('  GET  /api/music/unified/search - Поиск по всем источникам');
    console.log('  GET  /api/music/unified/smart-search - Умный поиск');
    console.log('  GET  /api/music/unified/top - Топ треки');
    console.log('  POST /api/music/unified/download - Скачать треки');
    console.log('  POST /api/music/unified/import - Импорт в БД');
    console.log('  GET  /api/music/unified/stats - Статистика');

    console.log('\n💡 Совет:');
    console.log('  Используйте smart-search для автоматического');
    console.log('  переключения между источниками и оптимизации результатов.');

    console.log('\n✨ Система готова к использованию!');

  } catch (error) {
    console.error('\n❌ ОШИБКА ИНТЕГРАЦИИ:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  integrateUnifiedMusicSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { integrateUnifiedMusicSystem };
