/**
 * Touch Gesture Handler for FIFA Tracker
 * Adds swipe gestures for better mobile navigation
 */

export class TouchGestureHandler {
    constructor() {
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.maxVerticalDistance = 100;
        this.isGestureEnabled = true;
        
        this.init();
    }
    
    init() {
        // Only enable on touch devices
        if (!('ontouchstart' in window)) return;
        
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Add visual feedback for swipe areas
        this.addSwipeIndicators();
    }
    
    handleTouchStart(event) {
        if (!this.isGestureEnabled || this.isInExcludedArea(event.target)) return;
        
        this.touchStartX = event.changedTouches[0].screenX;
        this.touchStartY = event.changedTouches[0].screenY;
    }
    
    handleTouchEnd(event) {
        if (!this.isGestureEnabled || this.isInExcludedArea(event.target)) return;
        
        this.touchEndX = event.changedTouches[0].screenX;
        this.touchEndY = event.changedTouches[0].screenY;
        
        this.handleGesture();
    }
    
    handleGesture() {
        const horizontalDistance = this.touchEndX - this.touchStartX;
        const verticalDistance = Math.abs(this.touchEndY - this.touchStartY);
        
        // Check if it's a valid horizontal swipe (not too vertical)
        if (verticalDistance > this.maxVerticalDistance) return;
        
        // Check minimum swipe distance
        if (Math.abs(horizontalDistance) < this.minSwipeDistance) return;
        
        // Determine swipe direction
        if (horizontalDistance > 0) {
            this.handleSwipeRight();
        } else {
            this.handleSwipeLeft();
        }
    }
    
    handleSwipeLeft() {
        // Swipe left = next tab
        this.navigateTab('next');
        this.showSwipeFeedback('left');
    }
    
    handleSwipeRight() {
        // Swipe right = previous tab
        this.navigateTab('previous');
        this.showSwipeFeedback('right');
    }
    
    navigateTab(direction) {
        const tabs = ['matches', 'squad', 'bans', 'finanzen', 'stats', 'spieler'];
        const currentTabElement = document.querySelector('.nav-item.active');
        if (!currentTabElement) return;
        
        // Find current tab index
        let currentIndex = -1;
        tabs.forEach((tab, index) => {
            if (currentTabElement.getAttribute('href')?.includes(tab) || 
                currentTabElement.id?.includes(tab)) {
                currentIndex = index;
            }
        });
        
        if (currentIndex === -1) return;
        
        // Calculate new index
        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % tabs.length;
        } else {
            newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }
        
        // Navigate to new tab
        const newTab = tabs[newIndex];
        if (window.switchTab) {
            window.switchTab(newTab);
        }
    }
    
    isInExcludedArea(target) {
        // Exclude specific areas where swipe should not work
        const excludedSelectors = [
            'input', 'textarea', 'select', 'button',
            '.modal', '.modal-content', '.dropdown',
            '.swiper', '.slider', '.map',
            '[data-no-swipe]'
        ];
        
        return excludedSelectors.some(selector => 
            target.matches?.(selector) || target.closest?.(selector)
        );
    }
    
    showSwipeFeedback(direction) {
        // Create visual feedback for swipe
        const feedback = document.createElement('div');
        feedback.className = `swipe-feedback fixed top-1/2 ${direction === 'left' ? 'right-4' : 'left-4'} transform -translate-y-1/2 z-50 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300`;
        feedback.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-arrow-${direction === 'left' ? 'right' : 'left'}"></i>
                <span>${direction === 'left' ? 'Nächster Tab' : 'Vorheriger Tab'}</span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Animate and remove
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(-50%) scale(1)';
        });
        
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-50%) scale(0.8)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 1500);
    }
    
    addSwipeIndicators() {
        // Add subtle indicators showing swipe is available
        const style = document.createElement('style');
        style.textContent = `
            .swipe-indicator {
                position: fixed;
                top: 50%;
                transform: translateY(-50%);
                width: 3px;
                height: 40px;
                background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent);
                z-index: 10;
                opacity: 0;
                animation: swipeHint 3s ease-in-out infinite;
                animation-delay: 2s;
            }
            
            .swipe-indicator.left {
                left: 0;
                border-radius: 0 2px 2px 0;
            }
            
            .swipe-indicator.right {
                right: 0;
                border-radius: 2px 0 0 2px;
            }
            
            @keyframes swipeHint {
                0%, 90%, 100% { opacity: 0; }
                45% { opacity: 1; }
            }
            
            /* Hide indicators after user interaction */
            body.user-interacted .swipe-indicator {
                display: none;
            }
            
            @media (max-width: 767px) {
                .swipe-indicator {
                    display: block;
                }
            }
            
            @media (min-width: 768px) {
                .swipe-indicator {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add indicator elements
        const leftIndicator = document.createElement('div');
        leftIndicator.className = 'swipe-indicator left';
        document.body.appendChild(leftIndicator);
        
        const rightIndicator = document.createElement('div');
        rightIndicator.className = 'swipe-indicator right';
        document.body.appendChild(rightIndicator);
        
        // Hide indicators after first interaction
        const hideIndicators = () => {
            document.body.classList.add('user-interacted');
            document.removeEventListener('touchstart', hideIndicators);
            document.removeEventListener('click', hideIndicators);
        };
        
        document.addEventListener('touchstart', hideIndicators, { once: true });
        document.addEventListener('click', hideIndicators, { once: true });
    }
    
    enable() {
        this.isGestureEnabled = true;
    }
    
    disable() {
        this.isGestureEnabled = false;
    }
    
    destroy() {
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchend', this.handleTouchEnd);
        
        // Remove indicators
        document.querySelectorAll('.swipe-indicator').forEach(el => el.remove());
    }
}

// Auto-initialize for mobile devices
if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.touchGestureHandler = new TouchGestureHandler();
        });
    } else {
        window.touchGestureHandler = new TouchGestureHandler();
    }
}

export default TouchGestureHandler;