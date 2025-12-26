# Production Deployment Guide

## Подготовка к Production

### 1. Environment Variables

Создайте `.env.production` файл:

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/errorparty_prod
DB_HOST=localhost
DB_PORT=5432
DB_NAME=errorparty_prod
DB_USER=username
DB_PASSWORD=strong_password_here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here

# JWT & Session
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
SESSION_SECRET=your_super_secret_session_key_min_32_chars

# Steam API
STEAM_API_KEY=your_steam_api_key_here
STEAM_CALLBACK_URL=https://errorparty.ru/api/auth/steam/callback

# TeamSpeak
TS_HOST=ts.errorparty.ru
TS_QUERY_PORT=10011
TS_SERVER_PORT=9987
TS_USERNAME=serveradmin
TS_PASSWORD=your_ts_password
TS_NICKNAME=ErrorPartyBot

# CORS
CORS_ORIGIN=https://errorparty.ru

# SSL/TLS
SSL_CERT_PATH=/etc/letsencrypt/live/errorparty.ru/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/errorparty.ru/privkey.pem
```

---

## Docker Production Setup

### 1. Production Docker Compose

Создайте `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: errorparty_postgres_prod
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - errorparty_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: errorparty_redis_prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - errorparty_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: errorparty_backend_prod
    restart: always
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/uploads:/app/uploads
    networks:
      - errorparty_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=https://errorparty.ru/api
    container_name: errorparty_frontend_prod
    restart: always
    networks:
      - errorparty_network

  nginx:
    image: nginx:alpine
    container_name: errorparty_nginx_prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./docker/certbot/conf:/etc/letsencrypt:ro
      - ./docker/certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - errorparty_network

  certbot:
    image: certbot/certbot
    container_name: errorparty_certbot
    volumes:
      - ./docker/certbot/conf:/etc/letsencrypt
      - ./docker/certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  errorparty_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

### 2. Nginx Production Configuration

`docker/nginx/nginx.prod.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name errorparty.ru www.errorparty.ru;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name errorparty.ru www.errorparty.ru;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/errorparty.ru/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/errorparty.ru/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                proxy_pass http://frontend:80;
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Backend API
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://backend:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Socket.IO
        location /socket.io/ {
            proxy_pass http://backend:3000/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Uploads
        location /uploads/ {
            proxy_pass http://backend:3000/uploads/;
            expires 1y;
            add_header Cache-Control "public";
        }
    }
}
```

---

## SSL Certificate Setup

### 1. Initial Certificate

```bash
# Stop nginx if running
docker-compose -f docker-compose.prod.yml stop nginx

# Get certificate
docker run -it --rm \
  -v ./docker/certbot/conf:/etc/letsencrypt \
  -v ./docker/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d errorparty.ru \
  -d www.errorparty.ru \
  --email admin@errorparty.ru \
  --agree-tos \
  --no-eff-email

# Start nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

### 2. Auto-renewal

Certbot container автоматически обновляет сертификаты каждые 12 часов.

---

## Database Setup

### 1. Создание продакшн БД

```bash
# Подключиться к postgres контейнеру
docker exec -it errorparty_postgres_prod psql -U username

# Создать БД
CREATE DATABASE errorparty_prod;

# Выйти
\q
```

### 2. Миграции

```bash
# Запустить миграции
docker-compose -f docker-compose.prod.yml exec backend node src/database/migrate.js

# Добавить поля модерации
docker-compose -f docker-compose.prod.yml exec backend node src/database/addModerationFields.js
```

### 3. Backup

```bash
# Создать backup
docker exec errorparty_postgres_prod pg_dump -U username errorparty_prod > backup_$(date +%Y%m%d).sql

# Восстановить из backup
docker exec -i errorparty_postgres_prod psql -U username errorparty_prod < backup_20250121.sql
```

---

## Deployment Commands

### 1. Первый деплой

```bash
# Клонировать репозиторий
git clone https://github.com/yourorg/errorparty.ru.git
cd errorparty.ru

# Создать .env.production
cp .env.example .env.production
nano .env.production  # Заполнить реальными значениями

# Собрать и запустить
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Проверить логи
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. Обновление

```bash
# Остановить сервисы
docker-compose -f docker-compose.prod.yml down

# Получить обновления
git pull origin main

# Пересобрать и запустить
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Проверить
docker-compose -f docker-compose.prod.yml ps
```

### 3. Откат

```bash
# Остановить
docker-compose -f docker-compose.prod.yml down

# Откатиться к предыдущему коммиту
git checkout <previous-commit-hash>

# Запустить
docker-compose -f docker-compose.prod.yml up -d
```

---

## Мониторинг

### 1. Логи

```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f nginx

# Последние 100 строк
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### 2. Статус

```bash
# Статус всех контейнеров
docker-compose -f docker-compose.prod.yml ps

# Health check
docker-compose -f docker-compose.prod.yml exec backend curl http://localhost:3000/api/health
```

### 3. Ресурсы

```bash
# Использование ресурсов
docker stats

# Размер контейнеров
docker system df
```

---

## Оптимизация Performance

### 1. Backend

- ✅ Redis кэширование (30s - 10min)
- ✅ Compression middleware
- ✅ Helmet security headers
- ✅ Connection pooling (PostgreSQL)

### 2. Frontend

- ✅ Vite production build (minification, tree-shaking)
- ✅ Code splitting
- ✅ Lazy loading routes
- ✅ Image optimization

### 3. Nginx

- ✅ Gzip compression
- ✅ Static file caching (1 year)
- ✅ HTTP/2
- ✅ Rate limiting

---

## Безопасность

### Чеклист

- ✅ HTTPS только (SSL/TLS)
- ✅ Secure headers (HSTS, X-Frame-Options, CSP)
- ✅ JWT токены с secure secret
- ✅ Rate limiting на API
- ✅ SQL injection protection (Sequelize ORM)
- ✅ XSS protection (React)
- ✅ CSRF protection
- ✅ Environment variables для секретов
- ✅ Регулярные обновления зависимостей
- ✅ Firewall правила
- ✅ Backup базы данных

---

## CI/CD (GitHub Actions)

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/errorparty.ru
          git pull origin main
          docker-compose -f docker-compose.prod.yml build
          docker-compose -f docker-compose.prod.yml up -d
          docker-compose -f docker-compose.prod.yml exec -T backend node src/database/migrate.js
```

---

## Troubleshooting

### Проблема: Контейнер не стартует

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs backend

# Проверить health check
docker inspect errorparty_backend_prod
```

### Проблема: 502 Bad Gateway

```bash
# Проверить backend
docker-compose -f docker-compose.prod.yml exec backend curl http://localhost:3000/api/health

# Проверить nginx конфиг
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

### Проблема: Database connection error

```bash
# Проверить PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U username -d errorparty_prod

# Проверить переменные окружения
docker-compose -f docker-compose.prod.yml exec backend env | grep DB
```

---

## Maintenance

### Регулярные задачи

**Ежедневно:**
- Проверка логов на ошибки
- Мониторинг дискового пространства

**Еженедельно:**
- Backup базы данных
- Проверка SSL сертификата
- Review security logs

**Ежемесячно:**
- Обновление зависимостей
- Проверка performance metrics
- Clean up старых логов и uploads

---

## Support

Для вопросов по деплою:
- Документация: `/docs`
- Issues: GitHub Issues
- Email: admin@errorparty.ru
