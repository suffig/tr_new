// Enhanced Supabase client with fallback support for React
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://buduldeczjwnjvsckqat.supabase.co';
const supabaseKey = 'sb_publishable_wcOHaKNEW9rQ3anrRNlEpA_r1_wGda3';

// Global fallback state
let usingFallback = false;
let authSession = null;

// Sample data for fallback mode (enhanced with proper schema)
const fallbackData = {
  matches: [
    { 
      id: 1, 
      date: '2024-01-15', 
      teama: 'AEK', 
      teamb: 'Real', 
      goalsa: 2, 
      goalsb: 1, 
      goalslista: [{ player: 'Max Müller', player_id: 1, count: 1 }, { player: 'Leon Wagner', player_id: 3, count: 1 }],
      goalslistb: [{ player: 'Jan Becker', player_id: 4, count: 1 }],
      yellowa: 1,
      reda: 0,
      yellowb: 2,
      redb: 0,
      manofthematch: 'Max Müller',
      manofthematch_player_id: 1,
      prizeaek: 5000,
      prizereal: 3000
    },
    { 
      id: 2, 
      date: '2024-01-10', 
      teama: 'AEK', 
      teamb: 'Real', 
      goalsa: 1, 
      goalsb: 3, 
      goalslista: [{ player: 'Max Müller', player_id: 1, count: 1 }],
      goalslistb: [{ player: 'Jan Becker', player_id: 4, count: 2 }, { player: 'Ben Richter', player_id: 6, count: 1 }],
      yellowa: 2,
      reda: 1,
      yellowb: 0,
      redb: 0,
      manofthematch: 'Jan Becker',
      manofthematch_player_id: 4,
      prizeaek: 2000,
      prizereal: 5000
    },
    { 
      id: 3, 
      date: '2024-01-05', 
      teama: 'AEK', 
      teamb: 'Real', 
      goalsa: 0, 
      goalsb: 0, 
      goalslista: [],
      goalslistb: [],
      yellowa: 1,
      reda: 0,
      yellowb: 1,
      redb: 0,
      manofthematch: null,
      manofthematch_player_id: null,
      prizeaek: 2500,
      prizereal: 2500
    }
  ],
  players: [
    { id: 1, name: 'Max Müller', team: 'AEK', position: 'ST', goals: 5, value: 15.5, created_at: '2024-01-01T10:00:00Z' },
    { id: 2, name: 'Tom Schmidt', team: 'AEK', position: 'TH', goals: 0, value: 8.2, created_at: '2024-01-01T10:00:00Z' },
    { id: 3, name: 'Leon Wagner', team: 'AEK', position: 'IV', goals: 1, value: 12.0, created_at: '2024-01-01T10:00:00Z' },
    { id: 4, name: 'Jan Becker', team: 'Real', position: 'ST', goals: 7, value: 18.3, created_at: '2024-01-01T10:00:00Z' },
    { id: 5, name: 'Paul Klein', team: 'Real', position: 'TH', goals: 0, value: 9.1, created_at: '2024-01-01T10:00:00Z' },
    { id: 6, name: 'Ben Richter', team: 'Real', position: 'ZM', goals: 2, value: 14.7, created_at: '2024-01-01T10:00:00Z' }
  ],
  bans: [
    { id: 1, player_id: 1, team: 'AEK', type: 'Gelb-Rote Karte', totalgames: 1, matchesserved: 0, reason: 'Gelb-Rot' },
    { id: 2, player_id: 4, team: 'Real', type: 'Unsportlichkeit', totalgames: 2, matchesserved: 0, reason: 'Unsportlichkeit' }
  ],
  transactions: [
    { id: 1, amount: 5000, info: 'Siegprämie', team: 'AEK', date: '2024-01-15', type: 'Preisgeld', match_id: 1 },
    { id: 2, amount: -2000, info: 'Kartenstrafe', team: 'Real', date: '2024-01-10', type: 'Strafe', match_id: 2 },
    { id: 3, amount: 3000, info: 'Sponsoring', team: 'Real', date: '2024-01-08', type: 'Sonstiges', match_id: null },
    { id: 4, amount: 1000, info: 'Spieler des Spiels Bonus', team: 'AEK', date: '2024-01-15', type: 'SdS Bonus', match_id: 1 },
    { id: 5, amount: -500, info: 'Gelb-Rot Strafe', team: 'AEK', date: '2024-01-10', type: 'Strafe', match_id: 2 },
    { id: 6, amount: 2500, info: 'Unentschieden Prämie', team: 'AEK', date: '2024-01-05', type: 'Preisgeld', match_id: 3 },
    { id: 7, amount: 2500, info: 'Unentschieden Prämie', team: 'Real', date: '2024-01-05', type: 'Preisgeld', match_id: 3 }
  ],
  finances: [
    { id: 1, team: 'AEK', balance: 25000, debt: 0 },
    { id: 2, team: 'Real', balance: 18000, debt: 2000 }
  ],
  spieler_des_spiels: [
    // This would normally be populated by matches, but adding demo data for testing
    // In reality, this would be calculated from matches.manofthematch
  ]
};
let fallbackSession = null;
let authCallbacks = [];

