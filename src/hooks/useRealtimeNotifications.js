import { useEffect } from 'react';
import { supabase, usingFallback } from '../utils/supabase';
import { triggerNotification } from '../components/NotificationSystem';
import { wasSelfInsert } from '../utils/selfActivity';

// Meldungen zwischen den Geraeten: horcht auf Supabase Realtime und meldet,
// wenn der andere etwas eintraegt.
//
// WICHTIG — hier stand vorher `if (!enabled) return`, gekoppelt an
// getPushEnabled(). Damit lief die Verbindung ueberhaupt nur, wenn Push
// erlaubt war: wer die Systemmeldungen nie eingeschaltet hatte (auf iOS geht
// das erst nach dem Ablegen auf dem Startbildschirm), bekam GAR NICHTS mit —
// nicht einmal den Hinweis in der App. Das sind zwei verschiedene Fragen:
//   * "Will ich mitbekommen, was der andere macht?"  -> immer ja, in der App
//   * "Darf das System eine Mitteilung einblenden?"  -> Push-Erlaubnis
// Die zweite Frage entscheidet NotificationSystem fuer sich (dort zusaetzlich
// nur bei verdecktem Fenster). Deshalb wird hier immer verbunden.
//
// Wenn die App ganz geschlossen ist, kommt nichts an — dafuer braeuchte es
// einen Web-Push-Server (siehe docs/push-notifications-setup.md).
export function useRealtimeNotifications() {
  useEffect(() => {
    // Im Demo-/Offline-Betrieb gibt es kein Realtime.
    if (usingFallback || !supabase || typeof supabase.channel !== 'function') return;

    const channel = supabase
      .channel('fusta-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (payload) => {
        const row = payload.new || {};
        // Das eigene Insert wurde lokal schon gemeldet — Echo verwerfen,
        // sonst bekommt der Eintragende die Meldung doppelt.
        if (wasSelfInsert('matches', row.id)) return;
        triggerNotification('match-created', row);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        const row = payload.new || {};
        if (wasSelfInsert('transactions', row.id)) return;
        triggerNotification('transaction', row);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'abend_ereignisse' }, (payload) => {
        const row = payload.new || {};
        if (wasSelfInsert('abend_ereignisse', row.id)) return;
        // Bewusst NUR das entschiedene Spielduell. Jedes Bier und jeden Shot zu
        // melden waere an einem Abend ein Dauerfeuer — und niemand muss wissen,
        // dass der andere gerade nachgeschenkt hat.
        if (row.art !== 'stern' || !row.info?.duell) return;
        triggerNotification('duell-entschieden', row);
      })
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch { /* ignore */ } };
  }, []);
}
