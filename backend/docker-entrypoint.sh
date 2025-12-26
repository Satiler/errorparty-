#!/bin/sh
set -e

echo "🚀 Starting ErrorParty Backend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "   PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
  echo "   Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is ready!"

# Apply database migrations
echo "📊 Applying database migrations..."
if [ -d "/app/migrations" ]; then
  for migration in /app/migrations/*.sql; do
    if [ -f "$migration" ]; then
      echo "   Applying $(basename $migration)..."
      PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$migration" 2>&1 | grep -v "already exists" || true
    fi
  done
  echo "✅ Migrations applied!"
else
  echo "⚠️  No migrations directory found, skipping..."
fi

# Start the application
echo "🎮 Starting Node.js application (Modular Architecture)..."
exec node src/index.js
