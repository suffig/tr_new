import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase';

/**
 * Die angemeldete Person — einmal geladen, von allen gelesen.
 *
 * WARUM DAS NOETIG WAR
 * useAuth() war ein gewoehnlicher Haken mit eigenem useState. Jede
 * Komponente, die ihn aufrief, legte damit ihren EIGENEN Zustand an, startete
 * bei `user = null` und fragte die Sitzung selbst nach. Gemessen: allein das
 * Oeffnen des Benutzermenues loeste vier getSession()-Aufrufe und vier
 * Abonnements aus.
 *
 * Im Demo-Modus faellt das nicht auf, weil die Antwort sofort da ist. Gegen
 * die echte Datenbank kann dazwischen ein Token-Refresh ueber Netz liegen —
 * und in diesem Fenster rendert jede dieser Komponenten mit `user = null`:
 *
 *   - useIchBin haelt Philip dann fuer keinen Admin und nennt ihn Alexander
 *   - das Profil zeigt "—" statt E-Mail und "Mitglied seit —"
 *
 * Genau diese beiden Symptome traten gemeinsam auf. Mit einer Quelle gibt es
 * das Fenster nicht mehr: der Anbieter laedt einmal, und wer danach
 * dazukommt, bekommt das fertige Ergebnis.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abgemeldet = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (abgemeldet) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_ereignis, session) => {
        if (abgemeldet) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => { abgemeldet = true; subscription.unsubscribe(); };
  }, []);

  const wert = useMemo(() => ({
    user, session, loading,
    signOut: () => supabase.auth.signOut(),
  }), [user, session, loading]);

  return <AuthContext.Provider value={wert}>{children}</AuthContext.Provider>;
}

/**
 * Ohne Anbieter im Baum faellt das hier auf einen ruhenden Zustand zurueck
 * statt zu werfen: `loading: true` heisst "noch unbekannt", und darauf
 * reagieren die Aufrufer bereits richtig — sie behaupten dann nichts.
 */
export function useAuth() {
  return useContext(AuthContext) ?? {
    user: null, session: null, loading: true, signOut: () => {},
  };
}

export default AuthContext;
