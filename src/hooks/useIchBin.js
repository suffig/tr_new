import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useSupabaseQuery } from './useSupabase';
import { ADMIN_EMAIL } from '../constants/navigation';

/**
 * Wer ist gerade angemeldet, und was darf er?
 *
 * WARUM ZENTRAL
 * Die Frage "ist das Philip?" stand vorher sechsmal einzeln im Code, jedes
 * Mal als `user?.email === ADMIN_EMAIL`. Und genau daran lag es, dass fast
 * nichts geschützt war: wer eine neue Ansicht baute, musste von sich aus
 * daran denken. Das ging bei der Transferbuchung schief (Geld verschieben
 * ohne Prüfung), beim Saisonwechsel und beim Echtgeld-Ausgleich.
 *
 * ZWEI VERSCHIEDENE FRAGEN, HEUTE DIESELBE ANTWORT
 * `istAdmin` heißt "darf in den Verwaltungsbereich", `darfEintragen` heißt
 * "darf Daten schreiben". Das ist derselbe Mensch, aber nicht derselbe
 * Gedanke — an der Aufrufstelle liest sich das Richtige, und wenn ihr das
 * später trennt, gibt es hier genau eine Zeile zu ändern.
 *
 * DER ABEND IST AUSGENOMMEN
 * Getränke, Bierbörse und Team-Sammlung bleiben für beide offen. Alexander
 * muss sein eigenes Bier eintragen können; eine Sperre dort hätte nur zur
 * Folge, dass er Philip bittet, es für ihn zu tun.
 *
 * DER NAME
 * Die App kennt genau zwei Menschen. Die Zuordnung E-Mail → Person ist
 * deshalb eine Fallunterscheidung und keine Tabelle: Philip ist der
 * Admin-Zugang, alles andere ist Alexander. Die Anzeigenamen kommen aus
 * `manager` (id 1 = Alexander, id 2 = Philip) — dieselbe Quelle, aus der
 * Startseite und Duell ihre Namen holen, damit nicht an einer Stelle
 * "Philip" und an der anderen die E-Mail steht.
 */
export function useIchBin() {
  const { user, loading } = useAuth();
  const { data: managers } = useSupabaseQuery('manager', '*');

  return useMemo(() => {
    // Solange die Sitzung nicht geladen ist, ist NIEMAND bekannt. Vorher
    // stand hier `istAdmin ? 'Philip' : 'Alexander'` — und weil ein noch
    // nicht geladener Nutzer kein Admin ist, hiess Philip in diesem Fenster
    // "Alexander". Ein unbekannter Mensch ist aber nicht der andere von
    // beiden, sondern unbekannt.
    const bekannt = !loading && !!user?.email;

    // Gross-/Kleinschreibung und Leerzeichen ausgleichen: die Adresse kommt
    // aus der Anmeldung und muss nicht zeichengleich mit der Konstanten
    // sein. "Philip-Melchert@live.de" ist derselbe Mensch.
    const gleich = (a, b) =>
      String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    const istAdmin = bekannt && gleich(user.email, ADMIN_EMAIL);

    const id = istAdmin ? 2 : 1;
    const ausDb = managers?.find((m) => m.id === id)?.name;

    return {
      user,
      bekannt,
      istAdmin,
      darfEintragen: istAdmin,
      // Der Abend gehört beiden — aber erst, wenn wir wissen, wer da ist.
      darfAbend: bekannt,
      // null statt eines geratenen Namens. Wer das anzeigt, blendet die
      // Begruessung so lange aus, statt den falschen Namen zu nennen.
      name: bekannt ? (ausDb || (istAdmin ? 'Philip' : 'Alexander')) : null,
      seite: istAdmin ? 'Real' : 'AEK',
      email: user?.email || null,
    };
  }, [user, loading, managers]);
}

export default useIchBin;