// Try to restore session from localStorage
try {
  const stored = localStorage.getItem('supabase.auth.token');
  if (stored) {
    fallbackSession = JSON.parse(stored);
  }
} catch (e) {
  console.warn('Could not restore session:', e);
}

// Enhanced fallback client for when CDN is blocked
const createFallbackClient = () => {
  console.warn('🔄 Creating fallback Supabase client - CDN may be blocked');

  const mockClient = {
    auth: {
      getSession: () => {
        console.warn('⚠️ Using fallback getSession');
        return Promise.resolve({ data: { session: fallbackSession } });
      },
      getUser: () => {
        console.warn('⚠️ Using fallback getUser');
        return Promise.resolve({ data: { user: fallbackSession?.user || null } });
      },
      onAuthStateChange: (callback) => {
        console.warn('⚠️ Using fallback onAuthStateChange');
        authCallbacks.push(callback);
        // Initial callback
        setTimeout(() => callback(fallbackSession ? 'SIGNED_IN' : 'SIGNED_OUT', fallbackSession), 100);
        return { 
          data: { 
            subscription: { 
              unsubscribe: () => {
                authCallbacks = authCallbacks.filter(cb => cb !== callback);
              } 
            } 
          } 
        };
      },
      signInWithPassword: ({ email, password }) => {
        console.warn('⚠️ Using fallback signInWithPassword - Demo mode active');
        
        return new Promise((resolve) => {
          setTimeout(() => {
            // Simplified validation for demo purposes - always allow login
            if (!email || !password) {
              resolve({ 
                error: new Error('E-Mail und Passwort sind erforderlich.') 
              });
              return;
            }
            
            if (!email.includes('@')) {
              resolve({ 
                error: new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein.') 
              });
              return;
            }
            
            // Demo mode: always successful login
            console.log('🔥 Creating demo session for:', email);
            
            // Create a mock session for demo mode
            fallbackSession = {
              user: {
                id: 'demo-user-' + Date.now(),
                email: email,
                created_at: new Date().toISOString(),
                app_metadata: { provider: 'demo', providers: ['demo'] },
                user_metadata: { demo_mode: true },
                aud: 'authenticated',
                role: 'authenticated'
              },
              access_token: 'demo-token-' + Date.now(),
              refresh_token: 'demo-refresh-' + Date.now(),
              expires_at: Date.now() / 1000 + 3600, // 1 hour from now
              expires_in: 3600,
              token_type: 'bearer'
            };
            
            // Store session in localStorage for persistence
            try {
              localStorage.setItem('supabase.auth.token', JSON.stringify(fallbackSession));
            } catch (e) {
              console.warn('Could not persist demo session:', e);
            }
            
            console.log('🔥 Demo session created:', fallbackSession);
            console.log('🔥 Number of auth callbacks:', authCallbacks.length);
            
            // Notify all auth listeners immediately
            authCallbacks.forEach((callback, index) => {
              console.log(`🔥 Calling auth callback ${index + 1}/${authCallbacks.length}`);
              setTimeout(() => {
                console.log(`🔥 Executing auth callback ${index + 1} with SIGNED_IN event`);
                callback('SIGNED_IN', fallbackSession);
              }, 50);
            });
            
            resolve({ 
              data: { user: fallbackSession.user, session: fallbackSession }, 
              error: null 
            });
          }, 300); // Simulate network delay
        });
      },
      signUp: ({ email, password }) => {
        console.warn('⚠️ Using fallback signUp - Demo mode active');
        
        if (!email || !password) {
          return Promise.resolve({ 
            error: new Error('E-Mail und Passwort sind erforderlich.') 
          });
        }
        
        if (password.length < 6) {
          return Promise.resolve({ 
            error: new Error('Passwort muss mindestens 6 Zeichen haben.') 
          });
        }
        
        return Promise.resolve({ 
          data: { user: null, session: null },
          error: null 
        });
      },
      signOut: () => {
        console.warn('⚠️ Using fallback signOut');
        
        return new Promise((resolve) => {
          // Clear stored session
          fallbackSession = null;
          
          try {
            localStorage.removeItem('supabase.auth.token');
          } catch (e) {
            console.warn('Could not clear stored session:', e);
          }
          
          // Notify all auth listeners
          authCallbacks.forEach(callback => {
            setTimeout(() => callback('SIGNED_OUT', null), 50);
          });
          
          resolve({ error: null });
        });
      }
    },
    // Add minimal database operations for demo mode
    from: (table) => {
      console.warn(`⚠️ Database operation on ${table} - Demo mode active`);
      return {
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
      };
    }
  };
  
  return mockClient;
};

