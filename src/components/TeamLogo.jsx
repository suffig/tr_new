import React from 'react';

export default function TeamLogo({ team, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16'
  };

  const getLogoSrc = (teamName) => {
    switch (teamName?.toLowerCase()) {
      case 'aek':
        return '/tr_lite/aek_logo_transparent.png';
      case 'real':
        return '/tr_lite/real_logo_transparent.png';
      default:
        return null;
    }
  };

  const logoSrc = getLogoSrc(team);
  
  if (!logoSrc) {
    // Fallback to emoji if no logo found
    const emoji = team?.toLowerCase() === 'aek' ? '🔵' : team?.toLowerCase() === 'real' ? '🔴' : '⚽';
    return <span className={className}>{emoji}</span>;
  }

  return (
    <img 
      src={logoSrc}
      alt={`${team} Logo`}
      className={`${sizes[size]} object-contain ${className}`}
      onError={(e) => {
        // Fallback to emoji if image fails to load
        const emoji = team?.toLowerCase() === 'aek' ? '🔵' : team?.toLowerCase() === 'real' ? '🔴' : '⚽';
        e.target.outerHTML = `<span class="${className}">${emoji}</span>`;
      }}
    />
  );
}