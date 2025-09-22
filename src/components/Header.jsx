import React, { useState } from 'react';
import logoFusta from '/assets/logo-fusta.png';
import SeasonSelector from './SeasonSelector';
import UserProfile from './UserProfile';

export default function Header({ onNavigate }) {
  const [showUserProfile, setShowUserProfile] = useState(false);

  return (
    <>
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-system-green rounded-full animate-pulse-gentle"></div>
                <span className="text-caption1 text-text-secondary">Online</span>
              </div>
              {/* User Profile Button */}
              <button
                onClick={() => setShowUserProfile(true)}
                className="w-8 h-8 bg-system-blue/10 hover:bg-system-blue/20 rounded-full flex items-center justify-center transition-colors"
                aria-label="Benutzerprofil öffnen"
              >
                <span className="text-sm">👤</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      {showUserProfile && (
        <UserProfile
          onClose={() => setShowUserProfile(false)}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}