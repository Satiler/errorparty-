# ErrorParty.ru API Documentation

## Base URL
```
Development: http://localhost:3001/api
Production: https://errorparty.ru/api
```

## Authentication

Most endpoints require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### Steam OAuth Login
```http
GET /auth/steam
```
Redirects to Steam OpenID authentication.

**Response:** Redirects to Steam login page

---

### Steam Callback
```http
GET /auth/steam/callback
```
Handles Steam authentication callback.

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "Player123",
    "steamId": "76561198012345678",
    "avatar": "https://...",
    "role": "user"
  }
}
```

---

### Verify Token
```http
GET /auth/verify
```
Verifies JWT token validity.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "Player123",
    "role": "user"
  }
}
```

---

## User Endpoints

### Get Current User Profile
```http
GET /user/profile
```
**Auth Required:** Yes

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "Player123",
    "steamId": "76561198012345678",
    "avatar": "https://...",
    "role": "user",
    "totalOnlineTime": 36000,
    "tsNickname": "Player",
    "tsUniqueId": "abc123",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### Get Top Users
```http
GET /users/top?limit=10
```

**Query Parameters:**
- `limit` (optional): Number of users to return (default: 10, max: 50)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "TopPlayer",
      "avatar": "https://...",
      "totalOnlineTime": 100000,
      "onlineTimeFormatted": "27ч 46м",
      "stats": {
        "level": 15,
        "totalConnections": 450
      }
    }
  ]
}
```

---

### Link TeamSpeak Account
```http
POST /user/link-teamspeak
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "token": "verification_token_from_ts"
}
```

**Response:**
```json
{
  "success": true,
  "message": "TeamSpeak аккаунт успешно привязан",
  "tsNickname": "Player",
  "tsUniqueId": "abc123"
}
```

---

## Meme Endpoints

### Get All Memes
```http
GET /memes?filter=recent&limit=20
```

**Query Parameters:**
- `filter`: `recent` | `popular` (default: recent)
- `limit`: Number of memes (default: 20, max: 100)

**Response:**
```json
{
  "memes": [
    {
      "id": 1,
      "title": "Epic Fail",
      "description": "When you dive into 5 enemies",
      "imageUrl": "/uploads/meme123.png",
      "likes": 42,
      "dislikes": 3,
      "views": 250,
      "status": "approved",
      "user": {
        "id": 1,
        "username": "Player123",
        "avatar": "https://..."
      },
      "comments": [],
      "createdAt": "2025-01-20T14:30:00Z"
    }
  ]
}
```

---

### Create Meme
```http
POST /memes
```
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```
title: "Meme Title"
description: "Meme Description"
image: <file>
memeText: "Top text / Bottom text"
matchId: "7234567890" (optional)
matchData: <JSON> (optional)
```

**Response:**
```json
{
  "success": true,
  "meme": {
    "id": 1,
    "title": "Meme Title",
    "imageUrl": "/uploads/meme123.png",
    "status": "approved"
  }
}
```

---

### Like/Unlike Meme
```http
POST /memes/:id/like
```
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "liked": true,
  "likes": 43
}
```

---

### Add Comment
```http
POST /memes/:id/comments
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "text": "Great meme!"
}
```

**Response:**
```json
{
  "success": true,
  "comment": {
    "id": 1,
    "text": "Great meme!",
    "user": {
      "username": "Player123"
    },
    "createdAt": "2025-01-20T15:00:00Z"
  }
}
```

---

### Delete Comment
```http
DELETE /memes/:memeId/comments/:commentId
```
**Auth Required:** Yes (Owner or Admin)

**Response:**
```json
{
  "success": true,
  "message": "Комментарий удален"
}
```

---

## Steam API Endpoints

### Get User's Games
```http
GET /steam/:steamId/games
```

**Response:**
```json
{
  "games": [
    {
      "appid": 570,
      "name": "Dota 2",
      "playtime_forever": 123456,
      "playtime_2weeks": 1200,
      "img_icon_url": "...",
      "img_logo_url": "..."
    }
  ]
}
```

---

### Get Steam Profile
```http
GET /steam/:steamId/profile
```

**Response:**
```json
{
  "steamid": "76561198012345678",
  "personaname": "Player123",
  "avatarfull": "https://...",
  "profileurl": "https://steamcommunity.com/id/...",
  "timecreated": 1234567890
}
```

---

## Dota 2 Endpoints

### Get Player Stats
```http
GET /dota2/:steamId32/stats
```

**Response:**
```json
{
  "profile": {
    "account_id": 12345678,
    "personaname": "Player123",
    "avatarfull": "https://..."
  },
  "win_rate": 52.5,
  "total_matches": 1500,
  "wins": 788,
  "losses": 712
}
```

