/**
 * Background Job Service
 * Handles scheduled tasks for automatic player updates, market monitoring, and data synchronization
 */

import { eaFCAPIService } from './EAFCAPIService.js';
import { transferMarketService } from './TransferMarketService.js';

class BackgroundJobService {
  constructor() {
    this.jobs = new Map();
    this.jobHistory = [];
    this.maxHistorySize = 100;
    this.isRunning = false;
    this.syncIntervals = {
      player_updates: 24 * 60 * 60 * 1000, // Daily
      market_prices: 60 * 60 * 1000, // Hourly
      price_alerts: 15 * 60 * 1000, // Every 15 minutes
      data_cleanup: 7 * 24 * 60 * 60 * 1000 // Weekly
    };
  }

  /**
   * Initialize background jobs
   */
  async initialize() {
    console.log('🔄 Initializing Background Job Service...');
    
    this.registerJob('player_updates', this.syncPlayerUpdates.bind(this), this.syncIntervals.player_updates);
    this.registerJob('market_prices', this.syncMarketPrices.bind(this), this.syncIntervals.market_prices);
    this.registerJob('price_alerts', this.checkPriceAlerts.bind(this), this.syncIntervals.price_alerts);
    this.registerJob('data_cleanup', this.cleanupOldData.bind(this), this.syncIntervals.data_cleanup);

    this.loadJobState();
    this.isRunning = true;
    
    console.log(`✅ Background Job Service initialized with ${this.jobs.size} jobs`);
  }

  /**
   * Register a new job
   * @param {string} jobName - Unique job identifier
   * @param {Function} jobFunction - Function to execute
   * @param {number} interval - Interval in milliseconds
   * @param {boolean} runImmediately - Run job immediately on registration
   */
  registerJob(jobName, jobFunction, interval, runImmediately = false) {
    if (this.jobs.has(jobName)) {
      console.warn(`Job ${jobName} already registered, updating...`);
      this.unregisterJob(jobName);
    }

    const job = {
      name: jobName,
      function: jobFunction,
      interval: interval,
      lastRun: null,
      nextRun: null,
      status: 'scheduled',
      enabled: true,
      retryCount: 0,
      maxRetries: 3
    };

    this.jobs.set(jobName, job);
    this.scheduleJob(jobName);

    if (runImmediately) {
      this.runJob(jobName);
    }

    console.log(`📋 Registered job: ${jobName} (interval: ${this.formatInterval(interval)})`);
  }

