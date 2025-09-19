import { useState, useEffect, useRef, useCallback } from 'react';
import { useHapticFeedback } from './IOSComponents';

export default function PullToRefresh({ onRefresh, children, enabled = true, threshold = 80 }) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const { triggerHaptic } = useHapticFeedback();
  
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(false);

  // Check if we're at the top of the scrollable area
  const checkScrollPosition = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      isAtTop.current = scrollTop <= 5; // Small threshold for iOS scrolling
      setCanPull(isAtTop.current && enabled);
    }
  }, [enabled]);

  useEffect(() => {
    checkScrollPosition();
  }, [checkScrollPosition]);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (!canPull || isRefreshing) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(false);
    setPullDistance(0);
  }, [canPull, isRefreshing]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!canPull || isRefreshing || !startY.current) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // Only allow pulling down when at top
    if (deltaY > 0 && isAtTop.current) {
      e.preventDefault(); // Prevent default scrolling
      
      // Apply resistance curve (iOS-like)
      const resistance = Math.min(deltaY * 0.5, threshold * 1.5);
      setPullDistance(resistance);
      
      if (!isPulling && resistance > 10) {
        setIsPulling(true);
        triggerHaptic('light');
      }
      
      // Trigger haptic feedback when reaching threshold
      if (resistance >= threshold && pullDistance < threshold) {
        triggerHaptic('medium');
      }
    }
  }, [canPull, isRefreshing, threshold, isPulling, pullDistance, triggerHaptic]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!canPull || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      triggerHaptic('success');
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        triggerHaptic('error');
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setIsPulling(false);
          setPullDistance(0);
        }, 500); // Brief delay for smooth animation
      }
    } else {
      // Animate back to original position
      setIsPulling(false);
      setPullDistance(0);
    }

    startY.current = 0;
    currentY.current = 0;
  }, [canPull, isRefreshing, pullDistance, threshold, onRefresh, triggerHaptic]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    checkScrollPosition();
  }, [checkScrollPosition]);

  // Mouse events for desktop testing
  const handleMouseDown = useCallback((e) => {
    if (!canPull || isRefreshing) return;
    startY.current = e.clientY;
  }, [canPull, isRefreshing]);

  const handleMouseMove = useCallback((e) => {
    if (!canPull || isRefreshing || !startY.current) return;

    const deltaY = e.clientY - startY.current;
    if (deltaY > 0 && isAtTop.current) {
      const resistance = Math.min(deltaY * 0.5, threshold * 1.5);
      setPullDistance(resistance);
      setIsPulling(resistance > 10);
    }
  }, [canPull, isRefreshing, threshold]);

  const handleMouseUp = useCallback(async () => {
    if (!canPull || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setIsPulling(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }

    startY.current = 0;
  }, [canPull, isRefreshing, pullDistance, threshold, onRefresh]);

  // Animation values
  const transformStyle = {
    transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
    transition: isPulling ? 'none' : 'transform 0.3s ease-out'
  };

  const refreshIndicatorOpacity = Math.min(pullDistance / threshold, 1);
  const refreshIndicatorScale = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ touchAction: canPull ? 'pan-y' : 'auto' }}
    >
      {/* Pull to refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
        style={{
          height: `${Math.min(pullDistance, threshold)}px`,
          opacity: refreshIndicatorOpacity,
          transform: `scale(${refreshIndicatorScale})`
        }}
      >
        <div className="flex flex-col items-center space-y-2 text-gray-600">
          {isRefreshing ? (
            <>
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Aktualisiere...</span>
            </>
          ) : pullDistance >= threshold ? (
            <>
              <div className="w-6 h-6 text-green-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium">Loslassen zum Aktualisieren</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 text-gray-400">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5a1 1 0 012 0v3.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 8.586V5z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium">Zum Aktualisieren ziehen</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={transformStyle}>
        {children}
      </div>
    </div>
  );
}

// Enhanced refresh hook for managing multiple refresh sources
export function useRefreshManager() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const refreshCallbacks = useRef([]);

  const addRefreshCallback = useCallback((callback) => {
    refreshCallbacks.current.push(callback);
    return () => {
      refreshCallbacks.current = refreshCallbacks.current.filter(cb => cb !== callback);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await Promise.all(refreshCallbacks.current.map(callback => callback()));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Refresh failed:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  return {
    isRefreshing,
    lastRefresh,
    refresh,
    addRefreshCallback
  };
}

// Smart refresh component that debounces rapid refresh attempts
export function SmartPullToRefresh({ onRefresh, children, cooldownMs = 2000, ...props }) {
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const { triggerHaptic } = useHapticFeedback();

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime < cooldownMs) {
      triggerHaptic('error');
      return;
    }

    setLastRefreshTime(now);
    await onRefresh();
  }, [onRefresh, lastRefreshTime, cooldownMs, triggerHaptic]);

  return (
    <PullToRefresh onRefresh={handleRefresh} {...props}>
      {children}
    </PullToRefresh>
  );
}