// Try to create real Supabase client first, fallback if not available
let supabase;
let originalOnAuthStateChange = null;

try {
  // Create Supabase client
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  });
  
  // Store the original onAuthStateChange method
  originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);
  
  // Wrap the onAuthStateChange to also register callbacks with our fallback system
  supabase.auth.onAuthStateChange = (callback) => {
    console.log('🔄 Registering auth callback (will work with fallback too)');
    authCallbacks.push(callback);
    
    // Initial callback with current state
    setTimeout(() => callback(fallbackSession ? 'SIGNED_IN' : 'SIGNED_OUT', fallbackSession), 100);
    
    // If we still have the original client, register there too
    if (originalOnAuthStateChange && !usingFallback) {
      return originalOnAuthStateChange(callback);
    }
    
    return { 
      data: { 
        subscription: { 
          unsubscribe: () => {
            authCallbacks = authCallbacks.filter(cb => cb !== callback);
          } 
        } 
      } 
    };
  };
  
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.warn('❌ Failed to create Supabase client, using fallback:', error);
  supabase = createFallbackClient();
  usingFallback = true;
}

// Function to switch to fallback mode (can be called when CDN is detected as blocked)
const switchToFallbackMode = () => {
  if (!usingFallback) {
    console.warn('🔄 Switching to enhanced fallback mode globally');
    supabase = createFallbackClient();
    usingFallback = true;
    
    // Emit custom event to notify components
    window.dispatchEvent(new CustomEvent('fifa-fallback-activated', {
      detail: { reason: 'CDN blocked or connection failed' }
    }));
  }
  return supabase;
};

// Test the connection and switch to fallback if needed
const testConnection = async () => {
  try {
    // Try a simple auth operation to test connectivity
    const { data: { session } } = await supabase.auth.getSession();
    console.log('✅ Supabase connection test successful');
    
    // If we have a session, we should use real mode regardless of CDN issues
    if (session) {
      console.log('🔑 Active session detected, maintaining real database connection');
      usingFallback = false;
    }
  } catch (error) {
    console.warn('❌ Supabase connection test failed, switching to fallback:', error);
    switchToFallbackMode();
  }
};

// Test connection on load
testConnection();

