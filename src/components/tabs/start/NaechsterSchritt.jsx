import { useMemo } from 'react';
import Icon from '../../icons/Icon';

/**
 * Was als Nächstes ansteht.
 *
 * Die Startseite zeigte bisher nur Zahlen — Stand, Bilanz, Kasse. Zahlen
 * sagen, wie es steht, aber nicht, was zu tun ist. Diese Karte nennt
 * konkrete offene Punkte und führt mit einem Tipp dorthin.
 *
 * NUR ECHTE LÜCKEN, KEINE ERFUNDENEN AUFGABEN
 * Jeder Hinweis hängt an einer Bedingung, die in den Daten nachweisbar ist.
 * Es gibt bewusst kein „Trag doch mal was ein" als Dauerzustand: wenn nichts
 * offen ist, verschwindet die Karte ganz. Eine Aufgabenliste, die nie leer
 * wird, liest nach einer Woche niemand mehr.
 *
 * HÖCHSTENS DREI AUF EINMAL
 * Sie steht ganz oben auf der Startseite. Sieben Hinweise dort wären eine
 * zweite Navigation, keine Hilfe.
 */

const TAG = 24 * 60 * 60 * 1000;

export default function NaechsterSchritt({ matches, players, bans, boersen, verkostungen, onNavigate }) {
  const punkte = useMemo(() => {
    const raus = [];
    const heute = Date.now();

    // 1. Wie lange ist das letzte Spiel her?
    const letzte = (matches || [])
      .map((m) => new Date(m.date).getTime())
      .filter((t) => Number.isFinite(t));
    if (letzte.length) {
      const tage = Math.floor((heute - Math.max(...letzte)) / TAG);
      // Ab zwei Wochen. Darunter ist es kein Hinweis, sondern eine
      // Feststellung — und eine, die man selbst weiss.
      if (tage >= 14) {
        raus.push({
          id: 'pause', icon: 'football', farbe: 'text-system-orange',
          titel: `Seit ${tage} Tagen kein Spiel`,
          text: 'Das letzte eingetragene Spiel liegt zwei Wochen zurück.',
          knopf: 'Zu den Spielen', ziel: 'spielbetrieb',
        });
      }
    }

    // 2. Laufende Sperren — wer fehlt beim nächsten Mal?
    const offen = (bans || []).filter(
      (b) => (Number(b.totalgames) || 0) > (Number(b.matchesserved) || 0));
    if (offen.length) {
      const namen = offen
        .map((b) => (players || []).find((p) => p.id === b.player_id)?.name)
        .filter(Boolean);
      raus.push({
        id: 'sperren', icon: 'ban', farbe: 'text-system-red',
        titel: `${offen.length} ${offen.length === 1 ? 'Spieler ist' : 'Spieler sind'} gesperrt`,
        // Namen nennen, solange es wenige sind — „2 Spieler gesperrt" zwingt
        // sonst zum Nachsehen, was der Hinweis gerade ersparen sollte.
        text: namen.length && namen.length <= 3
          ? `${namen.join(', ')} ${namen.length === 1 ? 'fehlt' : 'fehlen'} beim nächsten Spiel.`
          : 'Beim nächsten Spiel nicht aufstellbar.',
        knopf: 'Sperren ansehen', ziel: 'duell',
      });
    }

    // 3. Abend ohne Zahler — fällt still aus der Abrechnung
    const ohneZahler = (verkostungen || []).filter((v) => !v.bezahlt_von);
    if (ohneZahler.length) {
      const boerseVon = new Map((boersen || []).map((b) => [b.id, b]));
      const abend = boerseVon.get(ohneZahler[0].boerse_id);
      raus.push({
        id: 'zahler', icon: 'euro', farbe: 'text-system-yellow',
        titel: `${ohneZahler.length} ${ohneZahler.length === 1 ? 'Bier' : 'Biere'} ohne Zahler`,
        text: abend?.name
          ? `Bei „${abend.name}" fehlt die Angabe — diese Biere zählen nicht in den Ausgleich.`
          : 'Diese Biere zählen nicht in den Ausgleich.',
        knopf: 'Zur Bierbörse', ziel: 'alcohol',
      });
    }

    // 4. Spieler ohne Verein
    const heimatlos = (players || []).filter((p) => !p.team);
    if (heimatlos.length) {
      raus.push({
        id: 'ohneVerein', icon: 'users', farbe: 'text-system-blue',
        titel: `${heimatlos.length} ${heimatlos.length === 1 ? 'Spieler ohne' : 'Spieler ohne'} Mannschaft`,
        text: heimatlos.length <= 3
          ? heimatlos.map((p) => p.name).join(', ')
          : 'Sie tauchen in keiner Kaderliste auf.',
        // 'squad' ist nur ein Altname, der ueber eine Umleitung laeuft und
        // ueber onNavigate nicht zuverlaessig ankommt. Der Kader liegt im
        // Spielbetrieb.
        knopf: 'Zum Kader', ziel: 'spielbetrieb',
      });
    }

    return raus.slice(0, 3);
  }, [matches, players, bans, boersen, verkostungen]);

  // Nichts offen — dann auch keine Karte. Siehe Kopfkommentar.
  if (!punkte.length) return null;

  return (
    <div className="modern-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <span className="karten-titel">Steht an</span>
        <span className="text-caption2 text-text-tertiary">
          {punkte.length === 1 ? 'ein Punkt' : `${punkte.length} Punkte`}
        </span>
      </div>

      <div className="space-y-2">
        {punkte.map((p) => (
          <button key={p.id} type="button" onClick={() => onNavigate?.(p.ziel)}
                  className="w-full panel-gray rounded-xl p-3 flex items-start gap-2.5 text-left active:bg-bg-tertiary/60 transition-colors">
            <span className={`w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0 ${p.farbe}`}>
              <Icon name={p.icon} size={16} strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-caption1 font-semibold text-text-primary">{p.titel}</div>
              <div className="text-caption2 text-text-tertiary">{p.text}</div>
            </div>
            <span className="text-caption2 text-system-blue flex-shrink-0 flex items-center gap-0.5 mt-0.5">
              {p.knopf}
              <Icon name="chevronRight" size={13} strokeWidth={2.4} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
