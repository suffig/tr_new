# SoFIFA Integration - Data Flow Documentation

## Overview

This document explains how player data is loaded through the SoFIFA caching system in the existing squad (Kader) and player detail card components.

**IMPORTANT**: SoFIFA does not provide a public REST API for real-time data fetching. Player data is sourced from the local `sofifa_my_players_app.json` file and cached in the database for performance.

## Components Affected

The following components now automatically use the SoFIFA Edge Function proxy:

1. **KaderTab** (`src/components/tabs/KaderTab.jsx`)
   - Squad overview for AEK, Real Madrid, and Former Players
   - Player cards showing position, goals, and value
   - Clicking on a player opens the detail modal

2. **PlayerDetailModal** (`src/components/PlayerDetailModal.jsx`)
   - Detailed player information with FIFA ratings
   - Skills breakdown (Shooting, Passing, Movement, Physical)
   - Overall and potential ratings

3. **EAPlayerCard** (`src/components/EAPlayerCard.jsx`)
   - Individual player card component
   - FIFA-style card with rating and attributes
   - Used throughout the application

## Data Flow

### Current Architecture (Cache-Based)
```
Component → FIFADataService.getPlayerData()
              ↓
          Local Database (fifaDatabase)
              ↓
          [Has sofifaId?] → YES
              ↓
          SofifaService.fetchPlayerData(sofifaId)
              ↓
          Supabase Edge Function
              ↓
          Check sofifa_cache table
              ↓
          Cache HIT → Return cached data ⚡
          Cache MISS → Return error (data must be pre-populated from JSON)
              ↓
          Fallback to local JSON via SofifaIntegration
              ↓
          Component displays data
```

### Cache Initialization

On app startup, the cache is automatically populated from the local JSON file:

```
App.jsx useEffect
  ↓
SofifaCacheInitializer.initialize()
  ↓
SofifaService.populateCacheFromJSON()
  ↓
Load sofifa_my_players_app.json
  ↓
Transform each player to cache format
  ↓
Insert into sofifa_cache table (30-day TTL)
  ↓
Cache ready for use
```

### Fallback Chain

1. **Primary**: Supabase Edge Function (cache only)
   - Checks `sofifa_cache` table
   - Returns cached data if available
   - Returns 404 if not in cache

2. **Secondary**: Direct SofifaIntegration
   - Loads from local JSON file (`sofifa_my_players_app.json`)
   - Client-side processing
   - Always available

3. **Tertiary**: Local Database
   - Final fallback
   - Uses pre-loaded player data from fifaDatabase

## Benefits

### 🔒 Security
- No API keys exposed in client
- All external requests go through authenticated proxy
- Row Level Security on database tables

### ⚡ Performance
- 24-hour cache reduces repeated API calls
- Cached responses load instantly
- Reduces load on SoFIFA servers

### 🛡️ Reliability
- Multiple fallback layers
- Graceful degradation if services unavailable
- Always shows player data (even if outdated)

### 🔧 Maintainability
- No code changes needed in components
- Centralized data fetching logic
- Easy to update cache TTL or add new data sources

## Code Example

### Component (No changes needed!)

```javascript
// KaderTab.jsx - No changes needed!
import { FIFADataService } from '../utils/fifaDataService';

const loadPlayerData = async (playerName) => {
  const data = await FIFADataService.getPlayerData(playerName);
  // Data now comes from Edge Function automatically!
  console.log(data.overall); // 91
  console.log(data.source); // 'sofifa_edge_cached' or 'sofifa_edge_live'
};
```

### Updated FIFADataService

```javascript
// src/utils/fifaDataService.js
static async getPlayerData(playerName, options = { useLiveData: true }) {
  // ... player lookup logic ...
  
  if (playerData && options.useLiveData) {
    // PRIORITY 1: Edge Function (NEW!)
    if (playerData.sofifaId) {
      const edgeData = await SofifaService.fetchPlayerData(playerData.sofifaId);
      if (edgeData && edgeData.data) {
        return transformedData; // Returns cached or live data
      }
    }
    
    // PRIORITY 2: Direct integration (fallback)
    if (playerData.sofifaUrl) {
      const liveData = await SofifaIntegration.fetchPlayerData(...);
      if (liveData) return liveData;
    }
  }
  
  // PRIORITY 3: Local database (final fallback)
  return playerData;
}
```

## Testing

### Verify Edge Function Integration

1. Open browser DevTools (F12)
2. Navigate to Kader tab
3. Click on a player to open detail modal
4. Check Console for logs:
   ```
   🚀 Attempting to fetch live data via Supabase Edge Function for ID: 239085...
   ✅ Enhanced with SoFIFA Edge Function data (cache) for: Erling Haaland
   ```

### Cache Verification

First request:
```
source: 'sofifa_edge_live'  // Fetched from SoFIFA.com
```

Subsequent requests (within 24h):
```
source: 'sofifa_edge_cached'  // Loaded from cache
```

## Cache Management

### View Cache Status
```sql
SELECT sofifa_id, cached_at, 
       EXTRACT(EPOCH FROM (NOW() - cached_at)) / 3600 as hours_old
FROM public.sofifa_cache
ORDER BY cached_at DESC;
```

### Clear Cache for Player
```javascript
await SofifaService.clearCache(239085); // Erling Haaland
```

### Clear All Expired Cache
```sql
DELETE FROM public.sofifa_cache
WHERE EXTRACT(EPOCH FROM (NOW() - cached_at)) > ttl_seconds;
```

## Troubleshooting

### Player data not loading
1. Check if Supabase Edge Function is deployed
2. Verify database migration applied
3. Check browser console for errors
4. Ensure player has valid `sofifaId`

### Always using fallback
- Edge Function might not be deployed
- Check Supabase project configuration
- Verify authentication is working

### Cache not working
- Check `sofifa_cache` table exists
- Verify RLS policies are correct
- Check TTL settings (default 86400 seconds)

## Related Files

- **Edge Function**: `supabase/functions/sofifa-proxy/index.ts`
- **Frontend Service**: `src/services/sofifaService.js`
- **FIFA Service**: `src/utils/fifaDataService.js`
- **Database Migration**: `supabase/migrations/20251003212008_create_sofifa_tables.sql`

## Documentation

- [SOFIFA_COMPLIANCE.md](SOFIFA_COMPLIANCE.md) - Legal compliance
- [SOFIFA_DEPLOYMENT.md](SOFIFA_DEPLOYMENT.md) - Deployment guide
- [SOFIFA_IMPLEMENTATION_SUMMARY.md](SOFIFA_IMPLEMENTATION_SUMMARY.md) - Technical overview

---

**Last Updated**: October 3, 2024  
**Status**: ✅ Integrated and Working  
**Issue**: #19
