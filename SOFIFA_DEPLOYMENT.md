# SoFIFA Integration - Deployment Guide

This guide explains how to deploy the SoFIFA integration to your Supabase project.

## Prerequisites

- Supabase account and project
- Supabase CLI installed (`npm install -g supabase`)
- Project linked to Supabase (`supabase link --project-ref your-project-ref`)

## Step 1: Apply Database Migrations

Run the database migration to create the required tables:

```bash
supabase db push
```

This will create:
- `public.sofifa_watchlist` - Stores SoFIFA player IDs to track
- `public.sofifa_cache` - Caches API responses with TTL
- Row Level Security (RLS) policies
- Initial seed data with 25 players

Or manually run the migration file:
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20251003212008_create_sofifa_tables.sql
```

## Step 2: Deploy Edge Function

Deploy the SoFIFA proxy edge function:

```bash
supabase functions deploy sofifa-proxy
```

The function will be available at:
```
https://<your-project-ref>.supabase.co/functions/v1/sofifa-proxy
```

## Step 3: Set Environment Variables

The edge function requires the following environment variables (automatically provided by Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key

These are automatically set by Supabase when deploying functions.

## Step 4: Test the Integration

### Test Edge Function

```bash
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/sofifa-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{"sofifaId": 239085, "useCache": true}'
```

Expected response:
```json
{
  "data": {
    "id": 239085,
    "name": "Erling Haaland",
    "overall": 91,
    ...
  },
  "source": "sofifa",
  "fetched_at": "2024-10-03T12:00:00Z"
}
```

### Test Frontend Service

In your React application:

```javascript
import SofifaService from './services/sofifaService';

// Fetch a single player
const playerData = await SofifaService.fetchPlayerData(239085);

// Get watchlist
const watchlist = await SofifaService.getWatchlist();

// Fetch all watchlist players with data
const playersWithData = await SofifaService.getWatchlistWithData();
```

## Step 5: Verify Attribution

Open your application in a browser and verify:
- ✅ SoFIFA attribution is visible in the bottom-right corner
- ✅ Attribution link opens https://sofifa.com in a new tab
- ✅ Attribution is always visible on all pages

## Architecture

```
User Request 
  → Frontend (sofifaService.js)
  → Supabase Client
  → Edge Function (sofifa-proxy)
  → Cache Check (sofifa_cache)
  → [Cache miss] → SoFIFA.com
  → Parse & Cache
  → Return to User
```

## Configuration

### Cache TTL

Default cache TTL is 24 hours (86400 seconds). To change:

```sql
-- Update default TTL
ALTER TABLE public.sofifa_cache 
ALTER COLUMN ttl_seconds SET DEFAULT 43200; -- 12 hours
```

### Watchlist Management

Add players to watchlist:
```javascript
await SofifaService.addToWatchlist(243854, 'Jude Bellingham');
```

Remove players:
```javascript
await SofifaService.removeFromWatchlist(243854);
```

## Monitoring

### Check Cache Performance

```sql
-- View cache entries
SELECT sofifa_id, cached_at, 
       EXTRACT(EPOCH FROM (NOW() - cached_at)) as age_seconds
FROM public.sofifa_cache
ORDER BY cached_at DESC;

-- Clear expired cache entries
DELETE FROM public.sofifa_cache
WHERE EXTRACT(EPOCH FROM (NOW() - cached_at)) > ttl_seconds;
```

### View Watchlist

```sql
SELECT * FROM public.sofifa_watchlist
ORDER BY display_name;
```

## Troubleshooting

### Edge Function Errors

Check logs:
```bash
supabase functions logs sofifa-proxy
```

### Database Issues

Check RLS policies:
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('sofifa_watchlist', 'sofifa_cache');
```

### CORS Issues

Ensure your domain is allowed in Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Add your domain to "Site URL" and "Additional Redirect URLs"

## Security Notes

- ✅ No API keys exposed in client code
- ✅ All SoFIFA requests go through secure edge function
- ✅ Row Level Security enabled on database tables
- ✅ Rate limiting via caching
- ✅ HTTPS only connections

## Compliance

See [SOFIFA_COMPLIANCE.md](SOFIFA_COMPLIANCE.md) for full compliance documentation.

## Support

For issues or questions:
- Check [supabase/functions/README.md](supabase/functions/README.md)
- Review [SOFIFA_COMPLIANCE.md](SOFIFA_COMPLIANCE.md)
- Open an issue on GitHub

## References

- Issue: #19
- Supabase Docs: https://supabase.com/docs/guides/functions
- SoFIFA: https://sofifa.com
