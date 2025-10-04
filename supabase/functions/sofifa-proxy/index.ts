// Supabase Edge Function - SoFIFA Cache Proxy
// This function serves as a caching layer for SoFIFA player data
// Data is sourced from the client-side JSON file and cached in the database
// NOTE: SoFIFA does not provide a public REST API for direct fetching
// Data must be pre-populated from sofifa_my_players_app.json

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SofifaRequest {
  sofifaId: number;
  useCache?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { sofifaId, useCache = true }: SofifaRequest = await req.json()

    if (!sofifaId || typeof sofifaId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid sofifaId parameter' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check cache first if enabled
    if (useCache) {
      const { data: cachedData, error: cacheError } = await supabaseClient
        .from('sofifa_cache')
        .select('payload, cached_at, ttl_seconds')
        .eq('sofifa_id', sofifaId)
        .single()

      if (!cacheError && cachedData) {
        const cachedAt = new Date(cachedData.cached_at).getTime()
        const now = Date.now()
        const ttlMs = cachedData.ttl_seconds * 1000

        // Check if cache is still valid
        if (now - cachedAt < ttlMs) {
          console.log(`Cache hit for SoFIFA ID ${sofifaId}`)
          return new Response(
            JSON.stringify({ 
              data: cachedData.payload, 
              source: 'cache',
              cached_at: cachedData.cached_at
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }
    }

    // Check watchlist to see if this player is tracked
    const { data: watchlistEntry } = await supabaseClient
      .from('sofifa_watchlist')
      .select('sofifa_id, display_name')
      .eq('sofifa_id', sofifaId)
      .single()

    if (!watchlistEntry) {
      return new Response(
        JSON.stringify({ 
          error: 'Player not in watchlist. Please add player to watchlist first or use client-side JSON data.',
          sofifaId,
          hint: 'This player needs to be added to the sofifa_watchlist table'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Since we can't reliably scrape SoFIFA, return a message indicating
    // that the data should be populated from the client-side JSON file
    // The cache should be pre-populated with data from sofifa_my_players_app.json
    return new Response(
      JSON.stringify({ 
        error: 'Data not in cache. Please populate cache from client-side JSON data.',
        sofifaId,
        display_name: watchlistEntry.display_name,
        hint: 'Use SofifaService.populateCacheFromJSON() to pre-populate cache with local JSON data'
      }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
