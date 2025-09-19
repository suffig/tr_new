import React from 'react';

export default function HorizontalNavigation({ views, selectedView, onViewChange, className = '' }) {
  return (
    <div className={`relative mb-6 animate-mobile-slide-in ${className}`}>
      <div className="flex overflow-x-auto scrollbar-hide gap-2 py-2">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all duration-300 min-w-[80px] ${
              selectedView === view.id
                ? 'bg-system-blue text-white shadow-ios-elevated'
                : 'bg-bg-card text-text-secondary hover:bg-bg-elevated'
            }`}
            title={view.label}
            aria-label={view.label}
          >
            <span className="text-lg">{view.logoComponent || view.icon}</span>
            <span className="text-xs font-semibold">{view.label}</span>
            {selectedView === view.id && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
            )}
          </button>
        ))}
      </div>
      {/* Scroll indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-bg-primary to-transparent pointer-events-none opacity-50"></div>
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-bg-primary to-transparent pointer-events-none opacity-50"></div>
    </div>
  );
}