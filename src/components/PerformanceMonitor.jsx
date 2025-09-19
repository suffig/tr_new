import { useState, useEffect } from 'react';

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHits: 0,
    networkStatus: 'online'
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isEnabled = localStorage.getItem('fifa-tracker-performance-monitor') === 'true';
    
    setIsVisible(isDev || isEnabled);

    if (!isDev && !isEnabled) return;

    // Measure initial load time
    const loadTime = performance.now();
    setMetrics(prev => ({ ...prev, loadTime }));

    // Monitor memory usage (if available)
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = performance.memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024) // MB
        }));
      }
    };

    // Monitor network status
    const updateNetworkStatus = () => {
      setMetrics(prev => ({
        ...prev,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      }));
    };

    // Monitor cache performance
    const trackCacheHits = () => {
      // This would typically integrate with your caching system
      const cacheHits = sessionStorage.getItem('fifa-tracker-cache-hits') || '0';
      setMetrics(prev => ({
        ...prev,
        cacheHits: parseInt(cacheHits)
      }));
    };

    // Set up intervals
    const memoryInterval = setInterval(updateMemoryUsage, 5000);
    const cacheInterval = setInterval(trackCacheHits, 2000);

    // Set up event listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Performance observer for render time
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const renderTime = entries.reduce((acc, entry) => acc + entry.duration, 0);
        setMetrics(prev => ({ ...prev, renderTime: Math.round(renderTime) }));
      });
      
      try {
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (e) {
        console.log('Performance observer not fully supported');
      }
    }

    // Initial updates
    updateMemoryUsage();
    updateNetworkStatus();
    trackCacheHits();

    return () => {
      clearInterval(memoryInterval);
      clearInterval(cacheInterval);
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const getStatusColor = (metric, value) => {
    switch (metric) {
      case 'memory':
        if (value > 100) return 'text-red-600';
        if (value > 50) return 'text-yellow-600';
        return 'text-green-600';
      case 'loadTime':
        if (value > 3000) return 'text-red-600';
        if (value > 1500) return 'text-yellow-600';
        return 'text-green-600';
      case 'renderTime':
        if (value > 100) return 'text-red-600';
        if (value > 50) return 'text-yellow-600';
        return 'text-green-600';
      case 'network':
        return value === 'online' ? 'text-green-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  const exportMetrics = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics,
      userAgent: navigator.userAgent,
      url: window.location.href,
      performance: {
        memory: 'memory' in performance ? performance.memory : null,
        timing: performance.timing
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fifa-tracker-performance-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 bg-gray-900 text-white p-3 rounded-lg shadow-lg text-xs max-w-xs z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">🔧 Performance</span>
        <div className="flex gap-1">
          <button
            onClick={exportMetrics}
            className="text-blue-400 hover:text-blue-300"
            title="Export Metrics"
          >
            📊
          </button>
          <button
            onClick={clearCache}
            className="text-yellow-400 hover:text-yellow-300"
            title="Clear Cache"
          >
            🧹
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-300"
            title="Hide Monitor"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Load:</span>
          <span className={getStatusColor('loadTime', metrics.loadTime)}>
            {metrics.loadTime.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Render:</span>
          <span className={getStatusColor('renderTime', metrics.renderTime)}>
            {metrics.renderTime}ms
          </span>
        </div>
        
        {metrics.memoryUsage > 0 && (
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={getStatusColor('memory', metrics.memoryUsage)}>
              {metrics.memoryUsage}MB
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>Cache:</span>
          <span className="text-blue-400">{metrics.cacheHits} hits</span>
        </div>
        
        <div className="flex justify-between">
          <span>Network:</span>
          <span className={getStatusColor('network', metrics.networkStatus)}>
            {metrics.networkStatus}
          </span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
        <div className="text-center">
          FUSTA v2.0
        </div>
      </div>
    </div>
  );
}