  /**
   * Unregister a job
   * @param {string} jobName - Job identifier
   */
  unregisterJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job && job.timerId) {
      clearTimeout(job.timerId);
    }
    this.jobs.delete(jobName);
  }

  /**
   * Schedule a job for next execution
   * @param {string} jobName - Job identifier
   */
  scheduleJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job || !job.enabled) return;

    const now = Date.now();
    const nextRun = job.lastRun ? job.lastRun + job.interval : now + 1000; // Start in 1 second if first run
    job.nextRun = nextRun;

    if (job.timerId) {
      clearTimeout(job.timerId);
    }

    job.timerId = setTimeout(() => {
      this.runJob(jobName);
    }, Math.max(0, nextRun - now));
  }

  /**
   * Run a job immediately
   * @param {string} jobName - Job identifier
   */
  async runJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job || !job.enabled) {
      console.warn(`Job ${jobName} not found or disabled`);
      return;
    }

    job.status = 'running';
    const startTime = Date.now();

    try {
      console.log(`🔄 Running job: ${jobName}`);
      await job.function();
      
      const duration = Date.now() - startTime;
      job.status = 'completed';
      job.lastRun = Date.now();
      job.retryCount = 0;

      this.addToHistory({
        jobName,
        status: 'success',
        duration,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Job completed: ${jobName} (${duration}ms)`);
    } catch (error) {
      console.error(`❌ Job failed: ${jobName}`, error);
      
      job.status = 'failed';
      job.retryCount++;

      this.addToHistory({
        jobName,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        console.log(`🔄 Retrying job ${jobName} (attempt ${job.retryCount + 1}/${job.maxRetries})`);
        setTimeout(() => this.runJob(jobName), 5000 * job.retryCount); // Exponential backoff
      }
    } finally {
      this.scheduleJob(jobName);
      this.saveJobState();
    }
  }

  /**
   * Sync player updates from EA Sports API
   */
  async syncPlayerUpdates() {
    console.log('🔄 Starting player updates sync...');
    
    try {
      // Get all players from database (would integrate with dataManager)
      const players = this.getMockPlayers(); // Placeholder
      
      const results = await eaFCAPIService.batchUpdatePlayers(players);
      
      console.log(`✅ Player sync completed: ${results.updated.length} updated, ${results.failed.length} failed`);
      
      return {
        updated: results.updated.length,
        failed: results.failed.length,
        unchanged: results.unchanged.length
      };
    } catch (error) {
      console.error('Player sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync market prices for watchlist players
   */
  async syncMarketPrices() {
    console.log('🔄 Starting market price sync...');
    
    try {
      const watchlist = transferMarketService.getWatchlistSummary();
      
      if (watchlist.totalPlayers === 0) {
        console.log('ℹ️ No players in watchlist, skipping market sync');
        return { updated: 0 };
      }

      let updated = 0;
      for (const playerId of watchlist.players) {
        try {
          await transferMarketService.getMarketPrice(playerId);
          updated++;
        } catch (error) {
          console.warn(`Failed to update price for ${playerId}:`, error);
        }
      }

      console.log(`✅ Market sync completed: ${updated} prices updated`);
      return { updated };
    } catch (error) {
      console.error('Market sync failed:', error);
      throw error;
    }
  }

  /**
   * Check price alerts and notify
   */
  async checkPriceAlerts() {
    console.log('🔄 Checking price alerts...');
    
    try {
      const alerts = await transferMarketService.checkPriceAlerts();
      
      if (alerts.length > 0) {
        console.log(`🔔 ${alerts.length} price alert(s) triggered`);
        this.sendNotifications(alerts);
      }

      return { alerts: alerts.length };
    } catch (error) {
      console.error('Price alert check failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old data from cache and history
   */
  async cleanupOldData() {
    console.log('🔄 Starting data cleanup...');
    
    try {
      // Clear old caches
      eaFCAPIService.clearCache();
      transferMarketService.clearCache();
      
      // Trim job history
      if (this.jobHistory.length > this.maxHistorySize) {
        this.jobHistory = this.jobHistory.slice(-this.maxHistorySize);
      }

      console.log('✅ Data cleanup completed');
      return { cleaned: true };
    } catch (error) {
      console.error('Data cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Send notifications for triggered alerts
   */
  sendNotifications(alerts) {
    for (const alert of alerts) {
      this.showNotification({
        title: '💰 Price Alert',
        message: `Player ${alert.playerId} is now ${alert.condition} ${alert.threshold}€ (Current: ${alert.currentPrice}€)`,
        type: 'info'
      });
    }
  }

  /**
   * Show notification to user
   */
  showNotification({ title, message, type = 'info' }) {
    // Check if browser supports notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/assets/icon-180.png'
      });
    } else {
      // Fallback to console
      console.log(`🔔 ${title}: ${message}`);
    }

    // Also dispatch custom event for UI notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backgroundJobNotification', {
        detail: { title, message, type }
      }));
    }
  }

  /**
   * Add job execution to history
   */
  addToHistory(entry) {
    this.jobHistory.push(entry);
    if (this.jobHistory.length > this.maxHistorySize) {
      this.jobHistory.shift();
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) return null;

    return {
      name: job.name,
      status: job.status,
      enabled: job.enabled,
      lastRun: job.lastRun ? new Date(job.lastRun).toISOString() : null,
      nextRun: job.nextRun ? new Date(job.nextRun).toISOString() : null,
      interval: this.formatInterval(job.interval),
      retryCount: job.retryCount
    };
  }

  /**
   * Get all jobs status
   */
  getAllJobsStatus() {
    const statuses = [];
    for (const jobName of this.jobs.keys()) {
      statuses.push(this.getJobStatus(jobName));
    }
    return statuses;
  }

  /**
   * Get job history
   */
  getJobHistory(jobName = null, limit = 20) {
    let history = [...this.jobHistory];
    
    if (jobName) {
      history = history.filter(h => h.jobName === jobName);
    }
    
    return history.slice(-limit).reverse();
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobName, enabled) {
    const job = this.jobs.get(jobName);
    if (!job) {
      console.warn(`Job ${jobName} not found`);
      return false;
    }

    job.enabled = enabled;
    
    if (enabled) {
      this.scheduleJob(jobName);
      console.log(`✅ Job ${jobName} enabled`);
    } else {
      if (job.timerId) {
        clearTimeout(job.timerId);
      }
      console.log(`⏸️ Job ${jobName} disabled`);
    }

    this.saveJobState();
    return true;
  }

  /**
   * Update job interval
   */
  updateJobInterval(jobName, newInterval) {
    const job = this.jobs.get(jobName);
    if (!job) {
      console.warn(`Job ${jobName} not found`);
      return false;
    }

    job.interval = newInterval;
    this.scheduleJob(jobName);
    this.saveJobState();
    
    console.log(`✅ Job ${jobName} interval updated to ${this.formatInterval(newInterval)}`);
    return true;
  }

  /**
   * Format interval for display
   */
  formatInterval(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day(s)`;
    if (hours > 0) return `${hours} hour(s)`;
    if (minutes > 0) return `${minutes} minute(s)`;
    return `${seconds} second(s)`;
  }

  /**
   * Save job state to localStorage
   */
  saveJobState() {
    try {
      const state = {
        jobs: Array.from(this.jobs.entries()).map(([name, job]) => ({
          name,
          enabled: job.enabled,
          lastRun: job.lastRun,
          interval: job.interval
        })),
        lastSaved: new Date().toISOString()
      };

      localStorage.setItem('fifa_background_jobs_state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save job state:', error);
    }
  }

  /**
   * Load job state from localStorage
   */
  loadJobState() {
    try {
      const saved = localStorage.getItem('fifa_background_jobs_state');
      if (!saved) return;

      const state = JSON.parse(saved);
      
      for (const savedJob of state.jobs) {
        const job = this.jobs.get(savedJob.name);
        if (job) {
          job.enabled = savedJob.enabled;
          job.lastRun = savedJob.lastRun;
          if (savedJob.interval) {
            job.interval = savedJob.interval;
          }
        }
      }

      console.log(`📋 Loaded job state from ${state.lastSaved}`);
    } catch (error) {
      console.warn('Failed to load job state:', error);
    }
  }

  /**
   * Stop all background jobs
   */
  stop() {
    console.log('⏹️ Stopping all background jobs...');
    
    for (const [jobName, job] of this.jobs.entries()) {
      if (job.timerId) {
        clearTimeout(job.timerId);
      }
    }

    this.isRunning = false;
    console.log('✅ All background jobs stopped');
  }

  /**
   * Mock players data (placeholder for database integration)
   */
  getMockPlayers() {
    return [
      { id: 1, name: 'Max Müller' },
      { id: 2, name: 'Tom Schmidt' },
      { id: 3, name: 'Leon Wagner' }
    ];
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log(`Notification permission: ${permission}`);
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }
}

// Export singleton instance
export const backgroundJobService = new BackgroundJobService();

// Make it available globally for legacy compatibility
if (typeof window !== 'undefined') {
  window.BackgroundJobService = backgroundJobService;
}

export default BackgroundJobService;