---

### Get Recent Matches
```http
GET /dota2/:steamId32/matches?limit=10
```

**Query Parameters:**
- `limit`: Number of matches (default: 10, max: 50)

**Response:**
```json
{
  "matches": [
    {
      "match_id": "7234567890",
      "player_slot": 0,
      "radiant_win": true,
      "duration": 2345,
      "game_mode": 22,
      "hero_id": 1,
      "kills": 12,
      "deaths": 5,
      "assists": 18,
      "start_time": 1705678901
    }
  ]
}
```

---

## Admin Endpoints

**All admin endpoints require `role: admin`**

### Get Memes for Moderation
```http
GET /admin/memes?status=pending
```
**Auth Required:** Admin

**Query Parameters:**
- `status`: `pending` | `approved` | `rejected` (optional)

**Response:**
```json
{
  "memes": [
    {
      "id": 1,
      "title": "Meme Title",
      "status": "pending",
      "user": {
        "username": "Player123"
      },
      "comments": []
    }
  ]
}
```

---

### Approve Meme
```http
POST /admin/memes/:id/approve
```
**Auth Required:** Admin

**Response:**
```json
{
  "message": "Мем одобрен",
  "meme": { "id": 1, "status": "approved" }
}
```

---

### Reject Meme
```http
POST /admin/memes/:id/reject
```
**Auth Required:** Admin

---

### Delete Meme
```http
POST /admin/memes/:id/delete
```
**Auth Required:** Admin

---

### Get All Users
```http
GET /admin/users
```
**Auth Required:** Admin

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "Player123",
      "steamId": "76561198012345678",
      "role": "user",
      "banned": false,
      "createdAt": "2025-01-15T10:00:00Z",
      "_count": { "memes": 15 }
    }
  ]
}
```

---

### Update User Role
```http
POST /admin/users/:id/role
```
**Auth Required:** Admin

**Request Body:**
```json
{
  "value": "moderator"
}
```

**Allowed Roles:** `user`, `moderator`, `admin`

---

### Ban/Unban User
```http
POST /admin/users/:id/ban
```
**Auth Required:** Admin

**Request Body:**
```json
{
  "value": true
}
```

---

## TeamSpeak Endpoints

### Get Server Status
```http
GET /server/status
```

**Response:**
```json
{
  "online": true,
  "name": "ErrorParty.ru",
  "clients": 12,
  "maxClients": 32,
  "uptime": 86400,
  "channels": 5,
  "platform": "Linux",
  "version": "3.13.7"
}
```

---

### Get Online Users
```http
GET /users/online
```

**Response:**
```json
{
  "clients": [
    {
      "clid": "1",
      "client_nickname": "Player123",
      "client_type": 0,
      "cid": "2",
      "client_unique_identifier": "abc123",
      "client_country": "RU"
    }
  ]
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limiting

API requests are cached using Redis:

- **TeamSpeak data:** 30-60 seconds
- **Steam profiles:** 10 minutes
- **Steam games:** 10 minutes
- **OpenDota stats:** 3-5 minutes

---

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3001');
```

### Events

#### server:status
Emitted when server status changes.
```javascript
socket.on('server:status', (data) => {
  console.log(data); // { online: true, clients: 12, ... }
});
```

#### server:update
Emitted when client count changes.
```javascript
socket.on('server:update', (data) => {
  console.log(data); // { clients: 13 }
});
```

#### client:join
Emitted when a client joins TeamSpeak.
```javascript
socket.on('client:join', (data) => {
  console.log(data); // { nickname: "Player123", ... }
});
```

#### client:leave
Emitted when a client leaves TeamSpeak.
```javascript
socket.on('client:leave', (data) => {
  console.log(data); // { nickname: "Player123" }
});
```

---

## Examples

### JavaScript/Fetch
```javascript
// Get memes
const response = await fetch('http://localhost:3001/api/memes?filter=popular');
const data = await response.json();

// Like meme with auth
const token = localStorage.getItem('token');
const likeResponse = await fetch('http://localhost:3001/api/memes/1/like', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Axios
```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const token = localStorage.getItem('token');

// Get user profile
const profile = await axios.get(`${API_URL}/user/profile`, {
  headers: { Authorization: `Bearer ${token}` }
});

// Create meme
const formData = new FormData();
formData.append('title', 'Epic Meme');
formData.append('image', fileInput.files[0]);

const meme = await axios.post(`${API_URL}/memes`, formData, {
  headers: { 
    Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

---

## Support

For issues or questions:
- GitHub: https://github.com/errorparty/errorparty.ru
- Discord: [Server Link]
- Email: admin@errorparty.ru
