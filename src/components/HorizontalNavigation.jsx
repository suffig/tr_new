import React, { useRef, useEffect } from 'react';
import Icon from './icons/Icon';

/**
 * iOS-style segmented control.
 * - Mobile: content-width segments that scroll horizontally (no overlap).
 * - Desktop (sm+): segments expand to fill the bar equally.
 * Views can provide `logoComponent` (custom JSX), `iconName` (SVG icon)
 * or `icon` (legacy emoji). The active segment auto-scrolls into view.
 */
export default function HorizontalNavigation({ views, selectedView, onViewChange, className = '' }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  // Keep the selected segment visible when it changes (esp. on mobile scroll)
  useEffect(() => {
    const el = activeRef.current;
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedView]);

  return (
    <div className={`mb-4 sm:mb-6 animate-mobile-slide-in ${className}`}>
      <div
        ref={scrollRef}
        className="flex gap-1 p-1 bg-bg-tertiary rounded-2xl overflow-x-auto scrollbar-hide snap-x"
      >
        {views.map((view) => {
          const isActive = selectedView === view.id;
          return (
            <button
              key={view.id}
              ref={isActive ? activeRef : null}
              onClick={() => onViewChange(view.id)}
              className={`shrink-0 sm:flex-1 snap-start flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px] min-h-[48px] ${
                isActive
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary active:scale-95'
              }`}
              title={view.label}
              aria-label={view.label}
              aria-pressed={isActive}
            >
              <span className="flex items-center justify-center h-[18px]">
                {view.logoComponent || (view.iconName ? <Icon name={view.iconName} size={18} strokeWidth={2.1} /> : <span className="text-base leading-none">{view.icon}</span>)}
              </span>
              <span className="text-[11px] font-semibold whitespace-nowrap max-w-[92px] truncate">{view.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
