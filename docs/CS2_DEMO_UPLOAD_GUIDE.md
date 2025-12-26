# CS2 Demo Manual Upload Guide

## Проблема

Valve больше не раздает CS2 demo файлы публично. Для получения demo файлов требуется:
- Steam Web API Key
- Авторизация через Steam Guard
- Использование Game Coordinator API

## Решение: Manual Upload

Пользователи могут скачать demo файлы из CS2 и загрузить их через API.

## Как получить demo файл

### Вариант 1: Через консоль CS2

1. Откройте CS2
2. Откройте консоль (`)
3. Используйте команду:
   ```
   playdemo "CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
   ```
4. Файл скачается в:
   ```
   C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\replays\
   ```

### Вариант 2: Из папки replays

1. Запустите CS2
2. Откройте "Посмотреть матчи" → "Ваши матчи"
3. Скачайте demo файл
4. Найдите файл в папке replays (см. выше)

## API Endpoints

### Upload Demo

**POST** `/api/cs2-demo/upload`

Upload a CS2 demo file and automatically parse it.

**Authentication:** Required (JWT token)

**Content-Type:** `multipart/form-data`

**Body:**
- `demo` (file, required) - Demo file (.dem, .dem.bz2, .dem.gz)
- `shareCode` (string, optional) - Share code for this match

**Response:**
```json
{
  "success": true,
  "message": "Demo uploaded successfully and queued for parsing",
  "data": {
    "matchId": 26,
    "demoId": 12,
    "filename": "1701234567_match.dem",
    "fileSize": 52428800,
    "status": "parsing"
  }
}
```

**Example (curl):**
```bash
curl -X POST https://errorparty.ru/api/cs2-demo/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "demo=@/path/to/demo.dem" \
  -F "shareCode=CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('demo', demoFile);
formData.append('shareCode', 'CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx');

const response = await fetch('https://errorparty.ru/api/cs2-demo/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Match ID:', result.data.matchId);
```

### Check Demo Status

**GET** `/api/cs2-demo/status/:demoId`

Get the status of a demo file parsing.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "demo": {
    "id": 12,
    "status": "parsed",
    "parsedAt": "2025-11-27T02:15:30.000Z",
    "parseError": null,
    "match": {
      "id": 26,
      "map": "de_dust2",
      "result": "win",
      "score": "16:14",
      "kills": 23,
      "deaths": 18,
      "assists": 5,
      "createdAt": "2025-11-27T02:10:00.000Z"
    }
  }
}
```

### List User Demos

**GET** `/api/cs2-demo/list`

Get list of uploaded demos for the current user.

**Authentication:** Required

**Query Parameters:**
- `limit` (number, optional) - Max results (default: 20, max: 100)
- `offset` (number, optional) - Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "demos": [
    {
      "id": 12,
      "status": "parsed",
      "parsedAt": "2025-11-27T02:15:30.000Z",
      "match": {
        "id": 26,
        "map": "de_dust2",
        "result": "win",
        "score": "16:14"
      }
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## Automatic Processing

After upload, the system automatically:

1. ✅ Creates CS2Match record
2. ✅ Creates CS2Demo record
3. ✅ Parses demo file using demofile library
4. ✅ Extracts match statistics (kills, deaths, assists, headshots, etc.)
5. ✅ Calculates advanced statistics:
   - HLTV Rating 2.0
   - Impact Rating
   - ADR (Average Damage per Round)
   - K/D Ratio
   - Weapon stats
6. ✅ Updates leaderboards
7. ✅ Updates user statistics

## Supported File Formats

- `.dem` - Uncompressed demo file
- `.dem.bz2` - BZip2 compressed demo
- `.dem.gz` - GZip compressed demo

**Max file size:** 200MB

## Notes

- Demo files are processed asynchronously
- Parsing usually takes 10-30 seconds depending on match length
- Statistics are automatically calculated after parsing
- Old demos (30+ days) may not be available for download from Valve servers

## Future Improvements

- [ ] Add Puppeteer for automatic Steam Community scraping
- [ ] Add Steam Web API integration
- [ ] Add batch upload support
- [ ] Add automatic demo cleanup (delete after 30 days)
