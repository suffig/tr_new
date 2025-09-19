import { useEffect } from 'react';

/**
 * Touch Gesture Hook for React
 * Enables swipe navigation between tabs on mobile devices
 */
export function useTouchGestures(onTabChange, activeTab) {
  useEffect(() => {
    // Only enable on touch devices
    if (!('ontouchstart' in window)) return;

    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50;
    const maxVerticalDistance = 100;

    const tabs = ['matches', 'bans', 'finanzen', 'squad', 'stats', 'admin'];
    const currentIndex = tabs.indexOf(activeTab);

    const isInExcludedArea = (target) => {
      // Exclude forms, inputs, buttons, and modal areas
      const excludedElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
      const excludedClasses = ['modal', 'form', 'nav', 'dropdown'];
      
      if (excludedElements.includes(target.tagName)) return true;
      
      let element = target;
      while (element && element !== document.body) {
        if (excludedClasses.some(className => 
          element.className && element.className.includes && element.className.includes(className)
        )) {
          return true;
        }
        element = element.parentElement;
      }
      
      return false;
    };

    const handleTouchStart = (event) => {
      if (isInExcludedArea(event.target)) return;
      
      touchStartX = event.changedTouches[0].screenX;
      touchStartY = event.changedTouches[0].screenY;
    };

    const handleTouchEnd = (event) => {
      if (isInExcludedArea(event.target)) return;
      
      touchEndX = event.changedTouches[0].screenX;
      touchEndY = event.changedTouches[0].screenY;
      
      handleGesture();
    };

    const handleGesture = () => {
      const horizontalDistance = touchEndX - touchStartX;
      const verticalDistance = Math.abs(touchEndY - touchStartY);
      
      // Check if it's a valid horizontal swipe (not too vertical)
      if (Math.abs(horizontalDistance) < minSwipeDistance || verticalDistance > maxVerticalDistance) {
        return;
      }
      
      // Determine swipe direction and change tab
      if (horizontalDistance > 0) {
        // Swipe right - go to previous tab
        if (currentIndex > 0) {
          const newTab = tabs[currentIndex - 1];
          onTabChange(newTab);
          
          // Show visual feedback
          showSwipeIndicator('←', 'Vorheriger Tab');
        }
      } else {
        // Swipe left - go to next tab
        if (currentIndex < tabs.length - 1) {
          const newTab = tabs[currentIndex + 1];
          onTabChange(newTab);
          
          // Show visual feedback
          showSwipeIndicator('→', 'Nächster Tab');
        }
      }
    };

    const showSwipeIndicator = (direction, text) => {
      // Create temporary visual feedback
      const indicator = document.createElement('div');
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 16px;
          z-index: 9999;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <span style="font-size: 24px;">${direction}</span>
          <span>${text}</span>
        </div>
      `;
      
      document.body.appendChild(indicator);
      
      // Remove after animation
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 1000);
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Add visual hints for swipe availability
    const addSwipeHints = () => {
      const existing = document.querySelector('.swipe-hints');
      if (existing) return;

      const hints = document.createElement('div');
      hints.className = 'swipe-hints';
      hints.innerHTML = `
        <style>
          .swipe-hints {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 20px;
            z-index: 40;
            pointer-events: none;
            opacity: 0.3;
          }
          .swipe-hint {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 8px 12px;
            color: white;
            font-size: 12px;
            animation: swipe-pulse 2s ease-in-out infinite;
          }
          @keyframes swipe-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
          @media (min-width: 768px) {
            .swipe-hints { display: none; }
          }
        </style>
        ${currentIndex > 0 ? '<div class="swipe-hint">← Swipe</div>' : ''}
        ${currentIndex < tabs.length - 1 ? '<div class="swipe-hint">Swipe →</div>' : ''}
      `;
      
      document.body.appendChild(hints);
      
      // Remove hints after 5 seconds
      setTimeout(() => {
        if (hints.parentNode) {
          hints.parentNode.removeChild(hints);
        }
      }, 5000);
    };

    // Show hints on first load
    setTimeout(addSwipeHints, 1000);

    // Cleanup function
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Remove any remaining hints
      const hints = document.querySelector('.swipe-hints');
      if (hints && hints.parentNode) {
        hints.parentNode.removeChild(hints);
      }
    };
  }, [onTabChange, activeTab]);
}

export default useTouchGestures;