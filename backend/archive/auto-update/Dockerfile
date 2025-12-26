# Dockerfile для системы автообновления плейлистов

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm install --omit=dev

# Копирование исходного кода
COPY . .

# Stage 2: Production
FROM node:18-alpine

# Установка дополнительных инструментов
RUN apk add --no-cache \
    tini \
    curl

WORKDIR /app

# Копирование из builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Создание директорий для данных
RUN mkdir -p /data/music /logs && \
    chown -R node:node /app /data /logs

# Использование непривилегированного пользователя
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose порт
EXPOSE 3001

# Использование tini для правильной обработки сигналов
ENTRYPOINT ["/sbin/tini", "--"]

# Запуск приложения (используем упрощенную версию для начала)
CMD ["node", "index-simple.js"]
