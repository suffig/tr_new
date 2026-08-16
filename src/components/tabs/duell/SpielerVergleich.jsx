import { useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import LoadingSpinner from '../../LoadingSpinner';
import { spielerStatistik } from '../../../utils/spielerStatistik';

/**
 * Zwei Spieler nebeneinander.
 *
 * WARUM NICHT DIE EINZELANSICHT ZWEIMAL
 * Die Einzelansicht beantwortet "wie gut ist der". Die Frage beim Vergleich
 * ist "wer von beiden" — und die beantwortet man nicht, indem man zwei
 * Ansichten hintereinander aufmacht und sich Zahlen merkt. Deshalb stehen
 * hier dieselben Kennzahlen in EINER Zeile, mit einem Balken, der zeigt, wie
 * das Verhältnis ist.
 *
 * DER BALKEN IST DAS VERHÄLTNIS, NICHT DIE MENGE
 * Er teilt die Breite zwischen beiden auf. 30 zu 10 Tore sehen dadurch aus
 * wie drei zu eins — was gemeint ist. Eine feste Skala hätte den Nachteil,
 * dass zwei kleine Zahlen nebeneinander gar nichts zeigen.
 *
 * KEIN GESAMTSIEGER
 * Es gibt bewusst kein "X gewinnt 3:2". Mehr Sperren sind nicht besser als
 * weniger, und ob Auszeichnungen mehr wiegen als Tore, ist eine Meinung.
 * Die Zeilen stehen nebeneinander; das Urteil bleibt beim Leser.
 */

// Bei welchen Massen ist "mehr" gut? Nur da wird der Vorsprung gruen
// hervorgehoben. Sperren zaehlen bewusst NICHT dazu.
const MASSE = [
  { id: 'goals', label: 'Tore', icon: 'football', mehrIstBesser: true },
  { id: 'sds', label: 'Spieler des Spiels', icon: 'award', mehrIstBesser: true },
  { id: 'sperren', label: 'Sperren', icon: 'ban', mehrIstBesser: false },
  { id: 'sperrSpiele', label: 'Gesperrte Spiele', icon: 'clock', mehrIstBesser: false },
  { id: 'saisons', label: 'Saisons', icon: 'calendar', mehrIstBesser: null },
];

export default function SpielerVergleich({ players, sds, bans, loading }) {
  const [linksName, setLinks] = useState(null);
  const [rechtsName, setRechts] = useState(null);
  const [suche, setSuche] = useState('');
  const [waehle, setWaehle] = useState(null);   // 'links' | 'rechts' | null

  const liste = useMemo(() => {
    // spielerStatistik nimmt EIN Objekt. Mit drei Argumenten aufgerufen
    // liefert sie still eine leere Liste — das ist mir hier schon einmal
    // passiert.
    const alle = spielerStatistik({ players: players || [], sds: sds || [], bans: bans || [] });
    return alle
      .map((p) => ({ ...p, saisons: p.seasons?.length || 0 }))
      .sort((a, b) => (b.goals || 0) - (a.goals || 0));
  }, [players, sds, bans]);

  const links = liste.find((p) => p.name === linksName) || null;
  const rechts = liste.find((p) => p.name === rechtsName) || null;

  const treffer = useMemo(() => {
    const s = suche.trim().toLowerCase();
    const raus = s ? liste.filter((p) => p.name.toLowerCase().includes(s)) : liste;
    // Den schon gewaehlten Gegenpart nicht anbieten: ein Spieler gegen sich
    // selbst ergibt lauter Gleichstaende.
    const anderer = waehle === 'links' ? rechtsName : linksName;
    return raus.filter((p) => p.name !== anderer).slice(0, 30);
  }, [liste, suche, waehle, linksName, rechtsName]);

  if (loading) return <LoadingSpinner message="Lade Spieler…" />;

  if (!liste.length) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="users" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Noch keine Spieler erfasst.</p>
      </div>
    );
  }

  const waehlen = (p) => {
    if (waehle === 'links') setLinks(p.name); else setRechts(p.name);
    setWaehle(null); setSuche('');
  };

  const Platz = ({ spieler, seite }) => (
    <button type="button" onClick={() => setWaehle(seite)}
            className={`flex-1 min-w-0 rounded-xl p-3 text-center transition-colors ${
              spieler ? 'panel-gray' : 'bg-bg-tertiary'}`}>
      {spieler ? (
        <>
          <div className="flex justify-center mb-1">
            <SpielerWappen team={spieler.team} version={spieler.seasons?.at(-1)?.version} size="sm" />
          </div>
          <div className="text-sm font-semibold text-text-primary truncate">{spieler.name}</div>
          <div className="text-caption2 text-text-tertiary truncate">
            {spieler.position || '—'} · {spieler.saisons} {spieler.saisons === 1 ? 'Saison' : 'Saisons'}
          </div>
        </>
      ) : (
        <>
          <Icon name="plus" size={20} strokeWidth={2.4} className="text-text-tertiary mx-auto mb-1" />
          <div className="text-caption1 text-text-secondary">Spieler wählen</div>
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="modern-card p-3">
        <div className="flex items-stretch gap-2">
          <Platz spieler={links} seite="links" />
          <div className="flex items-center text-caption2 font-bold text-text-tertiary">gegen</div>
          <Platz spieler={rechts} seite="rechts" />
        </div>
      </div>

      {waehle && (
        <div className="modern-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input autoFocus value={suche} onChange={(e) => setSuche(e.target.value)}
                   placeholder="Spieler suchen…" className="form-input flex-1" />
            <button type="button" onClick={() => { setWaehle(null); setSuche(''); }}
                    className="text-caption2 text-system-blue px-1">Abbrechen</button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-border-light">
            {treffer.map((p) => (
              <button key={p.name} type="button" onClick={() => waehlen(p)}
                      className="w-full flex items-center gap-2 py-2 text-left">
                <SpielerWappen team={p.team} version={p.seasons?.at(-1)?.version} size="xs" />
                <span className="text-caption1 text-text-primary truncate flex-1 min-w-0">{p.name}</span>
                <span className="text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                  {p.goals || 0} {(p.goals || 0) === 1 ? 'Tor' : 'Tore'}
                </span>
              </button>
            ))}
            {treffer.length === 0 && (
              <p className="text-caption1 text-text-tertiary py-3 text-center">Niemand gefunden.</p>
            )}
          </div>
        </div>
      )}

      {links && rechts ? (
        <div className="modern-card p-4 space-y-3">
          {MASSE.map((m) => {
            const a = Number(links[m.id]) || 0;
            const b = Number(rechts[m.id]) || 0;
            const summe = a + b;
            // Bei zwei Nullen waere die Aufteilung 0/0 — dann halbe/halbe,
            // damit kein Balken auf 100 % springt.
            const anteilA = summe ? (a / summe) * 100 : 50;
            const gleich = a === b;
            const linksVorn = a > b;
            // Gruen nur, wo mehr auch besser ist. Bei Sperren waere ein
            // gruener Vorsprung eine Auszeichnung fuers Foulen.
            const hervor = (vorn) => {
              if (gleich || m.mehrIstBesser === null) return 'text-text-primary';
              const gut = m.mehrIstBesser ? vorn : !vorn;
              return gut ? 'text-system-green font-bold' : 'text-text-secondary';
            };
            return (
              <div key={m.id}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`num-tabular text-sm w-10 ${hervor(linksVorn)}`}>{a}</span>
                  <span className="flex-1 text-center text-caption2 text-text-tertiary flex items-center justify-center gap-1">
                    <Icon name={m.icon} size={13} strokeWidth={2.2} />
                    {m.label}
                  </span>
                  <span className={`num-tabular text-sm w-10 text-right ${hervor(!linksVorn)}`}>{b}</span>
                </div>
                {/* Ein Balken, zwei Farben: die Trennlinie sitzt dort, wo das
                    Verhaeltnis liegt. */}
                <div className="h-2 rounded-full overflow-hidden flex bg-bg-tertiary">
                  <div className="h-full bg-system-blue/70" style={{ width: `${anteilA}%` }} />
                  <div className="h-full bg-system-red/70" style={{ width: `${100 - anteilA}%` }} />
                </div>
              </div>
            );
          })}

          {/* Tore je Saison — der einzige Wert, der zwei ungleich lange
              Karrieren vergleichbar macht. Wer neun Jahre dabei ist, hat
              zwangsläufig mehr Tore als jemand mit zwei. */}
          <div className="pt-2 border-t border-border-light text-caption2 text-text-tertiary">
            Tore je Saison:{' '}
            <span className="text-text-secondary font-semibold">
              {links.saisons ? ((links.goals || 0) / links.saisons).toFixed(1).replace('.', ',') : '—'}
            </span>
            {' gegen '}
            <span className="text-text-secondary font-semibold">
              {rechts.saisons ? ((rechts.goals || 0) / rechts.saisons).toFixed(1).replace('.', ',') : '—'}
            </span>
            {' — wer länger dabei ist, hat zwangsläufig mehr gesammelt.'}
          </div>
        </div>
      ) : (
        <div className="modern-card p-6 text-center">
          <p className="text-text-muted">
            {links || rechts ? 'Noch einen zweiten Spieler wählen.' : 'Zwei Spieler wählen.'}
          </p>
        </div>
      )}
    </div>
  );
}
