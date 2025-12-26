#!/bin/bash
# Скрипт развертывания ErrorParty на роутере

echo "🚀 ErrorParty Router Deployment Script"
echo "======================================="

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

echo "✅ Docker найден"

# Загрузка образов
echo ""
echo "📦 Загрузка Docker образов..."
docker load -i backend.tar
docker load -i frontend.tar
docker load -i postgres.tar
docker load -i redis.tar
docker load -i nginx.tar

echo ""
echo "✅ Образы загружены"

# Проверка .env
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  Файл .env не найден. Создайте его на основе .env.example"
    echo "   Скопируйте: cp .env.example .env"
    echo "   Отредактируйте пароли в .env"
    exit 1
fi

# Запуск контейнеров
echo ""
echo "🐳 Запуск контейнеров..."
docker-compose up -d

echo ""
echo "⏳ Ожидание готовности сервисов (30 сек)..."
sleep 30

# Проверка статуса
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "🌐 Откройте в браузере: http://192.168.31.1"
echo ""
echo "📝 Полезные команды:"
echo "   docker-compose logs -f          # Просмотр логов"
echo "   docker-compose ps               # Статус контейнеров"
echo "   docker-compose down             # Остановка"
echo "   docker-compose restart          # Перезапуск"
