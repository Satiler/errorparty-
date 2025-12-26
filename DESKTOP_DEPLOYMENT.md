# 🚀 Desktop App - Deployment Guide

## Полный процесс от сборки до публикации

### 1. Локальная сборка

```powershell
# Сборка и копирование установщиков
.\build-desktop.ps1

# Результат:
# - frontend/public/downloads/windows/ErrorParty_1.0.0_x64-setup.exe
# - frontend/public/downloads/windows/ErrorParty_1.0.0_x64_en-US.msi
```

### 2. Тестирование

```powershell
# Запустить dev server
cd frontend
npm run dev

# Открыть в браузере:
# http://localhost:5173/download

# Проверить:
# ✅ Страница загружается
# ✅ Кнопки скачивания видны
# ✅ Файлы скачиваются
# ✅ Установщик работает
```

### 3. Сборка production frontend

```powershell
cd frontend
npm run build

# Результат: frontend/dist/
```

### 4. Deploy на сервер (Docker)

```powershell
# Пересобрать frontend контейнер
docker-compose build frontend

# Перезапустить
docker-compose restart frontend

# Проверить
Invoke-WebRequest -Uri "http://localhost/download"
```

### 5. Проверка на production

```bash
# На сервере
curl https://errorparty.ru/download

# Должно вернуть HTML страницы
```

## Структура файлов

```
МОЙ САЙТ/
├── frontend/
│   ├── public/
│   │   └── downloads/          ← Установщики здесь
│   │       ├── windows/
│   │       │   ├── ErrorParty_1.0.0_x64-setup.exe
│   │       │   └── ErrorParty_1.0.0_x64_en-US.msi
│   │       ├── macos/
│   │       │   └── ErrorParty_1.0.0_x64.dmg
│   │       └── linux/
│   │           ├── ErrorParty_1.0.0_amd64.AppImage
│   │           └── errorparty_1.0.0_amd64.deb
│   ├── src/
│   │   └── pages/
│   │       └── DownloadPage.jsx  ← Страница скачивания
│   └── dist/                     ← Production build
│
├── src-tauri/
│   └── target/
│       └── release/
│           └── bundle/           ← Сборки Tauri (не коммитим!)
│
└── build-desktop.ps1             ← Скрипт сборки
```

## Nginx конфигурация (если нужно)

```nginx
# Разрешить скачивание больших файлов
location /downloads/ {
    alias /app/downloads/;
    add_header Content-Disposition attachment;
    add_header X-Content-Type-Options nosniff;
}
```

## CDN (опционально)

Для быстрой загрузки можно разместить на CDN:

```javascript
// В DownloadPage.jsx
const CDN_URL = 'https://cdn.errorparty.ru/desktop';

const downloads = [
  {
    url: `${CDN_URL}/windows/ErrorParty_1.0.0_x64-setup.exe`,
    // ...
  }
];
```

## Автоматизация (TODO)

### GitHub Actions

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - uses: actions-rs/toolchain@v1
      
      - name: Build Tauri App
        run: npm run tauri:build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v2
        with:
          name: desktop-app-${{ matrix.os }}
          path: src-tauri/target/release/bundle/
```

## Обновление версии

```powershell
# 1. Обновить версию
# - package.json
# - src-tauri/Cargo.toml
# - src-tauri/tauri.conf.json

# 2. Пересобрать
.\build-desktop.ps1

# 3. Обновить DownloadPage.jsx (версия и размер)

# 4. Commit & Push
git add .
git commit -m "Release desktop app v1.1.0"
git tag v1.1.0
git push origin main --tags

# 5. Deploy
docker-compose build frontend
docker-compose restart frontend
```

## Безопасность

### Подпись кода (рекомендуется)

**Windows:**
```powershell
# Купить сертификат от CA (Sectigo, DigiCert)
# Подписать .exe
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com ErrorParty_setup.exe
```

**macOS:**
```bash
# Apple Developer ID
codesign --force --deep --sign "Developer ID Application: YourName" ErrorParty.app
```

## Мониторинг скачиваний

```javascript
// В DownloadPage.jsx добавить аналитику
const handleDownload = (os) => {
  // Отправить событие в аналитику
  axios.post('/api/analytics/download', { os, version: '1.0.0' });
};
```

## Checklist перед релизом

- [ ] Версия обновлена везде (package.json, Cargo.toml, tauri.conf.json)
- [ ] Сборка проходит без ошибок
- [ ] Установщик тестирован на чистой системе
- [ ] Страница /download работает
- [ ] Файлы скачиваются корректно
- [ ] CHANGELOG.md обновлён
- [ ] Git tag создан
- [ ] Production deploy выполнен

---

**Готово к публикации!** 🎉
