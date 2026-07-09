import { useState, Suspense, lazy, useEffect, useRef } from 'react';
import * as React from 'react';
import { getVisibleTabs, ADMIN_EMAIL } from './constants/navigation.js';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth.js';
import { OfflineIndicator } from './hooks/useOfflineManager.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner, { FullScreenLoader } from './components/LoadingSpinner';
import GlobalSearch from './components/GlobalSearch';
import NotificationSystem from './components/NotificationSystem';

// Lazy load tab components for better performance
const MatchesTab = lazy(() => import('./components/tabs/MatchesTab'));
const KaderTab = lazy(() => import('./components/tabs/KaderTab'));
const BansTab = lazy(() => import('./components/tabs/BansTab'));
const FinanzenTab = lazy(() => import('./components/tabs/FinanzenTab'));
const StatsTab = lazy(() => import('./components/tabs/StatsTab'));
const EventsTab = lazy(() => import('./components/tabs/EventsTab'));
const AlcoholTrackerTab = lazy(() => import('./components/tabs/AlcoholTrackerTab'));
const SpielersaufenTab  = lazy(() => import('./components/tabs/SpielersaufenTab'));
const TeamTrackerTab = lazy(() => import('./components/tabs/TeamTrackerTab'));
const AdminTab = lazy(() => import('./components/tabs/AdminTab'));

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  // QoL: remember the last tab across reloads (PWA re-opens where you left off)
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('fusta_active_tab') || 'matches'; } catch { return 'matches'; }
  });
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const mainRef = useRef(null);

  // Persist the active tab so a reload / PWA relaunch restores it
  useEffect(() => {
    try { localStorage.setItem('fusta_active_tab', activeTab); } catch { /* ignore */ }
  }, [activeTab]);

  // Check if we're in demo mode (event-driven instead of 1s polling)
  useEffect(() => {
    const checkDemoMode = () => {
      const demoMode = user?.user_metadata?.demo_mode ||
                       localStorage.getItem('supabase.auth.token')?.includes('demo-token');
      setIsDemoMode(!!demoMode);
    };

    checkDemoMode();
    window.addEventListener('fifa-fallback-activated', checkDemoMode);
    return () => window.removeEventListener('fifa-fallback-activated', checkDemoMode);
  }, [user]);

  const handleTabChange = async (newTab, options = {}) => {
    if (newTab === activeTab && !options.force) {
      // iOS pattern: tapping the active tab again scrolls back to top
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Switch instantly — the tab content animates in via .tab-transition
    setActiveTab(newTab);
    // Each tab starts at the top (the window keeps its scroll position otherwise)
    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch { /* not supported */ }
    }

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

  // Swipe left/right on the content area to switch tabs (touch devices)
  useEffect(() => {
    if (!('ontouchstart' in window)) return;
    const main = mainRef.current;
    if (!main) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let valid = false;

    const isExcluded = (target) =>
      target.closest('input, textarea, select, button, [role="dialog"], .modal, [class*="overflow-x"]') !== null;

    const onTouchStart = (e) => {
      valid = !isExcluded(e.target);
      startX = e.changedTouches[0].clientX;
      startY = e.changedTouches[0].clientY;
      startTime = Date.now();
    };

    const onTouchEnd = (e) => {
      if (!valid) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      const dt = Date.now() - startTime;
      // Deliberate horizontal swipe: long enough, fast enough, not diagonal
      if (Math.abs(dx) < 80 || dy > 60 || dt > 600) return;

      const tabs = getVisibleTabs(user).map((t) => t.id);
      const idx = tabs.indexOf(activeTab);
      if (idx === -1) return;
      const next = dx < 0 ? idx + 1 : idx - 1;
      if (next >= 0 && next < tabs.length) {
        handleTabChange(tabs[next]);
      }
    };

    main.addEventListener('touchstart', onTouchStart, { passive: true });
    main.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      main.removeEventListener('touchstart', onTouchStart);
      main.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  // Global search shortcut and event listener - only work on admin page for authorized users
  useEffect(() => {
    const isAdminUser = user?.email === ADMIN_EMAIL;
    
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k' && activeTab === 'admin' && isAdminUser) {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };

    const handleGlobalSearchToggle = () => {
      if (activeTab === 'admin' && isAdminUser) {
        setShowGlobalSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('global-search-toggle', handleGlobalSearchToggle);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('global-search-toggle', handleGlobalSearchToggle);
    };
  }, [activeTab, user]);

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
    const props = { onNavigate: handleTabChange, showHints, user };
    
    // Security check: redirect unauthorized users away from admin tab
    if (activeTab === 'admin' && (!user || user.email !== ADMIN_EMAIL)) {
      // Redirect to matches tab
      setTimeout(() => setActiveTab('matches'), 0);
      return <MatchesTab {...props} />;
    }
    
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
      case 'spielersaufen':
        return <SpielersaufenTab {...props} />;
      case 'teams':
        return <TeamTrackerTab {...props} />;
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
      <div className="flex flex-col min-h-screen bg-bg-primary transition-colors duration-ios safe-area-all app-aurora">
        {/* Header */}
        <Header onNavigate={handleTabChange} />
        
        {/* Offline Status Indicator - Only show on admin page for authorized users */}
        {activeTab === 'admin' && user?.email === ADMIN_EMAIL && <OfflineIndicator />}
        
        {/* Connection Status Indicator - Only show on admin page for authorized users */}
        {isDemoMode && activeTab === 'admin' && user?.email === ADMIN_EMAIL && (
          <div className="bg-system-yellow/20 border-system-yellow/40 text-system-yellow px-4 py-3 text-center" role="alert">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="text-footnote font-medium">Demo-Modus aktiv - Supabase CDN blockiert</span>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto ios-scroll-smooth pb-28" role="main">
          <Suspense fallback={<LoadingSpinner message="Lade Tab..." />}>
            <ErrorBoundary>
              <div key={activeTab} className="tab-transition">
                {renderTabContent()}
              </div>
            </ErrorBoundary>
          </Suspense>
        </main>

        {/* Scroll-to-top (appears on long pages) */}
        <ScrollToTop scrollRef={mainRef} />

        {/* Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          user={user}
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

        {/* Global Search Modal - Only available on admin page for authorized users */}
        {showGlobalSearch && activeTab === 'admin' && user?.email === ADMIN_EMAIL && (
          <GlobalSearch 
            onNavigate={handleGlobalSearchNavigate}
            onClose={() => setShowGlobalSearch(false)}
          />
        )}

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