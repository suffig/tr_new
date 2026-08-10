import { useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import { getTeamDisplay } from '../../../constants/teams';
import { saisonListe } from '../../../utils/saisonNummern';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { spielerStatistik, MASSE, fundstuecke } from '../../../utils/spielerStatistik';
import SpielerVerlauf from './SpielerVerlauf';

/**
 * Alle Spieler über alle Saisons — nach Toren, Auszeichnungen oder Sperren.
 *
 * Dieselbe Liste, drei Blickwinkel. Vorher gab es nur die Torschützen, während
 * 1111 Auszeichnungen und 322 Sperren in der Datenbank lagen und nirgends
 * auftauchten.
 *
 * Bewusst aus den SPIELERZEILEN und den zugehoerigen Tabellen, nicht aus den
 * Torlisten der Spiele: die reichen nur bis FC25 zurueck, waehrend players und
 * spieler_des_spiels alle neun Saisons abdecken.
 */
export default function SpielerListe({ players, loading }) {
  const [mass, setMass] = useState('tore');
  const [suche, setSuche] = useState('');
  const [saison, setSaison] = useState('alle');
  const [team, setTeam] = useState('alle');
  const [sortierung, setSortierung] = useState('wert');
  const [zeigeAlle, setZeigeAlle] = useState(false);
  const [gewaehlt, setGewaehlt] = useState(null);

  const { data: sds } = useSupabaseQuery('spieler_des_spiels', '*', { skipFifaFilter: true });
  const { data: sperren } = useSupabaseQuery('bans', '*', { skipFifaFilter: true });

  const alle = useMemo(
    () => spielerStatistik({ players, sds, bans: sperren }),
    [players, sds, sperren]
  );
  const saisons = useMemo(
    () => saisonListe([], players, null).map((s) => s.version).reverse(),
    [players]
  );
  const funde = useMemo(() => fundstuecke(alle), [alle]);

  const aktuellesMass = MASSE.find((m) => m.id === mass) || MASSE[0];
  const feld = aktuellesMass.feld;

  const gefiltert = useMemo(() => {
    const suchbegriff = suche.trim().toLowerCase();
    let liste = alle;

    if (saison !== 'alle') {
      // Auf eine Saison eingeschraenkt zaehlt auch nur diese — sonst waere
      // der Filter eine Luege.
      liste = liste
        .map((p) => {
          const s = p.seasons.find((x) => x.version === saison);
          if (!s) return null;
          return { ...p, goals: s.goals, sds: s.sds, sperren: s.sperren,
                   currentTeam: s.team, seasons: [s] };
        })
        .filter(Boolean);
    }
    liste = liste.filter((p) => (p[feld] || 0) > 0);
    if (team !== 'alle') liste = liste.filter((p) => p.currentTeam === team);
    if (suchbegriff) {
      liste = liste.filter((p) =>
        p.name.toLowerCase().includes(suchbegriff) ||
        p.spellings.some((n) => n.toLowerCase().includes(suchbegriff)));
    }

    const sortierer = {
      wert: (a, b) => (b[feld] || 0) - (a[feld] || 0) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      saisons: (a, b) => b.seasons.length - a.seasons.length || (b[feld] || 0) - (a[feld] || 0),
    };
    return [...liste].sort(sortierer[sortierung] || sortierer.wert);
  }, [alle, suche, saison, team, sortierung, feld]);

  const summe = gefiltert.reduce((s, p) => s + (p[feld] || 0), 0);
  const sichtbar = zeigeAlle ? gefiltert : gefiltert.slice(0, 50);
  const beste = gefiltert[0]?.[feld] || 1;

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Lade Spieler…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Blickwinkel */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {MASSE.map((m) => (
          <button key={m.id} onClick={() => { setMass(m.id); setZeigeAlle(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
              mass === m.id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            <Icon name={m.icon} size={14} strokeWidth={2.2}
                  className={mass === m.id ? m.farbe : ''} />
            <span className="hidden min-[360px]:inline">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Icon name="search" size={16} strokeWidth={2.2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input type="search" value={suche} onChange={(e) => setSuche(e.target.value)}
               placeholder="Spieler suchen…" className="form-input w-full pl-9"
               aria-label="Spieler durchsuchen" />
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={saison} onChange={(e) => setSaison(e.target.value)}
                className="form-input flex-1 min-w-[7rem] text-sm" aria-label="Saison filtern">
          <option value="alle">Alle Saisons</option>
          {saisons.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)}
                className="form-input flex-1 min-w-[7rem] text-sm" aria-label="Team filtern">
          <option value="alle">Alle Teams</option>
          <option value="AEK">{getTeamDisplay('AEK')}</option>
          <option value="Real">{getTeamDisplay('Real')}</option>
          <option value="Ehemalige">Ehemalige</option>
        </select>
        <select value={sortierung} onChange={(e) => setSortierung(e.target.value)}
                className="form-input flex-1 min-w-[7rem] text-sm" aria-label="Sortierung">
          <option value="wert">Nach {aktuellesMass.sortLabel}</option>
          <option value="name">Nach Name</option>
          <option value="saisons">Nach Saisons</option>
        </select>
      </div>

      <div className="flex items-baseline justify-between px-1">
        <span className="text-caption1 text-text-secondary">{gefiltert.length} Spieler</span>
        <span className="text-caption1 text-text-tertiary num-tabular">
          {summe} {aktuellesMass.label}
        </span>
      </div>

      {gefiltert.length === 0 ? (
        <div className="modern-card p-8 text-center">
          <p className="text-text-muted">Niemand passt zur Auswahl.</p>
        </div>
      ) : (
        <div className="modern-card divide-y divide-border-light">
          {sichtbar.map((p, i) => (
            <button key={p.key} onClick={() => setGewaehlt(p)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-tertiary active:bg-bg-tertiary">
              <span className={`w-6 text-center text-sm font-bold flex-shrink-0 num-tabular ${
                i === 0 ? 'text-system-yellow' : i === 1 ? 'text-text-secondary'
                : i === 2 ? 'text-system-orange' : 'text-text-tertiary'}`}>
                {i + 1}
              </span>
              <SpielerWappen team={p.currentTeam} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary truncate">{p.name}</div>
                <div className="text-caption2 text-text-tertiary truncate">
                  {/* Neben dem gewaehlten Mass die beiden anderen Zahlen —
                      sonst muesste man dreimal umschalten, um einen Spieler
                      einzuschaetzen.
                      Die Zahl der Saisons stand hier als vierte Angabe und hat
                      die Zeile auf 375px ueber den Rand geschoben ("… 2 Saison"
                      abgeschnitten). Sie ist die schwaechste der vier: die
                      Detailansicht listet die Saisons ohnehin einzeln auf, und
                      der Filter darueber setzt den Zeitraum. */}
                  {[
                    mass !== 'tore' && p.goals > 0 ? `${p.goals} Tore` : null,
                    mass !== 'sds' && p.sds > 0 ? `${p.sds}× SdS` : null,
                    mass !== 'sperren' && p.sperren > 0
                      ? `${p.sperren} ${p.sperren === 1 ? 'Sperre' : 'Sperren'}` : null,
                  ].filter(Boolean).join(' · ')
                    || `${p.seasons.length} ${p.seasons.length === 1 ? 'Saison' : 'Saisons'}`}
                </div>
              </div>
              <div className="hidden min-[380px]:block w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden flex-shrink-0">
                <div className={`h-full ${aktuellesMass.balken}`}
                     style={{ width: `${((p[feld] || 0) / beste) * 100}%` }} />
              </div>
              <span className="stat-display text-[15px] num-tabular text-text-primary w-11 text-right flex-shrink-0">
                {p[feld] || 0}
              </span>
              <Icon name="chevronRight" size={14} strokeWidth={2.4}
                    className="text-text-tertiary flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {!zeigeAlle && gefiltert.length > 50 && (
        <button onClick={() => setZeigeAlle(true)} className="btn-secondary w-full">
          Alle {gefiltert.length} anzeigen
        </button>
      )}

      {/* Fundstücke — nur bei ungefilterter Liste, sonst widersprechen sie
          dem, was darüber steht. */}
      {funde.length > 0 && saison === 'alle' && team === 'alle' && !suche && (
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Icon name="sparkles" size={15} strokeWidth={2.2} className="text-system-yellow" />
            <span className="text-footnote font-semibold text-text-muted">Fundstücke</span>
          </div>
          <div className="space-y-2">
            {funde.map((f) => (
              <div key={f.id} className="flex items-start gap-2.5">
                <Icon name={f.icon} size={15} strokeWidth={2.2}
                      className={`${f.farbe} mt-0.5 flex-shrink-0`} />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text-primary">{f.titel}</span>
                  <span className="text-caption1 text-text-secondary"> — {f.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-caption2 text-text-tertiary px-1">
        Aus den Spielerzeilen aller Saisons — derselbe Spieler wird über Saisons
        und Schreibweisen hinweg zusammengefasst. Tippe auf einen Namen für
        seine Laufbahn.
      </p>

      {gewaehlt && (
        <SpielerVerlauf
          spieler={alle.find((x) => x.key === gewaehlt.key) || gewaehlt}
          sds={sds}
          sperren={sperren}
          onSchliessen={() => setGewaehlt(null)}
        />
      )}
    </div>
  );
}
