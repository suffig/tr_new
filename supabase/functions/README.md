# Supabase Edge Functions

This directory contains Supabase Edge Functions for the FUSTA application.

## Functions

### sofifa-proxy

Secure proxy for fetching player data from SoFIFA.com without exposing API keys or credentials in the client.

**Purpose**: 
- Fetch player statistics from SoFIFA
- Cache responses to reduce external API calls
- Prevent client-side API key exposure

**Endpoint**: `/functions/v1/sofifa-proxy`

**Request**:
```json
{
  "sofifaId": 239085,
  "useCache": true
}
```

**Response**:
```json
{
  "data": {
    "id": 239085,
    "name": "Erling Haaland",
    "overall": 91,
    ...
  },
  "source": "cache|sofifa",
  "cached_at": "2024-10-03T12:00:00Z"
}
```

## Deployment

To deploy these functions to your Supabase project:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Deploy functions:
   ```bash
   supabase functions deploy sofifa-proxy
   ```

## Environment Variables

Required environment variables (automatically provided by Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key

## Testing

Test the function locally:

```bash
supabase functions serve sofifa-proxy
```

Then make a request:

```bash
curl -X POST http://localhost:54321/functions/v1/sofifa-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"sofifaId": 239085, "useCache": true}'
```

## Security

- Functions run in isolated Deno runtime
- All requests authenticated via Supabase auth
- Rate limiting implemented
- No sensitive data exposed to client
- Row Level Security (RLS) enabled on database tables

## Related Documentation

- [SOFIFA_COMPLIANCE.md](../SOFIFA_COMPLIANCE.md) - Compliance documentation
- [Migration: 20251003212008_create_sofifa_tables.sql](../supabase/migrations/) - Database schema
- [Frontend Service: sofifaService.js](../src/services/sofifaService.js) - Client-side integration
