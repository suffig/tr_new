-- Migration: Create SoFIFA integration tables
-- Purpose: Add tables for SoFIFA watchlist and caching
-- Related to Issue #19

-- Create sofifa_watchlist table
-- Stores SoFIFA IDs of players to track
CREATE TABLE IF NOT EXISTS public.sofifa_watchlist (
  sofifa_id integer NOT NULL,
  display_name text,
  CONSTRAINT sofifa_watchlist_pkey PRIMARY KEY (sofifa_id)
);

-- Add comment to table
COMMENT ON TABLE public.sofifa_watchlist IS 'Watchlist of SoFIFA player IDs to track';

-- Create sofifa_cache table
-- Optional caching layer for SoFIFA API responses
CREATE TABLE IF NOT EXISTS public.sofifa_cache (
  sofifa_id integer NOT NULL,
  payload jsonb NOT NULL,
  cached_at timestamp with time zone NOT NULL DEFAULT now(),
  ttl_seconds integer NOT NULL DEFAULT 86400,
  CONSTRAINT sofifa_cache_pkey PRIMARY KEY (sofifa_id)
);

-- Add comment to table
COMMENT ON TABLE public.sofifa_cache IS 'Cache for SoFIFA API responses to reduce external calls';

-- Add index for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_sofifa_cache_expiry 
ON public.sofifa_cache (cached_at, ttl_seconds);

-- Seed sofifa_watchlist with initial players
-- Based on the players in sofifa_my_players_app.json
INSERT INTO public.sofifa_watchlist (sofifa_id, display_name) VALUES
  (239085, 'Erling Haaland'),
  (231747, 'Kylian Mbappé'),
  (192985, 'Kevin De Bruyne'),
  (158023, 'Lionel Messi'),
  (20801, 'Cristiano Ronaldo'),
  (183277, 'Toni Kroos'),
  (200389, 'Jan Oblak'),
  (190871, 'Neymar Jr'),
  (188545, 'Robert Lewandowski'),
  (209658, 'Harry Kane'),
  (231443, 'Bukayo Saka'),
  (243854, 'Jude Bellingham'),
  (212198, 'Bruno Fernandes'),
  (167495, 'Manuel Neuer'),
  (235374, 'Manuel Lazzari'),
  (239093, 'Jonathan Clauss'),
  (226853, 'Jeremiah St. Juste'),
  (197445, 'David Alaba'),
  (246688, 'Saud Abdulhamid'),
  (190941, 'Lukáš Hrádecký'),
  (212831, 'Alisson'),
  (228618, 'Ferland Mendy'),
  (201535, 'Raphaël Varane'),
  (186153, 'Wojciech Szczęsny'),
  (213331, 'Jonathan Tah')
ON CONFLICT (sofifa_id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

-- Grant permissions (adjust as needed for your setup)
-- These assume you have authentication and RLS enabled
ALTER TABLE public.sofifa_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sofifa_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read watchlist
CREATE POLICY IF NOT EXISTS "Allow read access to sofifa_watchlist" 
ON public.sofifa_watchlist 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to read cache
CREATE POLICY IF NOT EXISTS "Allow read access to sofifa_cache" 
ON public.sofifa_cache 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role to manage cache (for the edge function)
CREATE POLICY IF NOT EXISTS "Allow service role to manage cache" 
ON public.sofifa_cache 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);
