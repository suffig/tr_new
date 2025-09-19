import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHapticFeedback } from './IOSComponents';

export default function EnhancedModal({ 
  isOpen, 
  onClose, 
  children, 
  title,
  size = 'md',
  animation = 'slideUp',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  fullScreen = false
}) {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef(null);
  const { triggerHaptic } = useHapticFeedback();

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full'
  };

  // Animation classes
  const animationClasses = {
    slideUp: {
      enter: 'animate-slideUpIn',
      exit: 'animate-slideUpOut'
    },
    slideDown: {
      enter: 'animate-slideDownIn',
      exit: 'animate-slideDownOut'
    },
    fadeIn: {
      enter: 'animate-fadeIn',
      exit: 'animate-fadeOut'
    },
    zoomIn: {
      enter: 'animate-zoomIn',
      exit: 'animate-zoomOut'
    },
    slideLeft: {
      enter: 'animate-slideLeftIn',
      exit: 'animate-slideLeftOut'
    },
    slideRight: {
      enter: 'animate-slideRightIn',
      exit: 'animate-slideRightOut'
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      triggerHaptic('light');
      document.body.style.overflow = 'hidden';
    } else if (isVisible) {
      // Add exit animation
      setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = 'unset';
      }, 300);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isVisible, triggerHaptic]);

  // Handle escape key
  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape && isVisible) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, closeOnEscape, triggerHaptic, onClose, handleClose]);

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div 
        className={`
          absolute inset-0 transition-opacity duration-300
          ${isOpen ? 'bg-black bg-opacity-50 backdrop-blur-sm' : 'bg-transparent'}
        `}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative w-full mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden
          ${fullScreen ? 'h-full max-w-full' : sizeClasses[size]}
          ${isOpen ? animationClasses[animation].enter : animationClasses[animation].exit}
          mobile-safe-content
        `}
        style={{ 
          maxHeight: fullScreen ? '100%' : 'calc(100vh - 2rem)',
          marginBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">
              {title || ''}
            </h2>
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-150"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className={`
          ${fullScreen ? 'flex-1 overflow-auto' : 'max-h-[70vh] overflow-auto'}
        `}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Bottom sheet modal (iOS style)
export function BottomSheetModal({ isOpen, onClose, children, title, snapPoints = ['50%', '90%'] }) {
  const [currentSnap, setCurrentSnap] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const { triggerHaptic } = useHapticFeedback();

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    triggerHaptic('light');
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    const threshold = 100;
    
    if (deltaY > threshold) {
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1);
        triggerHaptic('medium');
      } else {
        onClose();
        triggerHaptic('success');
      }
    } else if (deltaY < -threshold && currentSnap < snapPoints.length - 1) {
      setCurrentSnap(currentSnap + 1);
      triggerHaptic('medium');
    }
    
    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`
          absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out
        `}
        style={{ 
          height: snapPoints[currentSnap],
          transform: isDragging ? `translateY(${Math.max(0, currentY - startY)}px)` : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 text-center">{title}</h2>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Slide-over modal (iOS style)
export function SlideOverModal({ isOpen, onClose, children, title, position = 'right' }) {
  const { triggerHaptic } = useHapticFeedback();

  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, triggerHaptic]);

  if (!isOpen) return null;

  const slideClasses = {
    right: 'right-0 transform translate-x-full',
    left: 'left-0 transform -translate-x-full',
    top: 'top-0 transform -translate-y-full',
    bottom: 'bottom-0 transform translate-y-full'
  };

  const slideOpenClasses = {
    right: 'translate-x-0',
    left: 'translate-x-0',
    top: 'translate-y-0',
    bottom: 'translate-y-0'
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Slide Over */}
      <div 
        className={`
          absolute ${position === 'left' || position === 'right' ? 'top-0 bottom-0 w-80' : 'left-0 right-0 h-80'}
          ${slideClasses[position]}
          ${isOpen ? slideOpenClasses[position] : ''}
          bg-white shadow-2xl transition-transform duration-300 ease-out
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">
            {title || ''}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Confirmation modal with enhanced animations
export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  type = 'default' // 'default', 'danger', 'warning'
}) {
  const { triggerHaptic } = useHapticFeedback();

  const handleConfirm = () => {
    triggerHaptic('success');
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    triggerHaptic('light');
    onClose();
  };

  const typeConfig = {
    default: {
      confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: 'fas fa-question-circle text-blue-500'
    },
    danger: {
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'fas fa-exclamation-triangle text-red-500'
    },
    warning: {
      confirmClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'fas fa-exclamation-circle text-yellow-500'
    }
  };

  return (
    <EnhancedModal 
      isOpen={isOpen} 
      onClose={handleCancel}
      size="sm"
      animation="zoomIn"
      showCloseButton={false}
    >
      <div className="p-6 text-center">
        <div className="mb-4">
          <i className={`${typeConfig[type].icon} text-4xl`} />
        </div>
        
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>}
        {message && <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>}
        
        <div className="flex space-x-3 justify-center">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-150"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg transition-colors duration-150 ${typeConfig[type].confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
}