#!/bin/bash

# Скрипт мониторинга для Kubernetes

set -e

NAMESPACE="music-auto-update"
DEPLOYMENT="auto-update-service"

echo "=== Статус подов ==="
kubectl get pods -n $NAMESPACE

echo -e "\n=== Использование ресурсов ==="
kubectl top pods -n $NAMESPACE

echo -e "\n=== Статус deployment ==="
kubectl get deployment $DEPLOYMENT -n $NAMESPACE

echo -e "\n=== Последние события ==="
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10

echo -e "\n=== Health check ==="
POD=$(kubectl get pod -n $NAMESPACE -l app=auto-update-service -o jsonpath='{.items[0].metadata.name}')
if [ -n "$POD" ]; then
    kubectl exec -n $NAMESPACE $POD -- curl -s http://localhost:3001/health
    echo ""
fi

echo -e "\n=== Статус HPA (если включен) ==="
kubectl get hpa -n $NAMESPACE 2>/dev/null || echo "HPA не настроен"

echo -e "\n=== Статус PVC ==="
kubectl get pvc -n $NAMESPACE

echo -e "\n=== Статус Ingress ==="
kubectl get ingress -n $NAMESPACE

echo -e "\n=== Последние 20 строк логов ==="
kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT --tail=20
