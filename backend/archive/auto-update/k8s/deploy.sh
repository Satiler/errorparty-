#!/bin/bash

# Скрипт для сборки и деплоя в Kubernetes

set -e

# Переменные
REGISTRY="your-registry.com"
IMAGE_NAME="music-auto-update"
VERSION="${1:-latest}"
NAMESPACE="music-auto-update"

echo "🔨 Сборка Docker образа..."

# Сборка образа
docker build -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} \
             -t ${REGISTRY}/${IMAGE_NAME}:latest \
             -f Dockerfile \
             ..

echo "✅ Образ собран: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"

# Push в registry
echo "📤 Отправка образа в registry..."
docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
docker push ${REGISTRY}/${IMAGE_NAME}:latest

echo "✅ Образ отправлен в registry"

# Применение Kubernetes манифестов
echo "🚀 Деплой в Kubernetes..."

# Создание namespace
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Применение secrets (если есть secrets.yaml)
if [ -f "k8s/secrets.yaml" ]; then
    echo "🔐 Применение secrets..."
    kubectl apply -f k8s/secrets.yaml
fi

# Применение основного deployment
kubectl apply -f k8s/deployment.yaml

# Ожидание готовности deployment
echo "⏳ Ожидание готовности deployment..."
kubectl rollout status deployment/auto-update-service -n ${NAMESPACE} --timeout=5m

# Проверка статуса
echo "📊 Статус подов:"
kubectl get pods -n ${NAMESPACE}

echo "✅ Деплой завершён!"
echo ""
echo "📝 Полезные команды:"
echo "  kubectl logs -f deployment/auto-update-service -n ${NAMESPACE}"
echo "  kubectl get all -n ${NAMESPACE}"
echo "  kubectl port-forward svc/auto-update-service 3001:3001 -n ${NAMESPACE}"