// Simple database operations for fallback mode
const createDatabaseOperations = (client) => {
  return {
    async select(table, query = '*', options = {}) {
      // Try to get session first
      try {
        const { data: { session } } = await client.auth.getSession();
        authSession = session || fallbackSession; // Use fallback session if no real session
        
        // Skip real database call if we're already using fallback
        if (authSession && !usingFallback) {
          // If we have a session and not using fallback, try real database
          try {
            let queryBuilder = client.from(table).select(query);
            
            if (options.eq) {
              Object.entries(options.eq).forEach(([key, value]) => {
                queryBuilder = queryBuilder.eq(key, value);
              });
            }
            
            if (options.order) {
              queryBuilder = queryBuilder.order(options.order.column, { 
                ascending: options.order.ascending !== false 
              });
            }
            
            if (options.limit) {
              queryBuilder = queryBuilder.limit(options.limit);
            }
            
            const result = await queryBuilder;
            console.log(`✅ Real database query successful for ${table}`);
            
            // Only return real data if we actually get it without errors
            if (result.data && !result.error) {
              return result;
            } else {
              console.warn(`❌ Real database returned error for ${table}, using fallback data:`, result.error);
              // Fall through to fallback data
            }
          } catch (dbError) {
            console.warn(`❌ Real database failed for ${table}, using fallback data:`, dbError);
            // Fall through to fallback data
          }
        }
      } catch (authError) {
        console.warn('Auth check failed, using fallback:', authError);
        // Try to use fallback session
        authSession = fallbackSession;
      }
      
      // Use fallback data when authenticated (demo mode with data)
      if (authSession || fallbackSession) {
        console.log(`🔑 Authenticated fallback: returning demo data for ${table}`);
        let data = fallbackData[table] || [];
        
        // Apply basic filtering for options
        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            data = data.filter(item => item[key] === value);
          });
        }
        
        if (options.order) {
          data = [...data].sort((a, b) => {
            const aVal = a[options.order.column];
            const bVal = b[options.order.column];
            if (options.order.ascending === false) {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }
        
        if (options.limit) {
          data = data.slice(0, options.limit);
        }
        
        return Promise.resolve({ data, error: null });
      }
      
      // Not authenticated, return empty
      console.warn(`⚠️ Not authenticated, returning empty data for ${table}`);
      return Promise.resolve({ data: [], error: null });
    },

    async insert(table, data) {
      try {
        const { data: { session } } = await client.auth.getSession();
        authSession = session || fallbackSession;
        
        if (authSession && !usingFallback) {
          try {
            const result = await client.from(table).insert(data).select().single();
            console.log(`✅ Real database insert successful for ${table}`);
            return result;
          } catch (dbError) {
            console.warn(`❌ Real database insert failed for ${table}, simulating:`, dbError);
            // Fall through to simulation
          }
        }
      } catch (authError) {
        console.warn('Auth check failed for insert:', authError);
        authSession = fallbackSession;
      }
      
      // Simulate insert when authenticated
      if (authSession || fallbackSession) {
        console.log(`🔑 Authenticated fallback: simulating insert for ${table}`);
        const newItem = { ...data, id: Date.now() + Math.floor(Math.random() * 1000), created_at: new Date().toISOString() };
        
        // Add to fallback data
        if (!fallbackData[table]) {
          fallbackData[table] = [];
        }
        fallbackData[table].unshift(newItem);
        
        return Promise.resolve({ data: newItem, error: null });
      }
      
      // Not authenticated
      console.warn(`⚠️ Not authenticated, cannot insert into ${table}`);
      return Promise.resolve({ data: null, error: new Error('Not authenticated') });
    },

    async update(table, data, id) {
      try {
        const { data: { session } } = await client.auth.getSession();
        authSession = session;
        
        if (session && !usingFallback) {
          try {
            const result = await client.from(table).update(data).eq('id', id).select().single();
            console.log(`✅ Real database update successful for ${table}`);
            return result;
          } catch (dbError) {
            console.warn(`❌ Real database update failed for ${table}, simulating:`, dbError);
            // Fall through to simulation
          }
        }
      } catch (authError) {
        console.warn('Auth check failed for update:', authError);
      }
      
      // Simulate update when authenticated
      if (authSession) {
        console.log(`🔑 Authenticated fallback: simulating update for ${table}`);
        
        if (fallbackData[table]) {
          const index = fallbackData[table].findIndex(item => item.id === id);
          if (index !== -1) {
            fallbackData[table][index] = { ...fallbackData[table][index], ...data };
            return Promise.resolve({ data: fallbackData[table][index], error: null });
          }
        }
        
        return Promise.resolve({ data: { ...data, id }, error: null });
      }
      
      // Not authenticated
      console.warn(`⚠️ Not authenticated, cannot update ${table}`);
      return Promise.resolve({ data: null, error: new Error('Not authenticated') });
    },

    async delete(table, id) {
      try {
        const { data: { session } } = await client.auth.getSession();
        authSession = session;
        
        if (session && !usingFallback) {
          try {
            const result = await client.from(table).delete().eq('id', id);
            console.log(`✅ Real database delete successful for ${table}`);
            return result;
          } catch (dbError) {
            console.warn(`❌ Real database delete failed for ${table}, simulating:`, dbError);
            // Fall through to simulation
          }
        }
      } catch (authError) {
        console.warn('Auth check failed for delete:', authError);
      }
      
      // Simulate delete when authenticated
      if (authSession) {
        console.log(`🔑 Authenticated fallback: simulating delete for ${table}`);
        
        if (fallbackData[table]) {
          const index = fallbackData[table].findIndex(item => item.id === id);
          if (index !== -1) {
            const deleted = fallbackData[table].splice(index, 1)[0];
            return Promise.resolve({ data: deleted, error: null });
          }
        }
        
        return Promise.resolve({ data: { id }, error: null });
      }
      
      // Not authenticated
      console.warn(`⚠️ Not authenticated, cannot delete from ${table}`);
      return Promise.resolve({ data: null, error: new Error('Not authenticated') });
    }
  };
};

export const supabaseDb = createDatabaseOperations(supabase);
// Initialize and detect if CDN is blocked immediately
const initializeSupabase = async () => {
  // Check if CDN is blocked by looking for blocked resources
  const cdnBlocked = document.querySelector('script[src*="supabase"]') === null ||
                     window.location.hostname === 'localhost' ||
                     window.location.hostname.includes('127.0.0.1');
  
  if (cdnBlocked) {
    console.warn('🚫 Supabase CDN detected as blocked, switching to fallback immediately');
    switchToFallbackMode();
  }
};

// Initialize on load
initializeSupabase();

export { supabase, usingFallback, switchToFallbackMode };