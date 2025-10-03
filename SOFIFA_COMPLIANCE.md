# SoFIFA API Integration - Compliance Documentation

## Overview

This document outlines the compliance measures taken for integrating SoFIFA data into the FUSTA (FIFA Statistik-Tracker) application.

**Related Issue:** #19  
**Implementation Date:** October 3, 2024

## Purpose

The integration provides real-time FIFA player statistics and ratings from SoFIFA.com to enhance the user experience within the FUSTA application.

## Compliance Measures

### 1. Attribution & Credit

✅ **Visible Attribution**: A permanent, visible attribution link to SoFIFA.com is displayed in the application footer (bottom-right corner).

**Implementation:**
- Location: `index.html` - Fixed footer element
- Content: "Player data powered by SoFIFA" with clickable logo/link
- Visibility: Always visible on all pages
- Opens in new tab with proper `rel="noopener noreferrer"` attributes

### 2. Terms of Service Compliance

✅ **No API Key Exposure**: API keys and credentials are kept server-side only
- Client-side code never contains API keys
- All SoFIFA requests are proxied through Supabase Edge Functions
- Edge Function handles authentication and rate limiting

✅ **Rate Limiting**: Implemented to prevent abuse
- Caching layer to reduce external API calls
- 24-hour cache TTL (configurable)
- Edge function controls request frequency

✅ **Proper User-Agent**: Server-side requests include proper headers
- User-Agent identifies the application
- Accept headers properly set
- Cache-Control headers respected

### 3. Data Usage

✅ **Fair Use**:
- Data is fetched only when needed
- Caching reduces redundant requests
- Batch operations minimize API calls
- No bulk scraping or data hoarding

✅ **Data Storage**:
- Only necessary fields are cached
- Cache has automatic expiration (TTL)
- Original source attribution preserved
- No redistribution of data

### 4. Privacy & Security

✅ **User Privacy**:
- No user data sent to SoFIFA
- No tracking cookies from integration
- User searches are not logged or shared

✅ **Security**:
- All requests go through authenticated proxy
- HTTPS only connections
- No client-side secrets
- Row Level Security (RLS) enabled on database tables

## Architecture

### Components

1. **Supabase Edge Function** (`supabase/functions/sofifa-proxy/index.ts`)
   - Acts as secure proxy
   - Handles rate limiting
   - Manages caching
   - Parses HTML responses

2. **Database Tables**:
   - `sofifa_watchlist`: Stores player IDs to track
   - `sofifa_cache`: Temporary cache with TTL

3. **Frontend Service** (`src/services/sofifaService.js`)
   - Clean API for components
   - Manages watchlist
   - Handles errors gracefully

4. **Attribution UI** (`index.html`)
   - Visible credit link
   - Always accessible
   - Opens in new tab

### Data Flow

```
User Request 
  → Frontend Service (sofifaService.js)
  → Supabase Client
  → Edge Function (sofifa-proxy)
  → Cache Check (sofifa_cache table)
  → [If cache miss] → SoFIFA.com
  → Parse & Store in Cache
  → Return to User
```

## Database Schema

### sofifa_watchlist
```sql
CREATE TABLE public.sofifa_watchlist (
  sofifa_id integer PRIMARY KEY,
  display_name text
);
```

### sofifa_cache
```sql
CREATE TABLE public.sofifa_cache (
  sofifa_id integer PRIMARY KEY,
  payload jsonb NOT NULL,
  cached_at timestamptz DEFAULT now(),
  ttl_seconds integer DEFAULT 86400
);
```

## API Usage Guidelines

### Endpoints

**Edge Function**: `/functions/v1/sofifa-proxy`

**Request Format**:
```json
{
  "sofifaId": 239085,
  "useCache": true
}
```

**Response Format**:
```json
{
  "data": {
    "id": 239085,
    "name": "Erling Haaland",
    "overall": 91,
    "potential": 94,
    ...
  },
  "source": "cache|sofifa",
  "cached_at": "2024-10-03T12:00:00Z"
}
```

### Rate Limits

- **Cache First**: Always checks cache before external request
- **TTL**: 24 hours default (86400 seconds)
- **Batch Operations**: Supported for multiple players
- **Error Handling**: Graceful fallbacks

## Monitoring & Maintenance

### Logging

- All requests logged in Edge Function
- Cache hit/miss tracking
- Error tracking for failed requests
- Performance metrics

### Cache Management

- Automatic expiration via TTL
- Manual clear available via service
- Cache stats accessible
- Optimized for performance

### Updates

- Regular reviews of SoFIFA ToS
- HTML parser updates as needed
- Cache strategy optimization
- Attribution link maintenance

## Legal Considerations

### Copyright

- SoFIFA data is property of SoFIFA.com
- No claim of ownership over fetched data
- Attribution provided as required
- Fair use for personal application

### Liability

- Application makes best effort for compliance
- Data accuracy not guaranteed
- SoFIFA may change at any time
- Integration may break with site updates

### User Agreement

Users of this application understand:
- Data comes from third-party source (SoFIFA)
- No warranty on data accuracy
- Service may be interrupted
- Attribution requirements must be maintained

## Contact & Support

For questions about this integration:
- Review SoFIFA Terms: https://sofifa.com
- Project Issues: GitHub Issue #19
- Implementation: See source code documentation

## Changelog

### Version 1.0.0 (2024-10-03)
- Initial implementation
- Edge function proxy
- Database tables created
- Attribution added
- Documentation created

---

**Last Updated:** October 3, 2024  
**Reviewed By:** Development Team  
**Next Review:** October 3, 2025
