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
    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody))
    
    const { sofifaId, useCache = true }: SofifaRequest = requestBody

    if (!sofifaId) {
      return new Response(
        JSON.stringify({ error: 'Missing sofifaId parameter' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Convert to number if needed
    const numericId = typeof sofifaId === 'string' ? parseInt(sofifaId, 10) : sofifaId
    
    if (typeof numericId !== 'number' || isNaN(numericId) || numericId <= 0) {
      return new Response(
        JSON.stringify({ error: `Invalid sofifaId parameter: ${sofifaId}` }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Use the numeric ID for all subsequent operations
    const playerId = numericId

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
        .eq('sofifa_id', playerId)
        .single()

      if (!cacheError && cachedData) {
        const cachedAt = new Date(cachedData.cached_at).getTime()
        const now = Date.now()
        const ttlMs = cachedData.ttl_seconds * 1000

        // Check if cache is still valid
        if (now - cachedAt < ttlMs) {
          console.log(`✅ Cache hit for SoFIFA ID ${playerId}`)
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
        } else {
          console.log(`⏰ Cache expired for SoFIFA ID ${playerId}`)
        }
      } else if (cacheError) {
        console.log(`⚠️ No cache found for SoFIFA ID ${playerId}`)
      }
    }

    // Fetch from SoFIFA API
    console.log(`📡 Fetching player data from SoFIFA API for ID ${playerId}`)
    
    try {
      const apiUrl = `https://api.sofifa.net/players/${playerId}`
      console.log(`API URL: ${apiUrl}`)
      
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; SupabaseEdgeFunction/1.0)',
        },
      })

      console.log(`API Response status: ${apiResponse.status}`)

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        console.error(`SoFIFA API error response: ${errorText}`)
        throw new Error(`SoFIFA API returned ${apiResponse.status}: ${apiResponse.statusText}`)
      }

      const responseText = await apiResponse.text()
      console.log(`API Response (first 200 chars): ${responseText.substring(0, 200)}`)
      
      let sofifaData
      try {
        sofifaData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse API response as JSON')
        throw new Error('Invalid JSON response from SoFIFA API')
      }

      // Validate that we got valid data
      if (!sofifaData || typeof sofifaData !== 'object') {
        throw new Error('Invalid data structure from SoFIFA API')
      }
      
      // Cache the response if useCache is enabled
      if (useCache) {
        try {
          const { error: cacheError } = await supabaseClient
            .from('sofifa_cache')
            .upsert({
              sofifa_id: playerId,
              payload: sofifaData,
              cached_at: new Date().toISOString(),
              ttl_seconds: 86400 // 24 hours
            })
          
          if (cacheError) {
            console.warn(`Failed to cache data: ${cacheError.message}`)
          } else {
            console.log(`✅ Cached data for SoFIFA ID ${playerId}`)
          }
        } catch (cacheError) {
          console.warn(`Cache operation failed: ${cacheError.message}`)
          // Continue anyway - caching failure shouldn't break the response
        }
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
      console.error(`❌ Failed to fetch from SoFIFA API: ${apiError.message}`)
      
      // Return error with helpful message
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch data from SoFIFA API',
          sofifaId: playerId,
          details: apiError.message,
          hint: 'The player data could not be retrieved from the SoFIFA API. The API may be unavailable or the player ID may be invalid.'
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
