/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Offline Manager Hook for React
 * Provides offline detection and status management
 */
export default function useOfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      if (wasOffline) {
        toast.success('🌐 Verbindung wiederhergestellt!', {
          duration: 3000,
          icon: '✅'
        });
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      
      toast.error('📴 Offline-Modus aktiv', {
        duration: 5000,
        icon: '⚠️'
      });
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to test connectivity
        const response = await fetch('/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (!response.ok && isOnline) {
          handleOffline();
        } else if (response.ok && !isOnline) {
          handleOnline();
        }
      } catch (error) {
        if (isOnline) {
          handleOffline();
        }
      }
    };

    // Check connection every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOnline, wasOffline]);

  return { isOnline, wasOffline };
}

/**
 * Offline Status Indicator Component - Small corner icon
 */
export function OfflineIndicator() {
  const { isOnline } = useOfflineManager();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 right-3 z-50 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
    </div>
  );
}

