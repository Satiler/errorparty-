# 🎵 ErrorParty Desktop - Руководство

## Что это?

**ErrorParty Desktop** - полноценное десктопное приложение для Windows/Mac/Linux на базе **Tauri**.

### Преимущества перед веб-версией:

✅ **Размер:** 3-5 МБ (vs 150+ МБ у Electron)  
✅ **Системный трей:** Сворачивание вместо закрытия  
✅ **Медиа-клавиши:** Play/Pause/Next/Prev работают глобально  
✅ **Нативные уведомления:** Без разрешений браузера  
✅ **Автозапуск:** Запуск с Windows  
✅ **Производительность:** Нативный WebView вместо Chrome  

---

## 📋 Требования

### Для разработки:

1. **Rust** - https://rustup.rs/
   ```powershell
   # Windows (PowerShell)
   Invoke-WebRequest -Uri https://win.rustup.rs -OutFile rustup-init.exe
   .\rustup-init.exe
   ```

2. **Node.js 18+** (уже установлен)

3. **Visual Studio Build Tools** (для Windows)
   - Установить через: https://visualstudio.microsoft.com/downloads/
   - Выбрать "Desktop development with C++"

### Для использования:

- **Windows 7+** / **macOS 10.13+** / **Linux (glibc 2.18+)**
- 50 МБ свободного места

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```powershell
# В корне проекта
npm install

# Установка Tauri CLI
cargo install tauri-cli
```

### 2. Разработка (Dev режим)

```powershell
# Запустить приложение в режиме разработки
npm run tauri:dev

# Или из папки frontend
cd frontend
npm run tauri:dev
```

Это запустит:
- Vite dev server на http://localhost:5173
- Tauri окно с hot-reload

### 3. Сборка Production

```powershell
# Собрать приложение для текущей ОС
npm run tauri:build

# Или конкретно для Windows
npm run tauri:build:windows
```

Результат в `src-tauri/target/release/bundle/`:
- **Windows:** `nsis/ErrorParty_1.0.0_x64-setup.exe` (установщик)
- **Windows:** `msi/ErrorParty_1.0.0_x64_en-US.msi` (MSI пакет)
- **macOS:** `dmg/ErrorParty_1.0.0_x64.dmg`
- **Linux:** `deb/errorparty_1.0.0_amd64.deb` + `appimage/ErrorParty_1.0.0_amd64.AppImage`

---

## 🎮 Использование

### Системные возможности

**Системный трей:**
- 🖱️ **Левый клик** - Показать/Скрыть окно
- 🖱️ **Правый клик** - Контекстное меню:
  - ⏯️ Пауза/Воспроизвести
  - ⏭️ Следующий трек
  - ⏮️ Предыдущий трек
  - 🚪 Выход

**Глобальные хоткеи:**
- `Media Play/Pause` - Пауза/Воспроизведение
- `Media Next` - Следующий трек
- `Media Previous` - Предыдущий трек

**Закрытие окна:**
- ❌ Нажатие "Закрыть" сворачивает в трей (не завершает приложение)
- Для полного выхода: трей → "Выход"

---

## 🔧 Конфигурация

### API URL

Приложение автоматически определяет backend:

**Development:**
```javascript
// frontend/.env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

**Production:**
```javascript
// frontend/.env.production
VITE_API_URL=https://errorparty.ru/api
VITE_WS_URL=wss://errorparty.ru
```

### Настройка окна

Редактировать `src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "windows": [{
      "width": 1280,      // Ширина
      "height": 800,      // Высота
      "minWidth": 900,    // Минимальная ширина
      "minHeight": 600,   // Минимальная высота
      "resizable": true,  // Изменяемый размер
      "fullscreen": false // Полноэкранный режим
    }]
  }
}
```

### Иконки приложения

```powershell
# Автоматическая генерация всех иконок из PNG
npm run tauri:icon

# Иконки создаются в src-tauri/icons/:
# - icon.ico (Windows)
# - icon.icns (macOS)
# - 32x32.png, 128x128.png (Linux)
```

---

## 🛠️ Разработка

### Структура проекта

```
МОЙ САЙТ/
├── frontend/                 # React + Vite фронтенд
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useTauri.js  # Хуки для Tauri API
│   │   └── ...
│   └── package.json
│
├── src-tauri/               # Tauri бэкенд (Rust)
│   ├── src/
│   │   └── main.rs          # Системный трей, хоткеи, события
│   ├── icons/               # Иконки приложения
│   ├── Cargo.toml           # Rust зависимости
│   └── tauri.conf.json      # Конфигурация Tauri
│
└── package.json             # Корневой package.json со скриптами
```

### Использование Tauri API во фронтенде

**1. Импорт хука:**
```javascript
import { useTauriMediaKeys, useTauriNotifications, isTauriApp } from '@/hooks/useTauri';
```

**2. Обработка медиа-клавиш:**
```javascript
function MusicPlayer() {
  const audioRef = useRef(null);
  
  // Подключаем обработку системных медиа-клавиш
  useTauriMediaKeys(audioRef);
  
  // Слушаем события Next/Prev
  useEffect(() => {
    const handleNext = () => playNextTrack();
    const handlePrev = () => playPrevTrack();
    
    window.addEventListener('tauri-next-track', handleNext);
    window.addEventListener('tauri-prev-track', handlePrev);
    
    return () => {
      window.removeEventListener('tauri-next-track', handleNext);
      window.removeEventListener('tauri-prev-track', handlePrev);
    };
  }, []);
  
  return <audio ref={audioRef} src={currentTrack.url} />;
}
```

**3. Нативные уведомления:**
```javascript
function TrackNotification({ track }) {
  const { showNotification } = useTauriNotifications();
  
  const notifyTrackChange = async () => {
    await showNotification(
      '🎵 Сейчас играет',
      `${track.artist} - ${track.title}`,
      track.coverUrl
    );
  };
  
  useEffect(() => {
    notifyTrackChange();
  }, [track.id]);
}
```

**4. Определение среды:**
```javascript
import { isTauriApp } from '@/hooks/useTauri';

