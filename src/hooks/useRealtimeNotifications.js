import { useEffect, useState } from 'react';
import { supabase, usingFallback } from '../utils/supabase';
import { triggerNotification } from '../components/NotificationSystem';
import { getPushEnabled } from '../utils/notifications';

// Cross-device notifications: subscribe to Supabase Realtime and raise a compact
// notification whenever a new match or transaction is inserted (e.g. by the other
// person). Works while the app is open/backgrounded on an installed iOS PWA.
// For delivery when the app is fully closed, a Web Push server is required
// (see docs/push-notifications-setup.md).
export function useRealtimeNotifications() {
  const [enabled, setEnabled] = useState(getPushEnabled());

  useEffect(() => {
    const onChange = () => setEnabled(getPushEnabled());
    window.addEventListener('fusta-push-changed', onChange);
    return () => window.removeEventListener('fusta-push-changed', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // No Realtime in demo/offline mode
    if (usingFallback || !supabase || typeof supabase.channel !== 'function') return;

    const channel = supabase
      .channel('fusta-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (payload) => {
        triggerNotification('match-created', payload.new || {});
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        triggerNotification('transaction', payload.new || {});
      })
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch { /* ignore */ } };
  }, [enabled]);
}
