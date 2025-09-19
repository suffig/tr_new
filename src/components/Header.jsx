import React from 'react';
import logoFusta from '/assets/logo-fusta.png';
import SeasonSelector from './SeasonSelector';

export default function Header() {
  return (
    <header className="glass-ios border-b border-separator sticky top-0 z-40 safe-area-top safe-area-x">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-system-green to-system-blue rounded-ios flex items-center justify-center shadow-ios-sm">
            <img 
              src={logoFusta} 
              alt="FUSTA Logo" 
              className="w-6 h-6 object-contain"
              loading="eager"
            />
          </div>
          <h1 className="text-title3 font-bold text-text-primary">FUSTA</h1>
        </div>
        
        {/* Season selector and status */}
        <div className="flex items-center gap-4">
          <SeasonSelector showInHeader={true} />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-system-green rounded-full animate-pulse-gentle"></div>
            <span className="text-caption1 text-text-secondary">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}