if (isTauriApp()) {
  console.log('Запущено в Tauri Desktop');
} else {
  console.log('Запущено в браузере');
}
```

### Добавление новых возможностей

**Rust (src-tauri/src/main.rs):**
```rust
// Добавить новый пункт меню в трей
let custom_item = CustomMenuItem::new("custom".to_string(), "Моя функция");
let tray_menu = SystemTrayMenu::new()
    .add_item(custom_item);

// Обработать клик
SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
    "custom" => {
        let window = app.get_window("main").unwrap();
        window.emit("custom-event", "data").unwrap();
    }
    _ => {}
}
```

**Frontend (React):**
```javascript
useEffect(() => {
  if (typeof window.__TAURI__ === 'undefined') return;
  
  const { event } = window.__TAURI__;
  const unlisten = event.listen('custom-event', (event) => {
    console.log('Получено:', event.payload);
  });
  
  return () => unlisten.then(fn => fn());
}, []);
```

---

## 📦 Распространение

### Windows

**NSIS Installer (рекомендуется):**
```
src-tauri/target/release/bundle/nsis/ErrorParty_1.0.0_x64-setup.exe
```
- Размер: ~5 МБ
- Автоматическая установка в Program Files
- Ярлыки на рабочем столе и в меню Пуск
- Автоматическое удаление через "Программы и компоненты"

**MSI Package:**
```
src-tauri/target/release/bundle/msi/ErrorParty_1.0.0_x64_en-US.msi
```
- Для корпоративного развёртывания
- Поддержка групповых политик

### macOS

**DMG Image:**
```
src-tauri/target/release/bundle/dmg/ErrorParty_1.0.0_x64.dmg
```
- Перетащить в Applications
- Требует подписи для обхода Gatekeeper

### Linux

**AppImage (универсальный):**
```
src-tauri/target/release/bundle/appimage/ErrorParty_1.0.0_amd64.AppImage
```
- Запуск без установки
- `chmod +x ErrorParty*.AppImage && ./ErrorParty*.AppImage`

**DEB Package (Debian/Ubuntu):**
```
src-tauri/target/release/bundle/deb/errorparty_1.0.0_amd64.deb
```
- `sudo dpkg -i errorparty*.deb`

---

## 🐛 Troubleshooting

### Ошибка: "rustc not found"
```powershell
# Установить Rust
Invoke-WebRequest -Uri https://win.rustup.rs -OutFile rustup-init.exe
.\rustup-init.exe
```

### Ошибка: "link.exe not found"
- Установить Visual Studio Build Tools
- Выбрать "Desktop development with C++"
- Перезапустить терминал

### Приложение не открывается
```powershell
# Проверить логи
cd src-tauri/target/release
.\errorparty.exe

# Или в режиме разработки
npm run tauri:dev
```

### Медиа-клавиши не работают
- Проверить, что другие приложения (Spotify, iTunes) закрыты
- Некоторые клавиатуры требуют Fn для медиа-клавиш

### Backend недоступен
**Development:**
```powershell
# Запустить backend
cd backend
npm start

# Или через Docker
docker-compose up -d backend
```

**Production:**
- Проверить `frontend/.env.production`
- Убедиться, что `VITE_API_URL=https://errorparty.ru/api`

---

## 📊 Сравнение с альтернативами

| Характеристика | **Tauri** | Electron | PWA |
|---|---|---|---|
| Размер установщика | **3-5 МБ** | 150+ МБ | - |
| Размер в памяти | **50-100 МБ** | 300-500 МБ | Зависит от браузера |
| Время запуска | **<1 сек** | 2-5 сек | <1 сек |
| Системный трей | ✅ | ✅ | ❌ |
| Глобальные хоткеи | ✅ | ✅ | ❌ |
| Автозапуск | ✅ | ✅ | ❌ |
| Работает оффлайн | ✅ | ✅ | Частично |
| Кроссплатформенность | ✅ Win/Mac/Linux | ✅ Win/Mac/Linux | ✅ Любой браузер |

---

## 🎯 Дорожная карта

**v1.1 (Q1 2025):**
- [ ] Автообновления через Tauri Updater
- [ ] Discord Rich Presence
- [ ] Локальное кеширование треков
- [ ] Экспорт плейлистов

**v1.2 (Q2 2025):**
- [ ] Эквалайзер
- [ ] Визуализация аудио
- [ ] Скробблинг на Last.fm

---

## 📄 Лицензия

MIT License - Copyright © 2025 ErrorParty Team

---

## 🤝 Поддержка

- **Issues:** https://github.com/errorparty/errorparty/issues
- **Discord:** https://errorparty.ru/discord
- **Email:** support@errorparty.ru

---

**Создано с ❤️ и 🎵**
