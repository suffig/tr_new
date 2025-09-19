import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('fifa-tracker-theme');
    if (savedTheme) {
      return savedTheme;
    }
    // Default to light theme instead of system preference
    return 'light';
  });

  const [autoMode, setAutoMode] = useState(() => {
    return localStorage.getItem('fifa-tracker-auto-theme') === 'true';
  });

  // Handle system theme changes when in auto mode
  useEffect(() => {
    if (!autoMode) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    // Set initial theme based on system preference
    setTheme(mediaQuery.matches ? 'dark' : 'light');

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [autoMode]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1F2937' : '#475569');
    }
  }, [theme]);

  const toggleTheme = () => {
    if (autoMode) {
      setAutoMode(false);
      localStorage.setItem('fifa-tracker-auto-theme', 'false');
    }
    
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('fifa-tracker-theme', newTheme);
  };

  const setAutoTheme = (auto) => {
    setAutoMode(auto);
    localStorage.setItem('fifa-tracker-auto-theme', auto.toString());
    
    if (auto) {
      // Remove manual theme preference to let system take over
      localStorage.removeItem('fifa-tracker-theme');
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    }
  };

  const setManualTheme = (newTheme) => {
    setAutoMode(false);
    setTheme(newTheme);
    localStorage.setItem('fifa-tracker-theme', newTheme);
    localStorage.setItem('fifa-tracker-auto-theme', 'false');
  };

  const value = {
    theme,
    autoMode,
    toggleTheme,
    setAutoTheme,
    setManualTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};