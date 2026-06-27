import React, { useState } from 'react';
import logoFusta from '/assets/logo-fusta.png';
import SeasonSelector from './SeasonSelector';
import UserProfile from './UserProfile';
import Icon from './icons/Icon';

export default function Header({ onNavigate }) {
  const [showUserProfile, setShowUserProfile] = useState(false);

  return (
    <>
      <header className="glass-ios border-b border-separator sticky top-0 z-40 safe-area-top safe-area-x">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-system-green to-system-blue rounded-ios flex items-center justify-center logo-glow">
              <img
                src={logoFusta}
                alt="FUSTA Logo"
                className="w-6 h-6 object-contain"
                loading="eager"
              />
            </div>
            <h1 className="text-title3 font-extrabold tracking-tight text-text-primary truncate hidden min-[400px]:block">FUSTA</h1>
          </div>

          {/* Season selector and status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <SeasonSelector showInHeader={true} />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-system-green rounded-full status-ping"></div>
                <span className="text-caption1 text-text-secondary hidden sm:inline">Online</span>
              </div>
              {/* User Profile Button */}
              <button
                onClick={() => setShowUserProfile(true)}
                className="w-9 h-9 bg-system-green/10 hover:bg-system-green/20 text-system-green rounded-full flex items-center justify-center transition-all press-scale hover:shadow-ios-sm"
                aria-label="Benutzerprofil öffnen"
              >
                <Icon name="user" size={18} strokeWidth={2} />
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