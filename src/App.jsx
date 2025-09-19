import { useState, Suspense, lazy, useEffect } from 'react';
import * as React from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth.js';
import { OfflineIndicator } from './hooks/useOfflineManager.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import LoadingSpinner, { FullScreenLoader } from './components/LoadingSpinner';
import GlobalSearch from './components/GlobalSearch';
import PerformanceMonitor from './components/PerformanceMonitor';
import NotificationSystem from './components/NotificationSystem';

// Lazy load tab components for better performance
const MatchesTab = lazy(() => import('./components/tabs/MatchesTab'));
const KaderTab = lazy(() => import('./components/tabs/KaderTab'));
const BansTab = lazy(() => import('./components/tabs/BansTab'));
const FinanzenTab = lazy(() => import('./components/tabs/FinanzenTab'));
const StatsTab = lazy(() => import('./components/tabs/StatsTab'));
const EventsTab = lazy(() => import('./components/tabs/EventsTab'));
const AlcoholTrackerTab = lazy(() => import('./components/tabs/AlcoholTrackerTab'));
const AdminTab = lazy(() => import('./components/tabs/AdminTab'));

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('matches');
  const [tabLoading, setTabLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Check if we're in demo mode
  useEffect(() => {
    const checkDemoMode = () => {
      // Check if user has demo metadata or if there are demo-related console logs
      const demoMode = user?.user_metadata?.demo_mode || 
                       localStorage.getItem('supabase.auth.token')?.includes('demo-token');
      setIsDemoMode(demoMode);
    };
    
    checkDemoMode();
    
    // Listen for demo mode changes
    const interval = setInterval(checkDemoMode, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleTabChange = async (newTab, options = {}) => {
    if (newTab === activeTab && !options.force) return;
    
    setTabLoading(true);
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 200));
    setActiveTab(newTab);
    setTabLoading(false);

    // Handle navigation options
    if (options.action) {
      // Pass action to the tab component somehow
      setTimeout(() => {
        if (options.action === 'add') {
          // Trigger add action in the respective tab
          const event = new CustomEvent('fifa-tracker-action', { 
            detail: { tab: newTab, action: 'add', ...options } 
          });
          window.dispatchEvent(event);
        }
      }, 300);
    }
  };

  // Global search shortcut and event listener - only work on admin page
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k' && activeTab === 'admin') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };

    const handleGlobalSearchToggle = () => {
      if (activeTab === 'admin') {
        setShowGlobalSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('global-search-toggle', handleGlobalSearchToggle);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('global-search-toggle', handleGlobalSearchToggle);
    };
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGlobalSearchNavigate = (tab, action) => {
    handleTabChange(tab, action);
    setShowGlobalSearch(false);
  };

  const renderTabContent = () => {
    const showHints = activeTab === 'admin';
    const props = { onNavigate: handleTabChange, showHints };
    
    switch (activeTab) {
      case 'matches':
        return <MatchesTab {...props} />;
      case 'bans':
        return <BansTab {...props} />;
      case 'finanzen':
        return <FinanzenTab {...props} />;
      case 'squad':
        return <KaderTab {...props} />;
      case 'stats':
        return <StatsTab {...props} />;
      case 'events':
        return <EventsTab {...props} />;
      case 'alcohol':
        return <AlcoholTrackerTab {...props} />;
      case 'admin':
        return <AdminTab onLogout={handleLogout} {...props} />;
      default:
        return <MatchesTab {...props} />;
    }
  };

  if (authLoading) {
    return <FullScreenLoader message="Lade Anwendung..." />;
  }

  if (!user) {
    return (
      <ThemeProvider>
        <Login />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
              border: '1px solid var(--border-light)',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: 'var(--bg-secondary)',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: 'var(--bg-secondary)',
              },
            },
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen bg-bg-primary transition-colors duration-ios safe-area-all">
        {/* Header */}
        <Header />
        
        {/* Offline Status Indicator - Only show on admin page */}
        {activeTab === 'admin' && <OfflineIndicator />}
        
        {/* Connection Status Indicator - Only show on admin page */}
        {isDemoMode && activeTab === 'admin' && (
          <div className="bg-system-yellow/20 border-system-yellow/40 text-system-yellow px-4 py-3 text-center" role="alert">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="text-footnote font-medium">Demo-Modus aktiv - Supabase CDN blockiert</span>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto ios-scroll-smooth pb-20" role="main">
          <Suspense fallback={<LoadingSpinner message="Lade Tab..." />}>
            {tabLoading ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner message="Wechsle Tab..." />
              </div>
            ) : (
              <ErrorBoundary>
                {renderTabContent()}
              </ErrorBoundary>
            )}
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Toast Notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '15px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-light)',
              backdropFilter: 'var(--blur-md)',
            },
            success: {
              iconTheme: {
                primary: 'var(--system-green)',
                secondary: 'var(--bg-elevated)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--system-red)',
                secondary: 'var(--bg-elevated)',
              },
            },
            loading: {
              iconTheme: {
                primary: 'var(--text-tertiary)',
                secondary: 'var(--bg-elevated)',
              },
            },
          }}
          containerStyle={{
            zIndex: 9999,
          }}
        />

        {/* Global Search Modal - Only available on admin page */}
        {showGlobalSearch && activeTab === 'admin' && (
          <GlobalSearch 
            onNavigate={handleGlobalSearchNavigate}
            onClose={() => setShowGlobalSearch(false)}
          />
        )}

        {/* Performance Monitor - Only show on admin page */}
        {activeTab === 'admin' && <PerformanceMonitor />}

        {/* Global Notification System */}
        <NotificationSystem onNavigate={(tab) => {
          setActiveTab(tab);
          // Could add additional navigation logic here if needed
          // e.g., storing options in state for tab components to use
        }} />
      </div>
    </ThemeProvider>
  );
}

// Error Boundary Component
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="alert alert-error max-w-md text-center">
          <div className="text-4xl mb-4" aria-hidden="true">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Etwas ist schiefgelaufen</h3>
          <p className="text-sm mb-4">
            Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
            aria-label="Seite neu laden"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default App;