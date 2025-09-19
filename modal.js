import { ErrorHandler } from './utils.js';

// Enhanced Modal Management System
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalStack = [];
        this.isAnimating = false;
        this.baseZIndex = 1050;
    }

    // Create a new modal with enhanced features
    createModal(id, content, options = {}) {
        const modal = {
            id,
            content,
            element: null,
            options: {
                closeOnEscape: true,
                closeOnBackdrop: true,
                showCloseButton: true,
                size: 'default', // 'small', 'default', 'large', 'fullscreen'
                className: '',
                animation: 'slideUp',
                ...options
            }
        };
        
        this.activeModals.set(id, modal);
        return modal;
    }

    // Show modal with enhanced animations
    async showModal(id) {
        if (this.isAnimating) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const modal = this.activeModals.get(id);
        if (!modal) return;

        this.isAnimating = true;
        
        // Create modal element
        modal.element = this.createModalElement(modal);
        document.body.appendChild(modal.element);
        
        // Add to modal stack
        this.modalStack.push(id);
        
        // Set appropriate z-index
        const zIndex = this.baseZIndex + this.modalStack.length;
        modal.element.style.zIndex = zIndex;
        
        // Prevent body scroll
        if (this.modalStack.length === 1) {
            document.body.style.overflow = 'hidden';
        }
        
        // Trigger animation
        await this.animateModalIn(modal.element, modal.options.animation);
        
        this.isAnimating = false;
        
        // Add event listeners
        this.addModalEventListeners(modal);
    }

    // Hide modal with animations
    async hideModal(id = null) {
        if (this.isAnimating) return;
        
        // If no ID provided, close the topmost modal
        const modalId = id || this.modalStack[this.modalStack.length - 1];
        if (!modalId) return;
        
        const modal = this.activeModals.get(modalId);
        if (!modal || !modal.element) return;
        
        this.isAnimating = true;
        
        // Animate out
        await this.animateModalOut(modal.element, modal.options.animation);
        
        // Remove from DOM
        if (modal.element.parentNode) {
            modal.element.parentNode.removeChild(modal.element);
        }
        
        // Remove from stack
        const stackIndex = this.modalStack.indexOf(modalId);
        if (stackIndex > -1) {
            this.modalStack.splice(stackIndex, 1);
        }
        
        // Restore body scroll if no modals left
        if (this.modalStack.length === 0) {
            document.body.style.overflow = '';
        }
        
        // Clean up
        this.activeModals.delete(modalId);
        this.isAnimating = false;
    }

    // Create modal DOM element
    createModalElement(modal) {
        const overlay = document.createElement('div');
        overlay.className = `modal-overlay modal-mobile-safe ${modal.options.className}`;
        overlay.dataset.modalId = modal.id;
        
        const content = document.createElement('div');
        content.className = `modal-content ${this.getSizeClass(modal.options.size)}`;
        content.onclick = (e) => e.stopPropagation();
        
        // Add close button if requested
        if (modal.options.showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.onclick = () => this.hideModal(modal.id);
            content.appendChild(closeBtn);
        }
        
        // Add content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'modal-body';
        contentWrapper.innerHTML = modal.content;
        content.appendChild(contentWrapper);
        
        overlay.appendChild(content);
        
        // Add backdrop click handler
        if (modal.options.closeOnBackdrop) {
            overlay.onclick = () => this.hideModal(modal.id);
        }
        
        return overlay;
    }

    // Get size class for modal
    getSizeClass(size) {
        switch (size) {
            case 'small': return 'modal-content-small';
            case 'large': return 'large-modal-content';
            case 'player': return 'player-detail-modal-content';
            case 'match': return 'match-modal-content';
            default: return '';
        }
    }

    // Animate modal in
    async animateModalIn(element, animation) {
        element.style.opacity = '0';
        
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.style.animation = this.getInAnimation(animation);
                
                const animationEnd = () => {
                    element.removeEventListener('animationend', animationEnd);
                    resolve();
                };
                element.addEventListener('animationend', animationEnd);
            });
        });
    }

    // Animate modal out
    async animateModalOut(element, animation) {
        await new Promise(resolve => {
            element.style.animation = this.getOutAnimation(animation);
            
            const animationEnd = () => {
                element.removeEventListener('animationend', animationEnd);
                resolve();
            };
            element.addEventListener('animationend', animationEnd);
        });
    }

    // Get animation classes
    getInAnimation(animation) {
        switch (animation) {
            case 'slideUp': return 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            case 'fadeIn': return 'modalOverlayFadeIn 0.3s ease-out';
            case 'scaleIn': return 'modalScaleIn 0.3s ease-out';
            default: return 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
    }

    getOutAnimation(animation) {
        switch (animation) {
            case 'slideUp': return 'modalSlideOut 0.3s ease-in';
            case 'fadeIn': return 'modalFadeOut 0.2s ease-in';
            case 'scaleIn': return 'modalScaleOut 0.2s ease-in';
            default: return 'modalSlideOut 0.3s ease-in';
        }
    }

    // Add event listeners
    addModalEventListeners(modal) {
        if (modal.options.closeOnEscape) {
            const escapeHandler = (e) => {
                if (e.key === 'Escape' && this.modalStack[this.modalStack.length - 1] === modal.id) {
                    this.hideModal(modal.id);
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }
    }

    // Hide all modals
    hideAllModals() {
        const modalIds = [...this.modalStack];
        modalIds.reverse().forEach(id => this.hideModal(id));
    }

    // Check if any modal is open
    hasOpenModals() {
        return this.modalStack.length > 0;
    }
}

// Create global modal manager instance
const modalManager = new ModalManager();

// Legacy API compatibility
export function showModal(html, options = {}) {
    const modalId = 'legacy-modal-' + Date.now();
    modalManager.createModal(modalId, html, options);
    modalManager.showModal(modalId);
}

export function hideModal() {
    modalManager.hideModal();
}

// New enhanced API
export function createModal(id, content, options = {}) {
    return modalManager.createModal(id, content, options);
}

export function openModal(id) {
    return modalManager.showModal(id);
}

export function closeModal(id = null) {
    return modalManager.hideModal(id);
}

export function closeAllModals() {
    modalManager.hideAllModals();
}

// Enhanced success modal with auto-close
export function showSuccessAndCloseModal(message) {
    ErrorHandler.showSuccessMessage(message);
    setTimeout(() => {
        hideModal();
    }, 500);
}

// Export modal manager for advanced usage
export { modalManager };

// Make functions globally available
window.hideModal = hideModal;
window.showModal = showModal;
window.modalManager = modalManager;