# Steam Match History Integration Guide

## Overview

This system allows users to fetch their CS2 match history directly from Steam Community pages and sync it to the database. Since Steam requires authentication to view detailed match history, we use a **frontend-based approach** where the authenticated user's browser makes requests to Steam.

## How It Works

### Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│   User Browser  │        │  Your Backend    │        │ Steam Community │
│   (Logged into  │───────▶│  API Server      │        │   (Requires     │
│   Steam)        │◀───────│                  │        │   Auth)         │
└─────────────────┘        └──────────────────┘        └─────────────────┘
         │                          │                            ▲
         │  1. Fetch HTML           │                            │
         │     (with cookies)       │                            │
         └──────────────────────────────────────────────────────┘
         │
         │  2. Send HTML to backend
         └──────────────▶ Backend parses HTML
                          and returns structured data
```

### Process Flow

1. **User Authentication**: User must be logged into Steam Community in their browser
2. **Frontend Request**: React component fetches HTML from `steamcommunity.com/profiles/{steamId}/gcpd/730/?tab={matchType}`
3. **Browser Cookies**: Browser automatically includes Steam session cookies (user is authenticated)
4. **HTML Capture**: Frontend receives HTML containing match data
5. **Backend Parsing**: Frontend sends HTML to backend API
6. **Data Extraction**: Backend parses HTML using Cheerio and extracts match information
7. **Database Sync** (optional): Matches can be saved to database

## API Endpoints

### 1. Get Available Match Types

```http
GET /api/cs2/steam-history/match-types
```

**Response:**
```json
{
  "success": true,
  "types": [
    {
      "id": "matchhistorypremier",
      "name": "Premier Matches",
      "description": "Ranked Premier mode"
    },
    {
      "id": "matchhistorycompetitive",
      "name": "Competitive Matches",
      "description": "Standard competitive"
    },
    ...
  ]
}
```

### 2. Parse Match History HTML

```http
POST /api/cs2/steam-history/parse
Authorization: Bearer {token}
Content-Type: application/json

{
  "html": "<html>...</html>",
  "tab": "matchhistorypremier"
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "mapName": "de_mirage",
      "mapImage": "https://...",
      "date": "2024-01-15T10:30:00.000Z",
      "ranked": true,
      "duration": "45:23",
      "teamAScore": 16,
      "teamBScore": 14,
      "result": "win",
      "userStats": {
        "kills": 25,
        "deaths": 18,
        "assists": 7,
        "mvps": 3,
        "score": 85,
        "headshotPercentage": 45.5
      },
      "players": [...]
    }
  ],
  "count": 10
}
```

### 3. Sync Matches to Database

```http
POST /api/cs2/steam-history/sync
Authorization: Bearer {token}
Content-Type: application/json

{
  "html": "<html>...</html>",
  "tab": "matchhistorypremier"
}
```

**Response:**
```json
{
  "success": true,
  "saved": 8,
  "skipped": 2,
  "errors": 0,
  "message": "Successfully synced 8 matches"
}
```

## Frontend Integration

### Installation

The React component is already created at:
- `frontend/src/components/SteamMatchHistory.jsx`
- `frontend/src/components/SteamMatchHistory.css`

### Usage in Your App

```jsx
import SteamMatchHistory from './components/SteamMatchHistory';

function ProfilePage() {
  return (
    <div>
      <h1>My Profile</h1>
      <SteamMatchHistory />
    </div>
  );
}
```

### Required Data

The component expects the following data in localStorage:

```javascript
// User info (set during login)
localStorage.setItem('user', JSON.stringify({
  steamId: '76561198123456789',
  username: 'PlayerName',
  avatar: 'https://...'
}));

// JWT token (set during login)
localStorage.setItem('token', 'your-jwt-token');
```

## User Instructions

### Prerequisites

1. User must be logged into Steam Community in the same browser
2. User's Steam profile must be set to **Public** (required for match history access)
3. User must have CS2 matches in their history

### Steps to Use

1. **Login to Steam**: Visit [steamcommunity.com](https://steamcommunity.com) and login
2. **Select Match Type**: Choose the type of matches you want to fetch (Premier, Competitive, etc.)
3. **Fetch Matches**: Click "Fetch Matches" button
4. **Review Data**: View parsed matches with your stats
5. **Sync to Database** (optional): Click "Sync to Database" to save matches

### Troubleshooting

#### Error: "Failed to fetch from Steam"

**Solutions:**
- Make sure you are logged into Steam Community in the same browser
- Visit https://steamcommunity.com and login
- Try refreshing the page after logging in

#### Error: "No match data found"

**Solutions:**
- Check that your Steam profile is **Public** (not Private or Friends Only)
- Make sure you have CS2 matches in your history
- Try a different match type (some may be empty)

#### CORS Errors

If you see CORS errors in the browser console, this is normal. Steam Community doesn't allow cross-origin requests, which is why we use the `credentials: 'include'` option to fetch from the browser directly.

## Available Match Types

| ID | Name | Description |
|----|------|-------------|
| `matchhistorypremier` | Premier Matches | Ranked Premier mode with rating |
| `matchhistorycompetitive` | Competitive Matches | Standard 5v5 competitive |
| `matchhistorycompetitivepermap` | Competitive Per Map | Map-specific competitive stats |
| `matchhistoryscrimmage` | Scrimmage Matches | Unranked scrimmage mode |
| `matchhistorywingman` | Wingman Matches | 2v2 Wingman mode |
| `matchhistorycasual` | Casual Matches | Casual mode games |

## Data Structure

### Match Object

```typescript
interface Match {
  // Map info
  mapName: string;
  mapImage: string;
  
