// Enhanced Error Reporting and Monitoring System for TR1 FIFA Tracker

export class ErrorReporter {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Keep last 100 errors
    this.isEnabled = true;
    
    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(event.error, {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason, {
        type: 'unhandled_rejection',
        promise: event.promise
      });
    });

    // Handle React errors (if using error boundaries)
    this.setupReactErrorHandler();
  }

  setupReactErrorHandler() {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Check if this is a React error
      if (args[0] && typeof args[0] === 'string' && args[0].includes('React')) {
        this.logError(new Error(args[0]), {
          type: 'react_error',
          args: args
        });
      }
      originalConsoleError.apply(console, args);
    };
  }

  logError(error, context = {}) {
    if (!this.isEnabled) return;

    const errorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      error: this.serializeError(error),
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        sessionInfo: this.getSessionInfo()
      },
      severity: this.determineSeverity(error, context),
      category: this.categorizeError(error, context)
    };

    this.errors.unshift(errorReport);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Store in localStorage for persistence
    this.persistErrors();

    // Report critical errors immediately
    if (errorReport.severity === 'critical') {
      this.reportCriticalError(errorReport);
    }

    console.error('Error logged:', errorReport);
  }

  serializeError(error) {
    if (!error) return null;
    
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      toString: error.toString()
    };
  }

  getSessionInfo() {
    try {
      return {
        timestamp: Date.now(),
        sessionStorage: this.getSafeStorageInfo('sessionStorage'),
        localStorage: this.getSafeStorageInfo('localStorage'),
        demoMode: window.usingFallback || false,
        authState: window.supabaseDebug ? 'authenticated' : 'unknown'
      };
    } catch (e) {
      return { error: 'Failed to get session info' };
    }
  }

  getSafeStorageInfo(storageType) {
    try {
      const storage = window[storageType];
      const keys = Object.keys(storage);
      return {
        length: storage.length,
        keys: keys.filter(key => !key.includes('auth')), // Don't log auth tokens
        hasAuthData: keys.some(key => key.includes('auth'))
      };
    } catch (e) {
      return { error: 'Storage access denied' };
    }
  }

  determineSeverity(error, context) {
    // Critical: App-breaking errors
    if (context.type === 'uncaught_error' || 
        context.type === 'unhandled_rejection' ||
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Network Error')) {
      return 'critical';
    }

    // High: Feature-breaking errors
    if (error?.message?.includes('Supabase') ||
        error?.message?.includes('Database') ||
        context.type === 'react_error') {
      return 'high';
    }

    // Medium: Recoverable errors
    if (error?.message?.includes('validation') ||
        error?.message?.includes('form') ||
        error?.message?.includes('input')) {
      return 'medium';
    }

    // Low: Minor issues
    return 'low';
  }

  categorizeError(error, context) {
    if (context.type === 'react_error') return 'ui';
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) return 'network';
    if (error?.message?.includes('Supabase') || error?.message?.includes('database')) return 'database';
    if (error?.message?.includes('validation')) return 'validation';
    if (error?.message?.includes('auth')) return 'authentication';
    if (error?.message?.includes('parse') || error?.message?.includes('JSON')) return 'data';
    return 'general';
  }

  generateErrorId() {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  persistErrors() {
    try {
      const errorsToStore = this.errors.slice(0, 50); // Store only last 50 errors
      localStorage.setItem('tr1_error_log', JSON.stringify({
        version: '1.0',
        timestamp: Date.now(),
        errors: errorsToStore
      }));
    } catch (e) {
      console.warn('Failed to persist errors to localStorage:', e);
    }
  }

  loadPersistedErrors() {
    try {
      const stored = localStorage.getItem('tr1_error_log');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.errors && Array.isArray(data.errors)) {
          this.errors = [...data.errors, ...this.errors];
        }
      }
    } catch (e) {
      console.warn('Failed to load persisted errors:', e);
    }
  }

  reportCriticalError(errorReport) {
    // In a real app, this would send to an error monitoring service
    console.error('CRITICAL ERROR DETECTED:', errorReport);
    
    // Show user notification for critical errors
    if (window.showUserNotification) {
      window.showUserNotification(
        'Ein kritischer Fehler ist aufgetreten. Die Anwendung wird möglicherweise neu geladen.',
        'error'
      );
    }
  }

  // Public API methods
  getErrors(filters = {}) {
    let filteredErrors = [...this.errors];

    if (filters.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
    }

    if (filters.category) {
      filteredErrors = filteredErrors.filter(e => e.category === filters.category);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filteredErrors = filteredErrors.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    if (filters.limit) {
      filteredErrors = filteredErrors.slice(0, filters.limit);
    }

    return filteredErrors;
  }

  getErrorSummary() {
    const summary = {
      total: this.errors.length,
      bySeverity: {},
      byCategory: {},
      recentErrors: this.errors.slice(0, 10),
      oldestError: this.errors[this.errors.length - 1]?.timestamp,
      newestError: this.errors[0]?.timestamp
    };

    // Count by severity
    this.errors.forEach(error => {
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
    });

    return summary;
  }

  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('tr1_error_log');
    } catch (e) {
      console.warn('Failed to clear persisted errors:', e);
    }
  }

  exportErrors() {
    const exportData = {
      exported: new Date().toISOString(),
      version: '1.0',
      summary: this.getErrorSummary(),
      errors: this.errors
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tr1_error_log_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Performance monitoring
  measurePerformance(operationName, operation) {
    const startTime = performance.now();
    
    try {
      const result = operation();
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result
          .then(res => {
            this.logPerformance(operationName, startTime, true);
            return res;
          })
          .catch(err => {
            this.logPerformance(operationName, startTime, false, err);
            throw err;
          });
      }
      
      this.logPerformance(operationName, startTime, true);
      return result;
    } catch (error) {
      this.logPerformance(operationName, startTime, false, error);
      throw error;
    }
  }

  logPerformance(operationName, startTime, success, error = null) {
    const duration = performance.now() - startTime;
    
    // Log slow operations as warnings
    if (duration > 5000) { // 5 seconds
      this.logError(new Error(`Slow operation: ${operationName} took ${duration.toFixed(2)}ms`), {
        type: 'performance',
        operationName,
        duration,
        success
      });
    }

    // Log failed operations
    if (!success && error) {
      this.logError(error, {
        type: 'operation_failure',
        operationName,
        duration
      });
    }
  }

  // Health check
  performHealthCheck() {
    const checks = {
      localStorage: this.checkLocalStorage(),
      supabase: this.checkSupabaseConnection(),
      memory: this.checkMemoryUsage(),
      performance: this.checkPerformance()
    };

    const overallHealth = Object.values(checks).every(check => check.status === 'ok') ? 'healthy' : 'degraded';

    return {
      overall: overallHealth,
      timestamp: new Date().toISOString(),
      checks
    };
  }

  checkLocalStorage() {
    try {
      const testKey = 'tr1_health_check';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { status: 'ok', message: 'LocalStorage working' };
    } catch (e) {
      return { status: 'error', message: 'LocalStorage not available', error: e.message };
    }
  }

  checkSupabaseConnection() {
    try {
      if (window.supabaseDebug) {
        const stats = window.supabaseDebug.getStats();
        return { 
          status: stats.errors > 10 ? 'warning' : 'ok', 
          message: `${stats.requests} requests, ${stats.errors} errors` 
        };
      }
      return { status: 'unknown', message: 'Supabase debug not available' };
    } catch (e) {
      return { status: 'error', message: 'Failed to check Supabase', error: e.message };
    }
  }

  checkMemoryUsage() {
    try {
      if (performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const usage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
        
        return {
          status: usage > 80 ? 'warning' : 'ok',
          message: `Memory usage: ${usage.toFixed(1)}%`,
          details: { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit }
        };
      }
      return { status: 'unknown', message: 'Memory API not available' };
    } catch (e) {
      return { status: 'error', message: 'Failed to check memory', error: e.message };
    }
  }

  checkPerformance() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        return {
          status: loadTime > 3000 ? 'warning' : 'ok',
          message: `Page load: ${loadTime.toFixed(0)}ms`,
          details: { loadTime, domContentLoaded: navigation.domContentLoadedEventEnd - navigation.loadEventStart }
        };
      }
      return { status: 'unknown', message: 'Navigation timing not available' };
    } catch (e) {
      return { status: 'error', message: 'Failed to check performance', error: e.message };
    }
  }

  // Enable/disable error reporting
  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }
}

// Create global instance
export const errorReporter = new ErrorReporter();

// Load persisted errors on startup
errorReporter.loadPersistedErrors();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.errorReporter = errorReporter;
}

// Export helper functions
export const logError = (error, context) => errorReporter.logError(error, context);
export const measurePerformance = (name, operation) => errorReporter.measurePerformance(name, operation);
export const getErrorSummary = () => errorReporter.getErrorSummary();
export const performHealthCheck = () => errorReporter.performHealthCheck();