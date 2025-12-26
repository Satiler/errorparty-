# CS2 Auto Demo Download System

## Overview

Automated system for downloading and parsing CS2 demo files with Game State Integration support.

## Features

### 1. Game State Integration (GSI)
- **Real-time match tracking**: Captures live match data during gameplay
- **Automatic statistics**: Saves K/D/A, MVPs, rounds won/lost immediately after match ends
- **No demo files needed**: Works without demo file dependencies
- **Setup**: Copy `gamestate_integration_errorparty.cfg` to CS2 game directory

### 2. Automatic Demo Download (Cron Jobs)

#### Match Synchronization
- **Schedule**: Every 6 hours
- **Function**: Fetches new match Share Codes from Steam API
- **Process**:
  1. Finds all users with linked CS2 Auth Tokens
  2. Calls Steam API `GetNextMatchSharingCode` for each user
  3. Creates match records in database
  4. Queues demos for download

#### Demo Download
- **Schedule**: Every hour
- **Function**: Downloads demo files for matches < 30 days old
- **Process**:
  1. Finds matches without demo files
  2. Checks if match is < 30 days old (Valve's retention period)
  3. Uses Steam Game Coordinator to get demo URL
  4. Downloads and stores compressed demo file
  5. Queues for parsing

#### Cleanup
- **Schedule**: Daily at 2:00 AM
- **Function**: Removes old expired demo records
- **Process**: Deletes demo records with status 'expired' or 'failed' older than 60 days

### 3. Demo File Handling

#### Download Process
```
User Match → Share Code → Steam GC → Demo URL → Download → Parse → Statistics
```

#### Statuses
- `pending`: Demo queued for download
- `downloading`: Currently downloading from Valve servers
- `downloaded`: Successfully downloaded, ready for parsing
- `parsing`: Extracting statistics from demo file
- `parsed`: Complete, statistics saved to match
- `failed`: Download or parsing error
- `expired`: Match > 30 days old, demo unavailable

## API Endpoints

### Cron Management

#### Get Cron Status
```http
GET /api/cs2/cron/status
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "status": {
    "isRunning": true,
    "activeJobs": 3,
    "jobs": [
      {
        "name": "Match Sync",
        "schedule": "Every 6 hours",
        "expression": "0 */6 * * *"
      },
      {
        "name": "Demo Download",
        "schedule": "Every hour",
        "expression": "0 * * * *"
      },
      {
        "name": "Cleanup",
        "schedule": "Daily at 2:00 AM",
        "expression": "0 2 * * *"
      }
    ]
  }
}
```

#### Trigger Manual Sync
```http
POST /api/cs2/cron/sync
Authorization: Bearer <token>
```

Starts immediate match synchronization for all users with auth tokens.

#### Trigger Manual Demo Download
```http
POST /api/cs2/cron/download
Authorization: Bearer <token>
```

Starts immediate demo download for all pending matches.

### Match Management

#### Get Demo Status
```http
GET /api/cs2/match/:matchId/demo/status
Authorization: Bearer <token>
```

Response:
```json
{
  "status": "downloaded",
  "downloadedAt": "2025-11-22T15:30:00.000Z",
  "parsedAt": null,
  "fileSize": 45678901,
  "error": null
}
```

## Configuration

### Environment Variables

```bash
# Steam API
STEAM_API_KEY=your_steam_api_key

# Demo Storage
CS2_DEMO_PATH=/app/demos

# Steam Game Coordinator (optional)
STEAM_GC_ACCOUNT_NAME=your_steam_username
STEAM_GC_PASSWORD=your_steam_password
```

### Cron Schedule
Edit `backend/src/services/cs2DemoCronService.js`:

```javascript
// Match sync: Every 6 hours
cron.schedule('0 */6 * * *', ...)

// Demo download: Every hour
cron.schedule('0 * * * *', ...)

// Cleanup: Daily at 2:00 AM
cron.schedule('0 2 * * *', ...)
```

## How It Works

### For New Matches (< 30 days)

1. **User plays match** → CS2 generates Share Code
2. **User links Auth Token** → Enables automatic sync
3. **Cron runs every 6 hours** → Fetches new Share Codes
4. **Demo download cron runs hourly** → Downloads fresh demos
5. **Demo parser extracts stats** → Saves to database
6. **Frontend displays** → Full statistics available

### For Old Matches (> 30 days)

1. **Valve deletes demo files** after ~30 days
2. **Status marked as 'expired'** in database
3. **Frontend shows** "Demo expired" message
4. **Basic info displayed** from Share Code (matchId, date)

### With Game State Integration (GSI)

1. **User plays match** with GSI enabled
2. **CS2 sends live data** to backend during match
3. **Match end detected** → Statistics saved immediately
4. **No demo file needed** → Statistics available instantly
5. **Works for all matches** regardless of age

## Troubleshooting

### Demo Downloads Failing

**Problem**: All demos show status 'expired'

**Cause**: Matches older than 30 days

**Solution**: 
- Demos cannot be recovered for old matches
- Use GSI for future matches
- Enable cron to catch matches within 30-day window

### Steam GC Timeout

**Problem**: "Request timeout: Steam GC did not respond"

**Cause**: 
- Match too old (> 30 days)
- Steam GC connection issues
- Invalid Share Code

**Solution**:
- Check match date
- Verify Share Code format
- Restart backend to reset GC connection

### Cron Not Running

**Problem**: No automatic syncs happening

**Check**:
```bash
# View backend logs
docker logs errorparty_backend --tail 100

# Check for startup message
# "✅ CS2 Demo Cron Service started"
```

**Solution**:
- Ensure backend is running
- Check for startup errors
- Verify node-cron is installed

## Performance

### Resource Usage
- **CPU**: Minimal (cron tasks are async)
- **Memory**: ~50MB per active download
- **Disk**: ~30-100MB per demo file (compressed)
- **Network**: ~30-100MB per demo download

### Scalability
- **Max concurrent downloads**: 3 (configurable)
- **Queue system**: Handles unlimited matches
- **Rate limiting**: 500ms delay between Steam API calls

### Optimization
- Demos auto-delete after 60 days
- Failed downloads retry on next cron cycle
- Expired matches skip download attempts

## User Flow

### Setup (One-time)
1. User links Steam account
2. User adds CS2 Auth Token
3. User copies GSI config to CS2 folder
4. User plays matches

### Automatic (Ongoing)
1. GSI captures live match stats (instant)
2. Cron syncs new matches every 6 hours
3. Cron downloads demos every hour (if < 30 days)
4. Parser extracts detailed statistics
5. Frontend displays all available data

### Manual (Optional)
1. User can trigger manual sync via API
2. User can trigger manual demo download
3. User can add matches via Share Code
4. User can view cron status

## Limitations

### Valve Platform Limitations
- ❌ Demo files deleted after ~30 days (cannot be recovered)
- ❌ Steam API doesn't provide per-match statistics
- ❌ GetNextMatchSharingCode requires known Share Code to start
- ❌ Demo URLs are temporary and generated on-demand

### Technical Limitations
- ✅ GSI only works when user is playing (not for historical data)
- ✅ Demo parsing requires demo file (unavailable for old matches)
- ✅ Steam GC may rate-limit requests
- ✅ Demo files are large (~30-100MB each)

## Future Improvements

### Planned Features
- [ ] Real-time demo parsing notifications
- [ ] Demo file compression/cleanup automation
- [ ] Advanced statistics from demo files:
  - Heatmaps
  - Grenade throws
  - Economy management
  - Positioning analysis
- [ ] Manual demo upload for expired matches
- [ ] Demo sharing between users
- [ ] Highlight clips extraction

### Optimization
- [ ] Incremental demo parsing (resume from last position)
- [ ] Demo file caching/CDN
- [ ] Parallel demo parsing
- [ ] Smart retry logic for failed downloads

## References

- [Steam Web API Documentation](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [CS2 Game State Integration](https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Game_State_Integration)
- [Steam Game Coordinator Protocol](https://github.com/DoctorMcKay/node-steam-user)
- [Demo File Parser](https://github.com/saul/demofile)
