# Kubernetes Deployment Guide для системы автообновления плейлистов

## 📋 Содержание
1. [Предварительные требования](#предварительные-требования)
2. [Быстрый старт](#быстрый-старт)
3. [Настройка Secrets](#настройка-secrets)
4. [Деплой с помощью kubectl](#деплой-с-помощью-kubectl)
5. [Деплой с помощью Helm](#деплой-с-помощью-helm)
6. [Мониторинг и логирование](#мониторинг-и-логирование)
7. [Масштабирование](#масштабирование)
8. [Обновление](#обновление)
9. [Откат](#откат)
10. [Troubleshooting](#troubleshooting)

## 🔧 Предварительные требования

### Кластер Kubernetes
- Kubernetes 1.20+
- kubectl настроен и подключен к кластеру
- Helm 3.x (для Helm деплоя)

### Ресурсы кластера
- **CPU**: минимум 1.5 vCPU (250m для приложения + 250m для PostgreSQL + 100m для Redis)
- **Memory**: минимум 4GB RAM (2GB для приложения + 1GB для PostgreSQL + 512MB для Redis)
- **Storage**: 80GB+ (50GB для музыки + 20GB для БД + 10GB для логов)

### Дополнительно
- Ingress Controller (nginx-ingress рекомендуется)
- Cert-manager для SSL сертификатов (опционально)
- Persistent Volume provisioner

## 🚀 Быстрый старт

### 1. Клонирование репозитория
```bash
cd d:\МОЙ САЙТ\backend\auto-update
```

### 2. Создание namespace
```bash
kubectl create namespace music-auto-update
```

### 3. Настройка Secrets
```bash
# Копируем example secrets
cp k8s/secrets.example.yaml k8s/secrets.yaml

# Редактируем secrets
# ВАЖНО: Замените все значения на реальные!
nano k8s/secrets.yaml
```

### 4. Применение secrets
```bash
kubectl apply -f k8s/secrets.yaml
```

### 5. Сборка Docker образа
```bash
# Локальная сборка
docker build -t your-registry.com/music-auto-update:latest .

# Или используйте скрипт
chmod +x k8s/deploy.sh
./k8s/deploy.sh latest
```

### 6. Деплой приложения
```bash
# Применение всех манифестов
kubectl apply -f k8s/deployment.yaml

# Проверка статуса
kubectl get all -n music-auto-update
```

## 🔐 Настройка Secrets

Создайте файл `k8s/secrets.yaml` на основе примера:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auto-update-secrets
  namespace: music-auto-update
type: Opaque
stringData:
  # PostgreSQL
  DATABASE_URL: "postgresql://music_user:STRONG_PASSWORD@postgres-service:5432/music_db"
  
  # Redis
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  REDIS_PASSWORD: "REDIS_STRONG_PASSWORD"
  
  # Spotify API
  SPOTIFY_CLIENT_ID: "ваш_spotify_client_id"
  SPOTIFY_CLIENT_SECRET: "ваш_spotify_client_secret"
  
  # Apple Music API
  APPLE_TEAM_ID: "ваш_apple_team_id"
  APPLE_KEY_ID: "ваш_apple_key_id"
  APPLE_PRIVATE_KEY: |
    -----BEGIN PRIVATE KEY-----
    ВАШ_ПРИВАТНЫЙ_КЛЮЧ
    -----END PRIVATE KEY-----
  
  # Shazam API
  SHAZAM_API_KEY: "ваш_rapidapi_key"
  
  # JWT
  JWT_SECRET: "SUPER_STRONG_JWT_SECRET_KEY"
```

**⚠️ ВАЖНО**: Не коммитьте `secrets.yaml` в git!

## 🎯 Деплой с помощью kubectl

### Полный деплой
```bash
# 1. Применить ConfigMap
kubectl apply -f k8s/deployment.yaml

# 2. Дождаться готовности PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n music-auto-update --timeout=300s

# 3. Запустить миграции
kubectl apply -f k8s/postgres-init-configmap.yaml
kubectl apply -f k8s/jobs.yaml

# 4. Дождаться завершения миграций
kubectl wait --for=condition=complete job/auto-update-migration -n music-auto-update --timeout=300s

# 5. Проверить статус
kubectl get pods -n music-auto-update
kubectl logs -f deployment/auto-update-service -n music-auto-update
```

### Проверка health endpoint
```bash
# Port-forward для локальной проверки
kubectl port-forward svc/auto-update-service 3001:3001 -n music-auto-update

# В другом терминале
curl http://localhost:3001/health
```

## ⛵ Деплой с помощью Helm

### Установка
```bash
# Добавление зависимостей
helm dependency update helm/

# Установка с кастомными values
helm install music-auto-update helm/ \
  --namespace music-auto-update \
  --create-namespace \
  --values helm/values.yaml \
  --values helm/values-production.yaml
```

### Обновление конфигурации
```bash
# Обновление values
helm upgrade music-auto-update helm/ \
  --namespace music-auto-update \
  --values helm/values-production.yaml
```

### Удаление
```bash
helm uninstall music-auto-update -n music-auto-update
```

## 📊 Мониторинг и логирование

### Просмотр логов
```bash
# Логи приложения
kubectl logs -f deployment/auto-update-service -n music-auto-update

# Логи последних 100 строк
kubectl logs --tail=100 deployment/auto-update-service -n music-auto-update

# Логи конкретного пода
kubectl logs -f <pod-name> -n music-auto-update
```

### Метрики
```bash
# Использование ресурсов
kubectl top pods -n music-auto-update
kubectl top nodes

# Описание deployment
kubectl describe deployment auto-update-service -n music-auto-update
```

### Events
```bash
# События namespace
kubectl get events -n music-auto-update --sort-by='.lastTimestamp'
```

## 📈 Масштабирование

### Горизонтальное масштабирование (HPA)
```bash
# HPA уже настроен в deployment.yaml
# Проверка статуса
kubectl get hpa -n music-auto-update

# Ручное масштабирование (если HPA отключен)
kubectl scale deployment auto-update-service --replicas=2 -n music-auto-update
```

⚠️ **ВНИМАНИЕ**: Планировщик (cron tasks) должен работать только в одной реплике. При масштабировании используйте отдельный deployment для планировщика или distributed locks (Redis).

### Вертикальное масштабирование
Отредактируйте `resources` в `deployment.yaml`:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

Примените изменения:
```bash
kubectl apply -f k8s/deployment.yaml
```

## 🔄 Обновление

### Rolling Update
```bash
# Обновление образа
kubectl set image deployment/auto-update-service \
  auto-update=your-registry.com/music-auto-update:v1.1.0 \
  -n music-auto-update

# Отслеживание прогресса
kubectl rollout status deployment/auto-update-service -n music-auto-update
```

### Обновление через манифест
```bash
# Изменить tag в deployment.yaml
# Применить изменения
kubectl apply -f k8s/deployment.yaml

# Перезапустить deployment
kubectl rollout restart deployment/auto-update-service -n music-auto-update
```

## ⏪ Откат

### Откат к предыдущей версии
```bash
# Откат
kubectl rollout undo deployment/auto-update-service -n music-auto-update

# Откат к конкретной ревизии
kubectl rollout undo deployment/auto-update-service --to-revision=2 -n music-auto-update

# История ревизий
kubectl rollout history deployment/auto-update-service -n music-auto-update
```

## 🔍 Troubleshooting

### Pod не запускается
```bash
# Проверка статуса
kubectl get pods -n music-auto-update
kubectl describe pod <pod-name> -n music-auto-update

# Логи init container
kubectl logs <pod-name> -c wait-for-postgres -n music-auto-update

# Events
kubectl get events -n music-auto-update | grep <pod-name>
```

### Проблемы с базой данных
```bash
# Подключение к PostgreSQL
kubectl exec -it postgres-0 -n music-auto-update -- psql -U music_user -d music_db

# Проверка таблиц
\dt

# Проверка подключений
SELECT count(*) FROM pg_stat_activity;
```

### Проблемы с Persistent Volumes
```bash
# Проверка PVC
kubectl get pvc -n music-auto-update

# Описание PVC
kubectl describe pvc music-storage-pvc -n music-auto-update

# Проверка PV
kubectl get pv
```

### Проблемы с Ingress
```bash
# Проверка ingress
kubectl get ingress -n music-auto-update
kubectl describe ingress auto-update-ingress -n music-auto-update

# Логи ingress controller
kubectl logs -f -n ingress-nginx deployment/ingress-nginx-controller
```

### Health check fails
```bash
# Выполнить health check вручную
kubectl exec -it <pod-name> -n music-auto-update -- curl http://localhost:3001/health

# Проверить конфигурацию
kubectl exec -it <pod-name> -n music-auto-update -- env | grep DATABASE
```

## 🔧 Полезные команды

```bash
# Открыть shell в контейнере
kubectl exec -it <pod-name> -n music-auto-update -- sh

# Копирование файлов
kubectl cp <pod-name>:/logs/app.log ./local-app.log -n music-auto-update

# Port forwarding
kubectl port-forward svc/auto-update-service 3001:3001 -n music-auto-update
kubectl port-forward svc/postgres-service 5432:5432 -n music-auto-update

# Рестарт пода
kubectl delete pod <pod-name> -n music-auto-update

# Просмотр всех ресурсов
kubectl get all -n music-auto-update

# Удаление всего namespace (осторожно!)
kubectl delete namespace music-auto-update
```

## 📝 Production Checklist

- [ ] Secrets настроены с реальными API ключами
- [ ] PostgreSQL использует persistent storage
- [ ] Настроены backup'ы базы данных (CronJob)
- [ ] Ingress настроен с SSL сертификатами
- [ ] Resource limits установлены корректно
- [ ] Health checks работают
- [ ] Логи централизованы (ELK, Loki, etc.)
- [ ] Мониторинг настроен (Prometheus, Grafana)
- [ ] Alerts настроены для критичных событий
- [ ] Документация обновлена
- [ ] Тестирование на staging окружении завершено

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи: `kubectl logs -f deployment/auto-update-service -n music-auto-update`
2. Проверьте события: `kubectl get events -n music-auto-update`
3. Проверьте статус подов: `kubectl get pods -n music-auto-update`
4. Обратитесь к документации проекта

---

**Автор**: Ваше имя  
**Дата**: 2025  
**Версия**: 1.0.0
