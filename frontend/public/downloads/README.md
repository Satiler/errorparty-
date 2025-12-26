# ErrorParty Desktop Downloads

Эта папка содержит установочные файлы desktop приложения.

## Структура:

```
downloads/
├── windows/
│   ├── ErrorParty_1.0.0_x64-setup.exe    (NSIS installer)
│   └── ErrorParty_1.0.0_x64_en-US.msi    (MSI package)
├── macos/
│   └── ErrorParty_1.0.0_x64.dmg
├── linux/
│   ├── ErrorParty_1.0.0_amd64.AppImage
│   └── errorparty_1.0.0_amd64.deb
└── README.md (этот файл)
```

## Генерация установщиков:

```bash
# Собрать все платформы
npm run tauri:build

# Только Windows
npm run tauri:build -- --target x86_64-pc-windows-msvc

# Результаты в: src-tauri/target/release/bundle/
```

## Размещение на сервере:

Файлы из `src-tauri/target/release/bundle/` копировать в:
- Windows: `frontend/public/downloads/windows/`
- macOS: `frontend/public/downloads/macos/`
- Linux: `frontend/public/downloads/linux/`

## Автоматические обновления (TODO):

Будут реализованы через Tauri Updater в версии 1.1.0
