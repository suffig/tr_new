/**
 * EA FC API Integration Service
 * Integrates with EA FC API to fetch real player data and stats
 */

class EAFCAPIService {
  constructor() {
    this.baseURL = 'https://api.ea.com/fc'; // EA FC API endpoint (hypothetical)
    this.apiKey = process.env.REACT_APP_EA_FC_API_KEY || '';
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimitDelay = 1000; // 1 second between requests
  }

  /**
   * Get player data by name with fuzzy matching
   */
  async getPlayerData(playerName, options = {}) {
    try {
      // Check cache first
      const cacheKey = `player_${playerName.toLowerCase()}`;
      const cached = this.getCachedData(cacheKey);
      if (cached && !options.forceRefresh) {
        return { data: cached, source: 'cache' };
      }

      // Queue the request to respect rate limits
      return await this.queueRequest(async () => {
        // Try EA FC API first
        let playerData = await this.fetchFromEAFC(playerName);
        
        // Fallback to SoFIFA if EA FC fails
        if (!playerData) {
          playerData = await this.fetchFromSoFIFA(playerName);
        }

        // Fallback to mock data for development
        if (!playerData) {
          playerData = this.getMockPlayerData(playerName);
        }

        if (playerData) {
          this.setCachedData(cacheKey, playerData);
        }

        return { 
          data: playerData, 
          source: playerData ? (playerData.source || 'ea_fc') : 'not_found' 
        };
      });
    } catch (error) {
      console.error('Error fetching player data:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Fetch player data from EA FC API
   */
  async fetchFromEAFC(playerName) {
    if (!this.apiKey) {
      console.warn('EA FC API key not configured');
      return null;
    }

    try {
      const searchUrl = `${this.baseURL}/players/search`;
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: playerName,
          limit: 1,
          exact_match: false
        })
      });

      if (!response.ok) {
        throw new Error(`EA FC API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.players && data.players.length > 0) {
        const player = data.players[0];
        return this.normalizePlayerData(player, 'ea_fc');
      }

      return null;
    } catch (error) {
      console.warn('EA FC API request failed:', error);
      return null;
    }
  }

  /**
   * Fallback to SoFIFA integration
   */
  async fetchFromSoFIFA(playerName) {
    try {
      // Use existing SoFIFA service if available
      if (window.FIFADataService) {
        const result = await window.FIFADataService.getPlayerData(playerName);
        if (result && result.overall) {
          return this.normalizePlayerData(result, 'sofifa');
        }
      }
      return null;
    } catch (error) {
      console.warn('SoFIFA fallback failed:', error);
      return null;
    }
  }

  /**
   * Get mock player data for development/testing
   */
  getMockPlayerData(playerName) {
    const mockPlayers = {
      'mbappe': {
        name: 'Kylian Mbappé',
        overall: 91,
        potential: 95,
        position: 'LW',
        age: 25,
        club: 'Paris Saint-Germain',
        nationality: 'France',
        stats: {
          pace: 97,
          shooting: 89,
          passing: 80,
          dribbling: 92,
          defending: 36,
          physical: 77
        }
      },
      'haaland': {
        name: 'Erling Haaland',
        overall: 88,
        potential: 94,
        position: 'ST',
        age: 23,
        club: 'Manchester City',
        nationality: 'Norway',
        stats: {
          pace: 89,
          shooting: 94,
          passing: 65,
          dribbling: 80,
          defending: 45,
          physical: 88
        }
      },
      'ronaldo': {
        name: 'Cristiano Ronaldo',
        overall: 90,
        potential: 90,
        position: 'ST',
        age: 39,
        club: 'Al Nassr',
        nationality: 'Portugal',
        stats: {
          pace: 81,
          shooting: 92,
          passing: 78,
          dribbling: 85,
          defending: 34,
          physical: 75
        }
      }
    };

    const normalizedName = playerName.toLowerCase().replace(/[^\w]/g, '');
    const matches = Object.keys(mockPlayers).filter(key => 
      key.includes(normalizedName) || normalizedName.includes(key)
    );

    if (matches.length > 0) {
      const playerData = mockPlayers[matches[0]];
      return this.normalizePlayerData(playerData, 'mock');
    }

    // Return generic mock data
    return this.normalizePlayerData({
      name: playerName,
      overall: Math.floor(Math.random() * 30) + 60, // 60-89
      potential: Math.floor(Math.random() * 40) + 60, // 60-99
      position: ['ST', 'LW', 'RW', 'CM', 'CB'][Math.floor(Math.random() * 5)],
      age: Math.floor(Math.random() * 15) + 18, // 18-32
      club: 'Unknown',
      nationality: 'Unknown'
    }, 'mock');
  }

  /**
   * Normalize player data from different sources
   */
  normalizePlayerData(rawData, source) {
    return {
      name: rawData.name || rawData.player_name || 'Unknown',
      overall: rawData.overall || rawData.rating || 75,
      potential: rawData.potential || rawData.overall || 75,
      position: rawData.position || rawData.preferred_positions?.[0] || 'ST',
      age: rawData.age || 25,
      club: rawData.club || rawData.team || 'Unknown',
      nationality: rawData.nationality || rawData.country || 'Unknown',
      value: rawData.value || rawData.market_value || 0,
      wage: rawData.wage || rawData.salary || 0,
      stats: rawData.stats || {
        pace: rawData.pace || 70,
        shooting: rawData.shooting || 70,
        passing: rawData.passing || 70,
        dribbling: rawData.dribbling || 70,
        defending: rawData.defending || 70,
        physical: rawData.physical || 70
      },
      source,
      lastUpdated: new Date().toISOString(),
      sofifaUrl: rawData.sofifaUrl || null
    };
  }

  /**
   * Rate-limited request queue
   */
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Rate limiting delay
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Batch get player data for multiple players
   */
  async batchGetPlayerData(playerNames, options = {}) {
    const results = {};
    
    for (const name of playerNames) {
      try {
        const result = await this.getPlayerData(name, options);
        results[name] = result;
      } catch (error) {
        results[name] = { data: null, error: error.message };
      }
    }

    return results;
  }

  /**
   * Search players by club
   */
  async getPlayersByClub(clubName) {
    try {
      // This would use EA FC API club search
      // For now, return mock data
      return {
        data: [
          { name: 'Mock Player 1', overall: 85, position: 'ST' },
          { name: 'Mock Player 2', overall: 83, position: 'CM' }
        ],
        source: 'mock'
      };
    } catch (error) {
      console.error('Error fetching club players:', error);
      return { data: [], error: error.message };
    }
  }

  /**
   * Cache management
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Test EA FC API connectivity
   */
  async testConnectivity() {
    try {
      if (!this.apiKey) {
        return { 
          connected: false, 
          message: 'EA FC API key not configured. Using fallback sources.',
          fallbackAvailable: true
        };
      }

      const response = await fetch(`${this.baseURL}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return {
        connected: response.ok,
        message: response.ok ? 'EA FC API connected' : 'EA FC API connection failed',
        fallbackAvailable: true
      };
    } catch (error) {
      return {
        connected: false,
        message: 'EA FC API unreachable. Using fallback sources.',
        fallbackAvailable: true,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const eaFCAPIService = new EAFCAPIService();

// Also make it available globally for legacy compatibility
if (typeof window !== 'undefined') {
  window.EAFCAPIService = eaFCAPIService;
}

export default EAFCAPIService;