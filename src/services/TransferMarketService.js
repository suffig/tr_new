/**
 * Transfer Market Service
 * Handles EA Sports transfer market integration, price tracking, and notifications
 */

import { eaFCAPIService } from './EAFCAPIService.js';

class TransferMarketService {
  constructor() {
    this.priceCache = new Map();
    this.trendCache = new Map();
    this.watchlist = new Set();
    this.priceAlerts = [];
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes for market data
  }

  /**
   * Get current market price for a player
   * @param {string} playerIdOrName - Player identifier
   * @returns {Promise<Object>} Market price data
   */
  async getMarketPrice(playerIdOrName) {
    try {
      const cacheKey = `price_${playerIdOrName}`;
      const cached = this.getCachedPrice(cacheKey);
      
      if (cached) {
        return { data: cached, source: 'cache' };
      }

      const priceData = await eaFCAPIService.getTransferMarketPrice(playerIdOrName);
      this.setCachedPrice(cacheKey, priceData);

      return { data: priceData, source: 'api' };
    } catch (error) {
      console.error('Error fetching market price:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get price trend for a player
   * @param {string} playerIdOrName - Player identifier
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Price trend data
   */
  async getPriceTrend(playerIdOrName, days = 7) {
    try {
      const cacheKey = `trend_${playerIdOrName}_${days}d`;
      const cached = this.getCachedTrend(cacheKey);
      
      if (cached) {
        return { data: cached, source: 'cache' };
      }

      const trendData = await eaFCAPIService.getMarketPriceTrend(playerIdOrName, days);
      this.setCachedTrend(cacheKey, trendData);

      return { data: trendData, source: 'api' };
    } catch (error) {
      console.error('Error fetching price trend:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Analyze market for multiple players
   * @param {Array<string>} playerIds - Array of player identifiers
   * @returns {Promise<Object>} Market analysis results
   */
  async analyzeMarket(playerIds) {
    const results = {
      players: [],
      summary: {
        totalValue: 0,
        averageChange: 0,
        risingPlayers: 0,
        fallingPlayers: 0,
        stablePlayers: 0
      }
    };

    for (const playerId of playerIds) {
      try {
        const priceData = await this.getMarketPrice(playerId);
        const trendData = await this.getPriceTrend(playerId, 7);

        if (priceData.data && trendData.data) {
          const playerAnalysis = {
            playerId,
            currentPrice: priceData.data.currentPrice,
            trend: trendData.data.trend,
            percentageChange: parseFloat(trendData.data.percentageChange),
            recommendation: this.getRecommendation(trendData.data)
          };

          results.players.push(playerAnalysis);
          results.summary.totalValue += priceData.data.currentPrice;

          if (trendData.data.trend === 'rising') results.summary.risingPlayers++;
          else if (trendData.data.trend === 'falling') results.summary.fallingPlayers++;
          else results.summary.stablePlayers++;
        }
      } catch (error) {
        console.warn(`Failed to analyze player ${playerId}:`, error);
      }
    }

    if (results.players.length > 0) {
      const avgChange = results.players.reduce((sum, p) => sum + p.percentageChange, 0) / results.players.length;
      results.summary.averageChange = avgChange.toFixed(2);
    }

    return results;
  }

  /**
   * Add player to watchlist
   * @param {string} playerId - Player identifier
   * @param {Object} alertConfig - Alert configuration
   */
  addToWatchlist(playerId, alertConfig = {}) {
    this.watchlist.add(playerId);
    
    if (alertConfig.priceThreshold) {
      this.priceAlerts.push({
        playerId,
        threshold: alertConfig.priceThreshold,
        condition: alertConfig.condition || 'below', // 'below' or 'above'
        active: true,
        createdAt: new Date().toISOString()
      });
    }

    this.saveWatchlist();
  }

  /**
   * Remove player from watchlist
   * @param {string} playerId - Player identifier
   */
  removeFromWatchlist(playerId) {
    this.watchlist.delete(playerId);
    this.priceAlerts = this.priceAlerts.filter(alert => alert.playerId !== playerId);
    this.saveWatchlist();
  }

  /**
   * Check price alerts for watchlist
   * @returns {Promise<Array>} Triggered alerts
   */
  async checkPriceAlerts() {
    const triggeredAlerts = [];

    for (const alert of this.priceAlerts) {
      if (!alert.active) continue;

      try {
        const priceData = await this.getMarketPrice(alert.playerId);
        
        if (priceData.data) {
          const currentPrice = priceData.data.currentPrice;
          const threshold = alert.threshold;
          
          const triggered = alert.condition === 'below' 
            ? currentPrice <= threshold 
            : currentPrice >= threshold;

          if (triggered) {
            triggeredAlerts.push({
              playerId: alert.playerId,
              currentPrice,
              threshold,
              condition: alert.condition,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to check alert for ${alert.playerId}:`, error);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Get market insights for a player
   * @param {string} playerId - Player identifier
   * @returns {Promise<Object>} Market insights
   */
  async getMarketInsights(playerId) {
    try {
      const [priceResult, trendResult] = await Promise.all([
        this.getMarketPrice(playerId),
        this.getPriceTrend(playerId, 30) // 30 days for better insights
      ]);

      if (!priceResult.data || !trendResult.data) {
        return { data: null, error: 'Failed to fetch market data' };
      }

      const insights = {
        playerId,
        currentMarket: priceResult.data,
        trend: trendResult.data,
        recommendation: this.getRecommendation(trendResult.data),
        volatility: this.calculateVolatility(trendResult.data.priceHistory),
        bestBuyTime: this.findBestBuyTime(trendResult.data.priceHistory),
        projectedPrice: this.projectFuturePrice(trendResult.data)
      };

      return { data: insights, source: 'analysis' };
    } catch (error) {
      console.error('Error generating market insights:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get recommendation based on trend data
   */
  getRecommendation(trendData) {
    const change = parseFloat(trendData.percentageChange);
    
    if (change > 10) return { action: 'sell', reason: 'Price is rising significantly', confidence: 'high' };
    if (change > 5) return { action: 'hold', reason: 'Price trending upward', confidence: 'medium' };
    if (change < -10) return { action: 'buy', reason: 'Price has dropped significantly', confidence: 'high' };
    if (change < -5) return { action: 'buy', reason: 'Good buying opportunity', confidence: 'medium' };
    
    return { action: 'hold', reason: 'Price is stable', confidence: 'low' };
  }

  /**
   * Calculate price volatility
   */
  calculateVolatility(priceHistory) {
    if (!priceHistory || priceHistory.length < 2) return 0;

    const prices = priceHistory.map(h => h.price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    return ((stdDev / mean) * 100).toFixed(2); // Coefficient of variation as percentage
  }

  /**
   * Find best buy time from price history
   */
  findBestBuyTime(priceHistory) {
    if (!priceHistory || priceHistory.length === 0) return null;

    const lowestPrice = priceHistory.reduce((min, h) => 
      h.price < min.price ? h : min
    , priceHistory[0]);

    return {
      date: lowestPrice.date,
      price: lowestPrice.price,
      daysAgo: Math.floor((new Date() - new Date(lowestPrice.date)) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Project future price based on trend
   */
  projectFuturePrice(trendData) {
    const currentPrice = trendData.priceHistory[trendData.priceHistory.length - 1]?.price || 0;
    const change = parseFloat(trendData.percentageChange);
    
    // Simple linear projection for next 7 days
    const dailyChange = change / trendData.priceHistory.length;
    const projectedChange = dailyChange * 7;
    const projectedPrice = Math.floor(currentPrice * (1 + projectedChange / 100));

    return {
      price: projectedPrice,
      days: 7,
      confidence: Math.abs(change) > 5 ? 'low' : 'medium',
      method: 'linear_projection'
    };
  }

  /**
   * Cache management for prices
   */
  getCachedPrice(key) {
    const cached = this.priceCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCachedPrice(key, data) {
    this.priceCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Cache management for trends
   */
  getCachedTrend(key) {
    const cached = this.trendCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCachedTrend(key, data) {
    this.trendCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.priceCache.clear();
    this.trendCache.clear();
  }

  /**
   * Save watchlist to localStorage
   */
  saveWatchlist() {
    try {
      localStorage.setItem('fifa_transfer_watchlist', JSON.stringify({
        watchlist: Array.from(this.watchlist),
        alerts: this.priceAlerts
      }));
    } catch (error) {
      console.warn('Failed to save watchlist:', error);
    }
  }

  /**
   * Load watchlist from localStorage
   */
  loadWatchlist() {
    try {
      const saved = localStorage.getItem('fifa_transfer_watchlist');
      if (saved) {
        const data = JSON.parse(saved);
        this.watchlist = new Set(data.watchlist || []);
        this.priceAlerts = data.alerts || [];
      }
    } catch (error) {
      console.warn('Failed to load watchlist:', error);
    }
  }

  /**
   * Get watchlist summary
   */
  getWatchlistSummary() {
    return {
      totalPlayers: this.watchlist.size,
      activeAlerts: this.priceAlerts.filter(a => a.active).length,
      players: Array.from(this.watchlist)
    };
  }
}

// Export singleton instance
export const transferMarketService = new TransferMarketService();

// Make it available globally for legacy compatibility
if (typeof window !== 'undefined') {
  window.TransferMarketService = transferMarketService;
}

export default TransferMarketService;