  // Match info
  date: Date;
  ranked: boolean;
  waitTime?: string;
  duration?: string;
  
  // Scores
  teamAScore: number;
  teamBScore: number;
  
  // Result for current user
  result: 'win' | 'loss' | 'unknown';
  
  // Current user's stats
  userStats: {
    nickname: string;
    steamId: string;
    kills: number;
    deaths: number;
    assists: number;
    mvps: number;
    score: number;
    headshotPercentage: number | null;
    ping: number;
  };
  
  // All players
  players: Player[];
}
```

### Player Object

```typescript
interface Player {
  nickname: string;
  steamId: string;
  steamProfileUrl: string;
  avatarUrl: string;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  score: number;
  headshotPercentage: number | null;
  ping: number;
}
```

## Backend Service

### SteamMatchHistoryService

Located at: `backend/src/services/steamMatchHistoryService.js`

**Methods:**

```javascript
// Parse HTML and extract matches
parseMatchHistoryHTML(html, userSteamId)

// Get available match types
getAvailableMatchTypes()

// Helper methods
parseMatchHeader($, $row)
parsePlayerRow($, $row)
parseMatchDate(dateString)
extractSteamIdFromUrl(url)
getUserMatchStats(match, currentUserSteamId)
determineMatchResult(match, currentUserSteamId)
```

## Security Considerations

### Why This Approach is Safe

1. **No Server-Side Credentials**: Backend never stores or uses Steam credentials
2. **User-Initiated**: All requests originate from the authenticated user's browser
3. **Personal Data Only**: Users can only access their own match history
4. **JWT Protected**: All API endpoints require valid JWT token
5. **No Third-Party Access**: Only the authenticated user can fetch their data

### What We Don't Do

❌ Store Steam session cookies  
❌ Request Steam credentials  
❌ Access other users' data  
❌ Use Steam Web API keys for this feature  
❌ Bypass Steam authentication  

### What We Do

✅ Let users fetch their own data while authenticated  
✅ Parse public HTML structure  
✅ Store only match statistics (not personal data)  
✅ Require JWT for all backend operations  
✅ Validate user ownership of Steam ID  

## Limitations

### Technical Limitations

1. **Browser Required**: Cannot fetch data server-side (Steam blocks it)
2. **Authentication Required**: User must be logged into Steam
3. **Public Profile Required**: Steam profile privacy settings must allow match history
4. **Rate Limiting**: Steam may rate-limit requests if done too frequently
5. **HTML Structure**: If Steam changes their HTML structure, parsing may break

### Rate Limiting

To avoid Steam rate limits:
- Don't make requests too frequently (max 1 per minute recommended)
- Cache results on frontend
- Use pagination if available
- Implement exponential backoff on errors

## Development

### Testing the Parser

Create a test file to parse HTML:

```javascript
// test-steam-parser.js
const fs = require('fs');
const steamMatchHistoryService = require('./src/services/steamMatchHistoryService');

const html = fs.readFileSync('sample-match-history.html', 'utf8');
const userSteamId = '76561198123456789';

const result = steamMatchHistoryService.parseMatchHistoryHTML(html, userSteamId);

console.log(JSON.stringify(result, null, 2));
```

### Debugging

Enable debug logging in the service:

```javascript
// Add to parseMatchHistoryHTML
console.log('Parsing HTML length:', html.length);
console.log('Found match tables:', matchTables.length);
console.log('Total matches parsed:', matches.length);
```

## Migration from Old System

If you were using the old direct fetching approach:

### Old Endpoints (Deprecated)
- `GET /api/cs2/steam-history/:steamId` ❌
- `POST /api/cs2/steam-history/sync` (with steamId) ❌

### New Endpoints
- `POST /api/cs2/steam-history/parse` ✅
- `POST /api/cs2/steam-history/sync` (with html) ✅

### Migration Steps

1. Update frontend to use new `SteamMatchHistory` component
2. Remove old server-side fetching code
3. Update API calls to send HTML instead of steamId
4. Test with authenticated user

## Future Improvements

Possible enhancements:

1. **Caching**: Cache parsed matches on frontend to reduce requests
2. **Pagination**: Support fetching older matches (if Steam provides)
3. **Background Sync**: Auto-sync new matches periodically
4. **Match Notifications**: Notify users of new matches
5. **Statistics Dashboard**: Aggregate stats from all synced matches
6. **Compare Feature**: Compare stats with friends
7. **Export**: Export match history to CSV/JSON

## Support

### Common Issues

**Issue**: Matches not appearing  
**Solution**: Check Steam profile privacy settings, make sure profile is Public

**Issue**: "Not logged in" error  
**Solution**: Login to steamcommunity.com in the same browser before using the feature

**Issue**: Old matches not appearing  
**Solution**: Steam only shows recent matches (limit varies by match type)

### Contact

For issues or questions:
- Check browser console for errors
- Verify Steam authentication status
- Review API response error messages
- Check backend logs for parsing errors

## Conclusion

This integration provides a seamless way for users to import their CS2 match history from Steam Community while respecting Steam's authentication requirements and user privacy. The frontend-based approach ensures that users maintain control over their data and authentication.
