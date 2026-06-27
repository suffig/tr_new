export default function LoadingSpinner({ message = 'Lädt...', size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'loader-sm',
    md: '',
    lg: 'loader-lg'
  };

  return (
    <div className={`flex items-center justify-center py-8 ${className}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className={`loader-dots ${sizeClasses[size]}`} aria-label="Lädt">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="text-sm text-text-muted font-medium" aria-live="polite">
          {message}
        </div>
      </div>
    </div>
  );
}

export function FullScreenLoader({ message = 'Lädt...' }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" role="status" aria-live="polite">
      <div className="bg-bg-secondary rounded-xl p-8 flex flex-col items-center gap-4 shadow-xl animate-scale-in">
        <div className="loader-ring" aria-label="Lädt"></div>
        <div className="text-text-secondary font-medium" aria-live="polite">{message}</div>
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 'sm', className = '' }) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
      aria-label="Lädt"
      role="status"
    ></div>
  );
}
