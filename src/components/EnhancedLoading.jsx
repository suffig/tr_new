import { useState, useEffect } from 'react';

export default function SkeletonLoading({ type = 'default', count = 1, className = '' }) {
  const [animationDelay, setAnimationDelay] = useState(0);

  useEffect(() => {
    // Stagger animation for multiple skeletons
    setAnimationDelay(Math.random() * 2);
  }, []);

  const defaultSkeleton = (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    </div>
  );

  const playerCardSkeleton = (
    <div className="animate-pulse bg-white rounded-lg border p-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
        <div className="w-8 h-8 bg-gray-300 rounded"></div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-300 rounded w-full"></div>
        <div className="h-3 bg-gray-300 rounded w-4/5"></div>
      </div>
    </div>
  );

  const matchCardSkeleton = (
    <div className="animate-pulse bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 bg-gray-300 rounded w-20"></div>
        <div className="h-3 bg-gray-300 rounded w-16"></div>
      </div>
      <div className="flex items-center justify-center space-x-4">
        <div className="text-center">
          <div className="h-6 bg-gray-300 rounded w-12 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-8"></div>
        </div>
        <div className="h-6 bg-gray-300 rounded w-8"></div>
        <div className="text-center">
          <div className="h-6 bg-gray-300 rounded w-12 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-8"></div>
        </div>
      </div>
      <div className="mt-4 h-3 bg-gray-300 rounded w-2/3 mx-auto"></div>
    </div>
  );

  const statCardSkeleton = (
    <div className="animate-pulse bg-white rounded-lg border p-6">
      <div className="text-center">
        <div className="h-8 bg-gray-300 rounded w-16 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-24 mx-auto"></div>
      </div>
    </div>
  );

  const tableRowSkeleton = (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-16"></div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-6 bg-gray-300 rounded w-12 mx-auto"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-300 rounded w-8 mx-auto"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-300 rounded w-8 mx-auto"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-8 bg-gray-300 rounded w-16 mx-auto"></div>
      </td>
    </tr>
  );

  const getSkeleton = () => {
    switch (type) {
      case 'player-card':
        return playerCardSkeleton;
      case 'match-card':
        return matchCardSkeleton;
      case 'stat-card':
        return statCardSkeleton;
      case 'table-row':
        return tableRowSkeleton;
      default:
        return defaultSkeleton;
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          style={{
            animationDelay: `${animationDelay + index * 0.1}s`,
            animationDuration: '1.5s'
          }}
        >
          {getSkeleton()}
        </div>
      ))}
    </div>
  );
}

// Enhanced loading spinner with iOS-style animations
export function IOSLoadingSpinner({ size = 'md', color = 'blue' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    gray: 'text-gray-500'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}>
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// Shimmer effect for loading states
export function ShimmerEffect({ children, className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
    </div>
  );
}

// Progressive loading with stages
export function ProgressiveLoader({ stages = [], currentStage = 0, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <IOSLoadingSpinner size="lg" />
      </div>
      
      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              index < currentStage ? 'bg-green-500' : 
              index === currentStage ? 'bg-blue-500 animate-pulse' : 
              'bg-gray-300'
            }`} />
            <span className={`text-sm transition-colors duration-300 ${
              index <= currentStage ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pulse loading for cards
export function PulseCard({ children, loading = false, className = '' }) {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <SkeletonLoading type="player-card" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      {children}
    </div>
  );
}