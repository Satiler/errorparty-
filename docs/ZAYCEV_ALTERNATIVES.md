# Альтернативы Zaycev.net для импорта музыки

## Проблема
Zaycev.net мигрировал на React SPA архитектуру с защищённым API. Простой скрейпинг больше не работает.

## Рекомендуемые альтернативы

### 1. **Jamendo API** ⭐ (Рекомендуется)
- **Описание**: Крупнейшая платформа свободной музыки
- **API**: Бесплатный, документированный
- **Треки**: 500,000+ треков с прямыми MP3 ссылками
- **Лицензия**: Creative Commons
- **Регистрация**: https://devportal.jamendo.com/
- **Документация**: https://developer.jamendo.com/v3.0

**Пример запроса:**
```javascript
GET https://api.jamendo.com/v3.0/tracks/?client_id=YOUR_CLIENT_ID&format=json&limit=10&search=rock
```

**Ответ содержит:**
- Прямые ссылки на MP3
- Метаданные (название, артист, альбом, жанр)
- Обложки альбомов
- Длительность

### 2. **Free Music Archive API**
- **Описание**: Архив свободной музыки от Internet Archive
- **API**: Бесплатный
- **Треки**: 100,000+ треков
- **Лицензия**: Различные Creative Commons
- **Сайт**: https://freemusicarchive.org/
- **API**: https://freemusicarchive.org/api

### 3. **SoundCloud API**
- **Описание**: Популярная платформа с огромной библиотекой
- **API**: Требует регистрацию приложения
- **Треки**: Миллионы треков (в том числе русские исполнители)
- **Лицензия**: Зависит от загрузчика
- **Регистрация**: https://soundcloud.com/you/apps

### 4. **Оставить демо-треки**
- Продолжить использовать `importPopularAlbums()` для демонстрации функциональности
- Добавить заметку о том, что это демо-контент
- Сфокусироваться на других функциях платформы

## Рекомендация для ErrorParty

Учитывая, что ErrorParty - игровая платформа с музыкальным модулем:

1. **Jamendo API** - идеально подходит для легального музыкального контента
2. Быстрая интеграция (1-2 часа разработки)
3. Полная функциональность воспроизведения
4. Без юридических рисков

## Пример реализации Jamendo

```javascript
// backend/src/modules/music/jamendo-import.service.js
class JamendoImportService {
  constructor() {
    this.apiKey = process.env.JAMENDO_API_KEY;
    this.baseURL = 'https://api.jamendo.com/v3.0';
  }

  async searchTracks(query, limit = 10) {
    const response = await axios.get(`${this.baseURL}/tracks/`, {
      params: {
        client_id: this.apiKey,
        format: 'json',
        limit,
        search: query,
        audioformat: 'mp32'
      }
    });

    return response.data.results.map(track => ({
      title: track.name,
      artist: track.artist_name,
      album: track.album_name,
      duration: track.duration,
      audioUrl: track.audio, // Прямая ссылка на MP3!
      imageUrl: track.image,
      genre: track.musicinfo.tags.genres.join(', ')
    }));
  }
}
```

## Следующие шаги

1. Зарегистрироваться на Jamendo Developer Portal
2. Получить API ключ
3. Создать `jamendo-import.service.js`
4. Обновить админ панель для импорта из Jamendo
5. Протестировать импорт и воспроизведение

## Статус Zaycev.net

- ❌ HTML scraping не работает (React SPA)
- ❌ API недоступен без сложной аутентификации
- ❌ Go библиотека `rugineer/zaycev_net` устарела (2019)
- ⚠️ Не рекомендуется для дальнейшего использования
