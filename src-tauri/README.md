# ErrorParty Tauri Desktop

Rust backend для ErrorParty Desktop приложения.

## Структура

```
src-tauri/
├── src/
│   └── main.rs          # Системный трей, медиа-клавиши, события
├── icons/               # Иконки приложения (генерируются автоматически)
├── target/              # Скомпилированные файлы (git ignored)
├── Cargo.toml           # Rust зависимости
├── Cargo.lock           # Lockfile
├── tauri.conf.json      # Конфигурация Tauri
└── build.rs             # Build script
```

## Возможности

### Системный трей
- Левый клик - показать/скрыть окно
- Правый клик - меню управления

### Глобальные медиа-клавиши
- `MediaPlayPause` - воспроизведение/пауза
- `MediaTrackNext` - следующий трек
- `MediaTrackPrevious` - предыдущий трек

### События для фронтенда
- `media-key` - нажатие медиа-клавиши
- `tauri-next-track` - следующий трек (обработка во фронтенде)
- `tauri-prev-track` - предыдущий трек (обработка во фронтенде)

## Разработка

```bash
# Запуск в dev режиме
cargo tauri dev

# Сборка production
cargo tauri build

# Генерация иконок
cargo tauri icon ../frontend/public/icons/icon-512x512.png
```

## Документация

- **Tauri:** https://tauri.app/
- **Rust:** https://www.rust-lang.org/
- **API Reference:** https://tauri.app/v1/api/js/
