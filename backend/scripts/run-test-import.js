const { getInstance } = require('../src/schedulers/kissvk-auto-import.scheduler');

(async () => {
  try {
    const scheduler = getInstance();
    const result = await scheduler.runImport();
    console.log('\n=== РЕЗУЛЬТАТ ИМПОРТА ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
})();
