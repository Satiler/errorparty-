# Инструкция по настройке прокси для ВК

## Быстрый старт

### 1. Включение прокси

Добавьте в `.env` файл:

```env
# Включить использование прокси
USE_PROXY=true

# Список прокси (через запятую)
PROXY_LIST=http://proxy1.com:8080,socks5://proxy2.com:1080,http://user:pass@proxy3.com:8080
```

### 2. Установка зависимостей

```bash
npm install https-proxy-agent socks-proxy-agent
```

### 3. Тестирование прокси

```bash
node test-proxy-system.js
```

## Типы прокси

### HTTP/HTTPS прокси
```
http://host:port
http://username:password@host:port
https://host:port
```

### SOCKS прокси
```
socks4://host:port
socks5://host:port
socks5://username:password@host:port
```

## Бесплатные прокси

### Где взять:
- https://www.proxy-list.download/
- https://free-proxy-list.net/
- https://www.sslproxies.org/
- https://spys.one/

⚠️ **Внимание**: Бесплатные прокси часто нестабильны и медленны.

## Платные прокси (рекомендуется)

### Популярные сервисы:

1. **Bright Data** (ex-Luminati)
   - Самый надежный
   - От $500/мес
   - https://brightdata.com

2. **Smartproxy**
   - Доступные цены
   - От $75/мес
   - https://smartproxy.com

3. **Oxylabs**
   - Хорошее качество
   - От $300/мес
   - https://oxylabs.io

4. **ProxyRack**
   - Бюджетный вариант
   - От $50/мес
   - https://proxyrack.com

5. **IPRoyal**
   - Резидентные прокси
   - От $1.75/GB
   - https://iproyal.com

### Пример конфигурации для платных прокси:

```env
# Smartproxy
PROXY_LIST=http://username:password@gate.smartproxy.com:7000

# ProxyRack
PROXY_LIST=http://username:password@residential.proxyrack.net:10000

# Несколько прокси
PROXY_LIST=http://user1:pass1@proxy1.com:8080,http://user2:pass2@proxy2.com:8080,socks5://user3:pass3@proxy3.com:1080
```

## Настройки системы

### Интервал ротации
По умолчанию прокси меняется каждую минуту. Изменить в `proxy-manager.service.js`:

```javascript
this.rotationInterval = 30000; // 30 секунд
```

### Количество попыток
```javascript
await proxyManager.makeRequest(url, options, retries = 5);
```

## Тестирование

### Проверка всех прокси
```bash
node -e "require('./src/services/proxy-manager.service').testAllProxies()"
```

### Статистика
```bash
node -e "console.log(require('./src/services/proxy-manager.service').getStats())"
```

## Troubleshooting

### Прокси не работают
1. Проверьте формат (http://, socks5://)
2. Убедитесь, что прокси активны
3. Проверьте firewall и антивирус
4. Попробуйте другие прокси

### Капча все равно появляется
1. Увеличьте задержки между запросами
2. Используйте больше прокси
3. Добавьте ротацию User-Agent
4. Используйте резидентные прокси (не датацентр)

### Медленная загрузка
1. Используйте прокси ближе к серверам ВК (Россия, Европа)
2. Проверьте скорость прокси
3. Уменьшите количество одновременных запросов

## Рекомендации

✅ **Лучшая конфигурация для ВК:**
- Резидентные прокси из России
- Ротация каждые 30-60 секунд
- Задержки 3-5 секунд между запросами
- Несколько User-Agent

✅ **Оптимальный бюджет:**
- Минимум: $50-100/мес (ProxyRack, IPRoyal)
- Средний: $200-300/мес (Smartproxy, Oxylabs)
- Премиум: $500+/мес (Bright Data)

## Альтернативы прокси

Если прокси не помогают:
1. Использовать VPN на сервере
2. Арендовать VPS в разных странах
3. Использовать Tor (медленно, но работает)
4. Получить новый VK токен
5. Использовать альтернативные источники музыки
