# Как получить VK Audio токен через браузер

## Метод 1: Через DevTools (Chrome/Edge/Firefox)

1. **Открой vk.com и залогинься**
   
2. **Перейди в раздел музыки:**
   - https://vk.com/audio или https://m.vk.com/audio

3. **Открой DevTools:**
   - Нажми `F12` или `Ctrl+Shift+I`
   - Или правой кнопкой → "Inspect" / "Исследовать"

4. **Перейди на вкладку Network:**
   - Поставь фильтр: `audio` или `api.vk.com`
   - Нажми `XHR` или `Fetch` для фильтрации

5. **Включи музыку или обнови страницу**
   - В списке запросов найди запросы к `api.vk.com/method/audio.*`
   - Например: `audio.get`, `audio.search`, `audio.getRecommendations`

6. **Скопируй токен:**
   - Кликни на запрос
   - Во вкладке "Headers" или "Payload" найди параметр `access_token`
   - Скопируй значение (начинается с `vk1.a.` или похожее)

**Пример токена:**
```
vk1.a.4r18p0jVLCUVZ1fop6SXIkDEKGTu2K5j1cQz_btrw-A8K1ypRvRgwy8Y7uVYhOxx...
```

---

## Метод 2: Из Kate Mobile (Android)

1. **Установи Kate Mobile:**
   - Скачай с 4PDA или GitHub: https://github.com/vkpandroid/kate-app

2. **Залогинься в приложении**

3. **Установи HTTP Sniffer (требуется root):**
   - Или используй приложение "Packet Capture" (без root)
   - Или используй Charles Proxy на компьютере + настрой прокси на телефоне

4. **Перехвати запросы:**
   - Включи перехват трафика
   - Открой музыку в Kate Mobile
   - Найди запросы к `api.vk.com`
   - Скопируй `access_token` из параметров

---

## Метод 3: Через существующий токен (у тебя уже есть!)

Проверь файл `.env` или `backend/src/config/vk.config.js` - там может быть старый токен:

```
VK_ACCESS_TOKEN=vk1.a.4r18p0jVLCUVZ1fop6SXIkDEKGTu2K5j1cQz_btrw...
```

Если токен есть, просто используй его!

---

## Метод 4: Создать отдельный пароль приложения (для load-vk-full-music.js)

1. **Зайди в настройки VK:**
   - https://vk.com/settings?act=security

2. **Перейди в раздел "Пароли приложений":**
   - Нажми "Создать новый пароль"

3. **Создай пароль для приложения:**
   - Название: "ErrorParty Music" (любое)
   - Скопируй сгенерированный пароль

4. **Используй этот пароль вместо основного:**
   - В `load-vk-full-music.js` замени `VK_PASSWORD` на этот пароль
   - Это обойдет flood control и 2FA

---

## ⚡ Быстрый способ (рекомендую):

Используй метод 1 (браузер DevTools) - займет 2-3 минуты:

1. Открой https://vk.com/audio
2. F12 → Network → XHR
3. Включи любую песню
4. Найди запрос к api.vk.com
5. Скопируй access_token
6. Вставь в `backend/load-vk-with-token.js`

Токен действует несколько месяцев!
