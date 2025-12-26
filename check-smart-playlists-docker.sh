#!/bin/bash
# Smart Playlists Docker Setup Checker
# Проверка настройки автозапуска умных подборок

echo "🔍 ПРОВЕРКА НАСТРОЙКИ SMART PLAYLISTS В DOCKER"
echo "================================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Счетчики
PASSED=0
FAILED=0

# Функция проверки
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ $1${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# 1. Проверка Docker контейнера
echo "1️⃣ Проверка Docker контейнера..."
docker ps | grep errorparty_backend > /dev/null 2>&1
check "Контейнер errorparty_backend запущен"
echo ""

# 2. Проверка переменной окружения
echo "2️⃣ Проверка переменных окружения..."
docker exec errorparty_backend printenv | grep ENABLE_SMART_PLAYLISTS > /dev/null 2>&1
check "Переменная ENABLE_SMART_PLAYLISTS установлена"
echo ""

# 3. Проверка файлов
echo "3️⃣ Проверка файлов в контейнере..."
docker exec errorparty_backend test -f /app/src/schedulers/smart-playlists.scheduler.js
check "Файл smart-playlists.scheduler.js существует"

docker exec errorparty_backend test -f /app/src/services/smart-playlist-generator.service.js
check "Файл smart-playlist-generator.service.js существует"

docker exec errorparty_backend test -f /app/rebuild-playlists.js
check "Файл rebuild-playlists.js существует"
echo ""

# 4. Проверка node-cron
echo "4️⃣ Проверка зависимостей..."
docker exec errorparty_backend npm list node-cron > /dev/null 2>&1
check "Пакет node-cron установлен"
echo ""

# 5. Проверка логов запуска
echo "5️⃣ Проверка логов планировщика..."
docker logs errorparty_backend 2>&1 | grep "Smart Playlists scheduler started" > /dev/null 2>&1
check "Планировщик запущен (в логах)"
echo ""

# 6. Проверка API endpoints
echo "6️⃣ Проверка API endpoints..."
curl -s http://localhost:3001/api/music/smart-playlists/available > /dev/null 2>&1
check "API endpoint /available отвечает"
echo ""

# 7. Проверка подборок в БД
echo "7️⃣ Проверка базы данных..."
COUNT=$(docker exec errorparty_postgres psql -U errorparty_user -d errorparty_db -t -c "SELECT COUNT(*) FROM \"Playlists\" WHERE type = 'editorial';" 2>/dev/null | tr -d ' ')

if [ ! -z "$COUNT" ] && [ "$COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Найдено $COUNT editorial плейлистов${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Editorial плейлисты не найдены (возможно, нужно запустить первую генерацию)${NC}"
    echo "   Запустите: docker exec errorparty_backend node rebuild-playlists.js"
fi
echo ""

# 8. Тест генерации
echo "8️⃣ Тест генерации подборки..."
RESULT=$(docker exec errorparty_backend node -e "
const smartGen = require('./src/services/smart-playlist-generator.service');
(async () => {
  try {
    const result = await smartGen.generateTopTracks(5);
    console.log(result.tracks.length);
    process.exit(0);
  } catch (e) {
    console.error('ERROR');
    process.exit(1);
  }
})();
" 2>&1)

if [ "$RESULT" != "ERROR" ] && [ ! -z "$RESULT" ]; then
    echo -e "${GREEN}✅ Генерация работает (получено $RESULT треков)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Ошибка генерации${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Итоги
echo "================================================"
echo "📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:"
echo ""
echo "   Успешно: $PASSED"
echo "   Ошибок: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!${NC}"
    echo ""
    echo "✅ Система умных подборок настроена и работает!"
    echo ""
    echo "📋 Следующие шаги:"
    echo "   1. Запустите первую генерацию:"
    echo "      docker exec errorparty_backend node rebuild-playlists.js"
    echo ""
    echo "   2. Проверьте API:"
    echo "      curl http://localhost:3001/api/music/smart-playlists/available"
    echo ""
    echo "   3. Запустите тесты:"
    echo "      docker exec errorparty_backend node test-smart-playlists.js"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ!${NC}"
    echo ""
    echo "🔧 Рекомендации:"
    echo "   1. Проверьте логи контейнера:"
    echo "      docker logs errorparty_backend"
    echo ""
    echo "   2. Перезапустите контейнер:"
    echo "      docker-compose restart backend"
    echo ""
    echo "   3. Пересоберите образ:"
    echo "      docker-compose build --no-cache backend"
    echo "      docker-compose up -d"
    echo ""
    exit 1
fi
