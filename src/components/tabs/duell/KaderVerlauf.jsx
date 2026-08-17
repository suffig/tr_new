import { useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import LoadingSpinner from '../../LoadingSpinner';
import { spielerStatistik } from '../../../utils/spielerStatistik';

/**
 * Wer kam, wer ging, wer blieb — als Zeitleiste über alle Saisons.
 *
 * Der Kader zeigt immer nur die aktuelle Saison. Wer der Stamm ist und wer
 * nur ein Jahr blieb, sieht man daran nicht; dafür müsste man neun Saisons
 * einzeln durchklicken und sich die Namen merken.
 *
 * EIN BALKEN JE SPIELER, EIN FELD JE SAISON
 * Gefüllt heißt: in dieser Saison im Kader. Die Farbe ist die Mannschaft
 * von damals — wer gewechselt ist, sieht man am Farbwechsel mitten in der
 * Zeile, und genau das ist die interessante Stelle.
 *
 * LÜCKEN BLEIBEN LÜCKEN
 * Wer eine Saison fehlt und danach wiederkommt, bekommt keine durchgezogene
 * Leiste. Das kommt vor und ist eine Information, keine Panne.
 */

const FARBE = {
  AEK: 'bg-system-blue/70',
  Real: 'bg-system-red/70',
};

export default function KaderVerlauf({ players, loading }) {
  const [sortierung, setSortierung] = useState('dauer');

  const { saisons, zeilen } = useMemo(() => {
    const alle = spielerStatistik({ players: players || [], sds: [], bans: [] });

    // Alle vorkommenden Saisons, älteste links — eine Zeitachse liest man
    // von links nach rechts.
    const gefunden = new Set();
    for (const p of alle) for (const s of p.seasons || []) if (s.version) gefunden.add(s.version);
    const saisons = [...gefunden].sort((a, b) =>
      String(a).localeCompare(String(b), 'de', { numeric: true }));

    const zeilen = alle.map((p) => {
      const proSaison = new Map();
      for (const s of p.seasons || []) if (s.version) proSaison.set(s.version, s);
      const felder = saisons.map((v) => proSaison.get(v) || null);
      const dabei = felder.filter(Boolean).length;
      // Der erste und letzte Auftritt — daraus ergibt sich, ob jemand noch
      // aktiv ist oder vor Jahren aufgehört hat.
      const ersterIdx = felder.findIndex(Boolean);
      const letzterIdx = felder.length - 1 - [...felder].reverse().findIndex(Boolean);
      return {
        name: p.name,
        felder,
        dabei,
        tore: p.goals || 0,
        ersterIdx, letzterIdx,
        nochDabei: letzterIdx === saisons.length - 1,
        // Ein Wechsel liegt vor, wenn nicht alle belegten Felder dieselbe
        // Mannschaft tragen.
        gewechselt: new Set(felder.filter(Boolean).map((s) => s.team)).size > 1,
      };
    });

    return { saisons, zeilen };
  }, [players]);

  const sortiert = useMemo(() => {
    const liste = [...zeilen];
    if (sortierung === 'tore') return liste.sort((a, b) => b.tore - a.tore);
    if (sortierung === 'neu') return liste.sort((a, b) => b.ersterIdx - a.ersterIdx
      || b.dabei - a.dabei);
    // 'dauer': wer am längsten dabei ist, zuerst — bei Gleichstand der,
    // der noch aktiv ist.
    return liste.sort((a, b) => b.dabei - a.dabei
      || (b.nochDabei - a.nochDabei)
      || b.tore - a.tore);
  }, [zeilen, sortierung]);

  if (loading) return <LoadingSpinner message="Lade Kader…" />;

  if (saisons.length < 2) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="users" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Es braucht zwei Saisons für einen Verlauf.</p>
      </div>
    );
  }

  const stamm = zeilen.filter((z) => z.dabei === saisons.length).length;
  const einmalig = zeilen.filter((z) => z.dabei === 1).length;

  return (
    <div className="space-y-3">
      <div className="modern-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="karten-titel">Kader über die Saisons</span>
          <span className="text-caption2 text-text-tertiary">
            {zeilen.length} Spieler · {saisons.length} Saisons
          </span>
        </div>
        <p className="text-caption2 text-text-tertiary mt-0.5">
          {stamm > 0 && `${stamm} ${stamm === 1 ? 'Spieler war' : 'Spieler waren'} in jeder Saison dabei. `}
          {einmalig > 0 && `${einmalig} nur in einer.`}
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {[['dauer', 'Nach Dauer'], ['tore', 'Nach Toren'], ['neu', 'Neueste zuerst']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSortierung(id)}
                  aria-pressed={sortierung === id}
                  className={`flex-1 py-1.5 rounded-lg text-caption2 font-semibold transition-colors ${
                    sortierung === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="modern-card p-3">
        {/* Kopfzeile mit den Saisons. Waagerecht scrollbar, weil neun
            Saisons auf einem Handy nicht nebeneinanderpassen. */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex items-center gap-1 mb-1.5 pl-28">
              {saisons.map((v) => (
                <span key={v} className="w-9 text-center text-caption2 text-text-tertiary num-tabular">
                  {String(v).replace(/^FC/, '')}
                </span>
              ))}
            </div>

            <div className="space-y-1">
              {sortiert.map((z) => (
                <div key={z.name} className="flex items-center gap-1">
                  <span className="w-28 pr-2 text-caption2 text-text-primary truncate flex-shrink-0">
                    {z.name}
                  </span>
                  {z.felder.map((s, i) => (
                    <span key={i}
                          title={s ? `${saisons[i]} · ${s.team}` : `${saisons[i]} · nicht im Kader`}
                          className={`w-9 h-5 rounded flex-shrink-0 ${
                            s ? FARBE[s.team] || 'bg-text-tertiary/40' : 'bg-bg-tertiary'}`} />
                  ))}
                  <span className="pl-2 text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                    {z.tore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-border-light text-caption2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-system-blue/70" />
            <span className="text-text-secondary">Alexander</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-system-red/70" />
            <span className="text-text-secondary">Philip</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-bg-tertiary" />
            <span className="text-text-tertiary">nicht im Kader</span>
          </span>
          <span className="text-text-tertiary ml-auto">Zahl rechts: Tore</span>
        </div>
      </div>

      {/* Wechsel sind der interessante Fall — deshalb extra benannt. */}
      {zeilen.some((z) => z.gewechselt) && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-1.5">Hat die Seite gewechselt</div>
          <div className="flex flex-wrap gap-1.5">
            {zeilen.filter((z) => z.gewechselt).map((z) => (
              <span key={z.name} className="chip chip-sm chip-gray">{z.name}</span>
            ))}
          </div>
          <p className="text-caption2 text-text-tertiary mt-1.5">
            Am Farbwechsel mitten in der Zeile zu erkennen.
          </p>
        </div>
      )}
    </div>
  );
}
