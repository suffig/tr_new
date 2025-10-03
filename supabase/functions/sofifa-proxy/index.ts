// Supabase Edge Function - SoFIFA Proxy
// This function acts as a secure proxy to fetch data from SoFIFA
// without exposing API keys or allowing direct client access

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

    // Fetch from SoFIFA (using multiple strategies)
    console.log(`Fetching SoFIFA data for ID ${sofifaId}`)
    
    // Strategy 1: Try direct fetch with proper headers
    let sofifaData = null
    const sofifaUrl = `https://sofifa.com/player/${sofifaId}`
    
    try {
      const response = await fetch(sofifaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })

      if (response.ok) {
        const html = await response.text()
        sofifaData = parsePlayerDataFromHTML(html, sofifaId)
      }
    } catch (error) {
      console.error(`Error fetching from SoFIFA: ${error.message}`)
    }

    // If we got data, cache it
    if (sofifaData && useCache) {
      await supabaseClient
        .from('sofifa_cache')
        .upsert({
          sofifa_id: sofifaId,
          payload: sofifaData,
          cached_at: new Date().toISOString(),
          ttl_seconds: 86400 // 24 hours
        })
        .select()
    }

    if (sofifaData) {
      return new Response(
        JSON.stringify({ 
          data: sofifaData, 
          source: 'sofifa',
          fetched_at: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If all strategies fail, return error
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch data from SoFIFA',
        sofifaId 
      }),
      { 
        status: 503,
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

/**
 * Parse player data from SoFIFA HTML
 * This is a basic parser - can be enhanced based on needs
 */
function parsePlayerDataFromHTML(html: string, sofifaId: number): any {
  // Basic extraction logic
  // In production, this would use a more robust HTML parser
  
  const data: any = {
    id: sofifaId,
    source: 'sofifa',
    url: `https://sofifa.com/player/${sofifaId}`
  }

  // Extract player name
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
  if (nameMatch) {
    data.name = nameMatch[1].trim()
  }

  // Extract overall rating
  const overallMatch = html.match(/class="overall">(\d+)</)
  if (overallMatch) {
    data.overall = parseInt(overallMatch[1])
  }

  // Extract potential rating
  const potentialMatch = html.match(/class="potential">(\d+)</)
  if (potentialMatch) {
    data.potential = parseInt(potentialMatch[1])
  }

  // Extract positions
  const positionsMatch = html.match(/class="pos">([^<]+)</)
  if (positionsMatch) {
    data.positions = positionsMatch[1].trim()
  }

  // Extract nationality
  const nationalityMatch = html.match(/data-tippy-content="([^"]+)"[^>]*>.*?flag.*?</)
  if (nationalityMatch) {
    data.nationality = nationalityMatch[1].trim()
  }

  // Extract age
  const ageMatch = html.match(/data-tippy-content="[^"]*\((\d+)\s*y\.o/)
  if (ageMatch) {
    data.age = parseInt(ageMatch[1])
  }

  // Extract height
  const heightMatch = html.match(/(\d+)cm/)
  if (heightMatch) {
    data.height_cm = parseInt(heightMatch[1])
  }

  // Extract weight
  const weightMatch = html.match(/(\d+)kg/)
  if (weightMatch) {
    data.weight_kg = parseInt(weightMatch[1])
  }

  return data
}
