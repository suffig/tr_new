import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function AnimatedBackground({ 
  variant = 'floating-orbs', 
  intensity = 'medium',
  className = '' 
}) {
  const { isDark } = useTheme();
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const particleCount = intensity === 'low' ? 3 : intensity === 'high' ? 8 : 5;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 40,
      speed: Math.random() * 20 + 10,
      direction: Math.random() * 360,
      opacity: Math.random() * 0.3 + 0.1
    }));
    setParticles(newParticles);
  }, [intensity]);

  if (variant === 'floating-orbs') {
    return (
      <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute rounded-full ${
              isDark 
                ? 'bg-gradient-to-br from-blue-400/20 to-purple-600/20' 
                : 'bg-gradient-to-br from-blue-100/40 to-purple-200/40'
            } animate-float-gentle`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.id * 2}s`,
              animationDuration: `${particle.speed}s`,
              opacity: particle.opacity,
              filter: 'blur(1px)'
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'geometric-shapes') {
    return (
      <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute ${
              isDark 
                ? 'border-blue-400/20' 
                : 'border-blue-200/30'
            } border animate-rotate-slow`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              borderWidth: '2px',
              borderRadius: particle.id % 2 === 0 ? '50%' : '0%',
              animationDelay: `${particle.id * 3}s`,
              animationDuration: `${particle.speed * 2}s`,
              opacity: particle.opacity,
              transform: `rotate(${particle.direction}deg)`
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'football-particles') {
    return (
      <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-bounce-football"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              fontSize: `${particle.size / 3}px`,
              animationDelay: `${particle.id * 4}s`,
              animationDuration: `${particle.speed / 2}s`,
              opacity: particle.opacity * 0.6,
            }}
          >
            ⚽
          </div>
        ))}
      </div>
    );
  }

  // Default gradient background
  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      <div className={`w-full h-full ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900' 
          : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      } animate-gradient-shift`} />
    </div>
  );
}