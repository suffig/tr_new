import { useState, useEffect } from 'react';

// iOS-style toggle switch
export function IOSToggle({ checked, onChange, disabled = false, size = 'md', color = 'blue' }) {
  const sizeClasses = {
    sm: 'w-10 h-6',
    md: 'w-12 h-7',
    lg: 'w-14 h-8'
  };

  const thumbSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  return (
    <button
      type="button"
      className={`
        relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${sizeClasses[size]}
        ${checked ? colorClasses[color] : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span
        className={`
          inline-block rounded-full bg-white transition-transform duration-200 ease-in-out shadow-lg
          ${thumbSizeClasses[size]}
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// iOS-style slider
export function IOSSlider({ value, onChange, min = 0, max = 100, step = 1, disabled = false, color = 'blue' }) {
  const [isDragging, setIsDragging] = useState(false);

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        disabled={disabled}
        className="sr-only"
      />
      <div className="relative h-7 flex items-center">
        <div className="w-full h-1 bg-gray-300 rounded-full">
          <div 
            className={`h-1 rounded-full transition-all duration-150 ${colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div 
          className={`
            absolute w-7 h-7 bg-white rounded-full shadow-lg border-2 transition-all duration-150 cursor-pointer
            ${isDragging ? 'scale-110 border-blue-300' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ left: `calc(${percentage}% - 14px)` }}
        />
      </div>
    </div>
  );
}

// iOS-style segmented control
export function IOSSegmentedControl({ options, selectedIndex, onChange, size = 'md' }) {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3'
  };

  return (
    <div className="inline-flex bg-gray-200 rounded-lg p-1">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onChange(index)}
          className={`
            relative rounded-md font-medium transition-all duration-200 ease-in-out
            ${sizeClasses[size]}
            ${selectedIndex === index 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

// iOS-style action sheet
export function IOSActionSheet({ isOpen, onClose, actions, title, message }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Action Sheet */}
      <div className="absolute bottom-0 left-0 right-0 transform transition-transform duration-300 ease-out">
        <div className="bg-white rounded-t-2xl mx-2 mb-2 overflow-hidden">
          {/* Header */}
          {(title || message) && (
            <div className="px-4 py-3 border-b border-gray-200">
              {title && <h3 className="text-lg font-medium text-gray-900 text-center">{title}</h3>}
              {message && <p className="text-sm text-gray-600 text-center mt-1">{message}</p>}
            </div>
          )}
          
          {/* Actions */}
          <div className="divide-y divide-gray-200">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onPress();
                  onClose();
                }}
                className={`
                  w-full px-4 py-4 text-center text-base transition-colors duration-150
                  ${action.style === 'destructive' 
                    ? 'text-red-600 hover:bg-red-50' 
                    : action.style === 'cancel'
                    ? 'text-gray-600 hover:bg-gray-50 font-medium'
                    : 'text-blue-600 hover:bg-blue-50'
                  }
                `}
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>
        
        {/* Cancel button */}
        <div className="bg-white rounded-xl mx-2 mb-8">
          <button
            onClick={onClose}
            className="w-full px-4 py-4 text-center text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors duration-150"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// iOS-style alert dialog
export function IOSAlert({ isOpen, onClose, title, message, buttons = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Alert */}
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-auto overflow-hidden shadow-xl">
        <div className="px-6 py-6 text-center">
          {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
          {message && <p className="text-sm text-gray-600 leading-relaxed">{message}</p>}
        </div>
        
        {buttons.length > 0 && (
          <div className="border-t border-gray-200">
            {buttons.length === 1 ? (
              <button
                onClick={() => {
                  buttons[0].onPress();
                  onClose();
                }}
                className="w-full px-6 py-4 text-center text-base font-medium text-blue-600 hover:bg-blue-50 transition-colors duration-150"
              >
                {buttons[0].text}
              </button>
            ) : (
              <div className="grid grid-cols-2">
                {buttons.map((button, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      button.onPress();
                      onClose();
                    }}
                    className={`
                      px-6 py-4 text-center text-base font-medium transition-colors duration-150
                      ${index > 0 ? 'border-l border-gray-200' : ''}
                      ${button.style === 'destructive' 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-blue-600 hover:bg-blue-50'
                      }
                    `}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// iOS-style toast notification
export function IOSToast({ message, type = 'info', isVisible, onHide, duration = 3000 }) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onHide, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onHide]);

  const typeConfig = {
    success: { icon: 'fas fa-check-circle', color: 'text-green-600 bg-green-50' },
    error: { icon: 'fas fa-exclamation-circle', color: 'text-red-600 bg-red-50' },
    warning: { icon: 'fas fa-exclamation-triangle', color: 'text-yellow-600 bg-yellow-50' },
    info: { icon: 'fas fa-info-circle', color: 'text-blue-600 bg-blue-50' }
  };

  return (
    <div className={`
      fixed top-16 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out
      ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
    `}>
      <div className={`
        flex items-center space-x-3 px-4 py-3 rounded-full shadow-lg border backdrop-blur-sm
        ${typeConfig[type].color}
      `}>
        <i className={`${typeConfig[type].icon} text-lg`} />
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

// Haptic feedback simulation
export function useHapticFeedback() {
  const triggerHaptic = (type = 'light') => {
    // Check if device supports haptic feedback
    if (navigator.vibrate) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate([30, 10, 30]);
          break;
        case 'success':
          navigator.vibrate([10, 5, 10]);
          break;
        case 'error':
          navigator.vibrate([50, 20, 50]);
          break;
        default:
          navigator.vibrate(10);
      }
    }
    
    // Visual feedback for devices without haptic support
    if (!navigator.vibrate) {
      const event = new CustomEvent('visual-feedback', { detail: { type } });
      window.dispatchEvent(event);
    }
  };

  return { triggerHaptic };
}