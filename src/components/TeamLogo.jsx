import React from 'react';
import { getVersionTeamDisplay } from '../utils/versionTeamManager.js';
import { getCurrentFifaVersion } from '../utils/fifaVersionManager.js';

export default function TeamLogo({ team, size = 'md', className = '', version = null }) {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16'
  };

  const getLogoSrc = (teamName) => {
    // First check for version-specific custom icon
    const fifaVersion = version || getCurrentFifaVersion();
    const teamDisplay = getVersionTeamDisplay(teamName, fifaVersion);
    
    // If there's a custom icon (base64 data), use it
    if (teamDisplay.icon && teamDisplay.icon.startsWith('data:')) {
      return teamDisplay.icon;
    }
    
    // Otherwise use default logos with version awareness
    switch (teamName?.toLowerCase()) {
      case 'aek':
        // Use Dynamo Dresden logo for FC26, AEK logo for FC25
        if (fifaVersion === 'FC26') {
          return '/tr_new/dynamo_logo_transparent.png';
        }
        return '/tr_new/aek_logo_transparent.png';
      case 'real':
        // Use Rangers logo for FC26 if available, otherwise fallback to Real Madrid logo
        if (fifaVersion === 'FC26') {
          return '/tr_new/rangers_logo_transparent.png';
        }
        return '/tr_new/real_logo_transparent.png';
      default:
        return null;
    }
  };

  const logoSrc = getLogoSrc(team);
  
  if (!logoSrc) {
    // Fallback to emoji if no logo found
    const teamDisplay = getVersionTeamDisplay(team, version || getCurrentFifaVersion());
    const emoji = typeof teamDisplay.icon === 'string' && !teamDisplay.icon.startsWith('data:') 
      ? teamDisplay.icon 
      : team?.toLowerCase() === 'aek' ? '🔵' : team?.toLowerCase() === 'real' ? '🔴' : '⚽';
    return <span className={className}>{emoji}</span>;
  }

  return (
    <img 
      src={logoSrc}
      alt={`${team} Logo`}
      className={`${sizes[size]} object-contain ${className}`}
      onError={(e) => {
        // Fallback to emoji if image fails to load
        const teamDisplay = getVersionTeamDisplay(team, version || getCurrentFifaVersion());
        const emoji = typeof teamDisplay.icon === 'string' && !teamDisplay.icon.startsWith('data:') 
          ? teamDisplay.icon 
          : team?.toLowerCase() === 'aek' ? '🔵' : team?.toLowerCase() === 'real' ? '🔴' : '⚽';
        e.target.outerHTML = `<span class="${className}">${emoji}</span>`;
      }}
    />
  );
}