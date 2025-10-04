// Supabase Edge Function - SoFIFA API Proxy
// This function acts as a secure proxy to fetch player data from SoFIFA API
// Implements intelligent caching to minimize external API calls
// API Endpoint: https://api.sofifa.net/players/{player_id}

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

    // Fetch from SoFIFA API
    console.log(`Fetching player data from SoFIFA API for ID ${sofifaId}`)
    
    try {
      const apiUrl = `https://api.sofifa.net/players/${sofifaId}`
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; SupabaseEdgeFunction/1.0)',
        },
      })

      if (!apiResponse.ok) {
        throw new Error(`SoFIFA API returned ${apiResponse.status}: ${apiResponse.statusText}`)
      }

      const sofifaData = await apiResponse.json()
      
      // Cache the response if useCache is enabled
      if (useCache && sofifaData) {
        await supabaseClient
          .from('sofifa_cache')
          .upsert({
            sofifa_id: sofifaId,
            payload: sofifaData,
            cached_at: new Date().toISOString(),
            ttl_seconds: 86400 // 24 hours
          })
          .select()
        
        console.log(`Cached data for SoFIFA ID ${sofifaId}`)
      }

      return new Response(
        JSON.stringify({ 
          data: sofifaData, 
          source: 'sofifa_api',
          fetched_at: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (apiError) {
      console.error(`Failed to fetch from SoFIFA API: ${apiError.message}`)
      
      // Return error with helpful message
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch data from SoFIFA API',
          sofifaId,
          details: apiError.message,
          hint: 'The player data could not be retrieved from the SoFIFA API'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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
