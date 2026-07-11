import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import toast from 'react-hot-toast';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { useAuth } from '../../hooks/useAuth';
import { supabaseDb } from '../../utils/supabase';
import { ADMIN_EMAIL } from '../../constants/navigation';

function parseGoals(raw) {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) || [];
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

function computeStandings(matches) {
  const A = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  const R = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const m of matches) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    A.gf += a; A.ga += b; R.gf += b; R.ga += a;
    if (a > b) { A.w++; R.l++; } else if (b > a) { R.w++; A.l++; } else { A.d++; R.d++; }
  }
  A.pts = A.w * 3 + A.d; R.pts = R.w * 3 + R.d;
  A.gd = A.gf - A.ga; R.gd = R.gf - R.ga;
  return { A, R };
}

function computeAwards(matches, resolveName) {
  const scorers = {}, motm = {};
  for (const m of matches) {
    for (const raw of [m.goalslista, m.goalslistb]) {
      for (const g of parseGoals(raw)) {
        const isObj = typeof g === 'object' && g !== null;
        const name = resolveName(isObj ? (g.player ?? g.player_id) : g);
        const cnt = isObj ? (g.count || 1) : 1;
        if (name) scorers[name] = (scorers[name] || 0) + cnt;
      }
    }
    if (m.manofthematch) motm[m.manofthematch] = (motm[m.manofthematch] || 0) + 1;
  }
  const top = (obj) => Object.entries(obj).sort((x, y) => y[1] - x[1])[0] || null;
  return { topScorer: top(scorers), topMotm: top(motm) };
}

export default function SeasonView({ matches, players, aekName, realName }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: seasons, error: seasonsError, refetch } = useSupabaseQuery('seasons', '*');
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const resolveName = useMemo(() => (idOrName) => {
    if (idOrName == null) return null;
    if (typeof idOrName === 'string' && !/^\d+$/.test(idOrName)) return idOrName;
    const p = (players || []).find((pl) => pl.id === idOrName || String(pl.id) === String(idOrName));
    return p?.name || (typeof idOrName === 'string' ? idOrName : null);
  }, [players]);

  const sortedSeasons = useMemo(
    () => [...(seasons || [])].sort((a, b) => (b.id || 0) - (a.id || 0)),
    [seasons]
  );

  const active = sortedSeasons.find((s) => s.is_active) || sortedSeasons[0] || null;
  const current = sortedSeasons.find((s) => s.id === selectedId) || active;

  const seasonMatches = useMemo(
    () => (matches || []).filter((m) => current && m.season_id === current.id),
    [matches, current]
  );

  const { A, R } = useMemo(() => computeStandings(seasonMatches), [seasonMatches]);
  const awards = useMemo(() => computeAwards(seasonMatches, resolveName), [seasonMatches, resolveName]);

  // Table not created yet → guide the user (esp. admin).
  const tableMissing = seasonsError && !seasons;
  if (tableMissing) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-blue/12 text-system-blue flex items-center justify-center">
          <Icon name="calendar" size={30} strokeWidth={1.8} />
        </div>
        <p className="text-text-muted">Saisons sind noch nicht eingerichtet.</p>
        <p className="text-footnote text-text-tertiary mt-1 max-w-xs mx-auto">
          Die Tabelle <code>seasons</code> muss in Supabase angelegt werden (siehe db/seasons.sql).
        </p>
      </div>
    );
  }

  const createSeason = async () => {
    const name = newName.trim() || `Saison ${(seasons?.length || 0) + 1}`;
    setBusy(true);
    try {
      // Neue Saison wird aktiv → alle anderen deaktivieren.
      for (const s of (seasons || [])) {
        if (s.is_active) await supabaseDb.update('seasons', { is_active: false }, s.id);
      }
      const res = await supabaseDb.insert('seasons', {
        name, start_date: new Date().toISOString().slice(0, 10), is_active: true,
      });
      if (res.error) throw res.error;
      toast.success(`„${name}" gestartet`);
      setNewName('');
      window.dispatchEvent(new CustomEvent('fusta-refresh'));
      refetch();
    } catch (e) {
      toast.error('Konnte Saison nicht anlegen: ' + (e.message || e));
    } finally { setBusy(false); }
  };

  const endSeason = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const res = await supabaseDb.update('seasons',
        { is_active: false, end_date: new Date().toISOString().slice(0, 10) }, active.id);
      if (res.error) throw res.error;
      toast.success(`„${active.name}" beendet`);
      window.dispatchEvent(new CustomEvent('fusta-refresh'));
      refetch();
    } catch (e) {
      toast.error('Konnte Saison nicht beenden: ' + (e.message || e));
    } finally { setBusy(false); }
  };

  if (!sortedSeasons.length) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-blue/12 text-system-blue flex items-center justify-center">
            <Icon name="calendar" size={30} strokeWidth={1.8} />
          </div>
          <p className="text-text-muted">Noch keine Saison angelegt.</p>
        </div>
        {isAdmin && (
          <div className="modern-card p-4 flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Saison-Name (optional)" className="form-input flex-1" />
            <button onClick={createSeason} disabled={busy} className="btn-primary whitespace-nowrap">
              Saison starten
            </button>
          </div>
        )}
      </div>
    );
  }

  const total = seasonMatches.length;
  const leader = A.pts === R.pts ? null : (A.pts > R.pts ? 'AEK' : 'Real');
  const ended = !!current?.end_date;

  const Row = ({ side, name, s }) => (
    <div className="grid grid-cols-[auto_1fr_repeat(5,minmax(0,2.2rem))] items-center gap-1 py-2 text-sm">
      <TeamLogo team={side === 'AEK' ? 'aek' : 'real'} size="xs" />
      <span className={`font-semibold truncate ${side === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>{name}</span>
      <span className="text-center tabular-nums">{s.w}</span>
      <span className="text-center tabular-nums">{s.d}</span>
      <span className="text-center tabular-nums">{s.l}</span>
      <span className="text-center tabular-nums text-text-secondary">{s.gd > 0 ? '+' : ''}{s.gd}</span>
      <span className="text-center tabular-nums font-bold">{s.pts}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Season selector + status */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={current?.id || ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="form-input flex-1 max-w-[60%]"
        >
          {sortedSeasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.is_active ? ' · läuft' : ''}</option>
          ))}
        </select>
        <span className={`text-footnote font-medium px-2.5 py-1 rounded-full ${
          ended ? 'bg-text-tertiary/15 text-text-secondary' : 'bg-system-green/15 text-system-green'
        }`}>
          {ended ? 'Beendet' : 'Läuft'}
        </span>
      </div>

      {/* Standings */}
      <div className="modern-card p-4">
        <div className="grid grid-cols-[auto_1fr_repeat(5,minmax(0,2.2rem))] gap-1 text-[10px] uppercase tracking-wide text-text-tertiary pb-1 border-b border-border-light">
          <span /><span />
          <span className="text-center">S</span>
          <span className="text-center">U</span>
          <span className="text-center">N</span>
          <span className="text-center">TD</span>
          <span className="text-center">Pkt</span>
        </div>
        {(A.pts >= R.pts)
          ? (<><Row side="AEK" name={aekName} s={A} /><Row side="Real" name={realName} s={R} /></>)
          : (<><Row side="Real" name={realName} s={R} /><Row side="AEK" name={aekName} s={A} /></>)}
        <div className="text-[11px] text-text-tertiary mt-2">{total} Spiele in dieser Saison</div>
      </div>

      {/* Awards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
            <Icon name="trophy" size={15} strokeWidth={2.2} className="text-system-yellow" />
            {ended ? 'Meister' : 'Führung'}
          </div>
          {leader ? (
            <span className={`text-callout font-bold ${leader === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
              {leader === 'AEK' ? aekName : realName}
            </span>
          ) : <span className="text-footnote text-text-tertiary">Gleichstand</span>}
        </div>
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
            <Icon name="star" size={15} strokeWidth={2.2} className="text-system-orange" />
            Torschützenkönig
          </div>
          {awards.topScorer
            ? <span className="text-callout font-bold text-text-primary truncate block">{awards.topScorer[0]} <span className="text-text-tertiary font-medium">({awards.topScorer[1]})</span></span>
            : <span className="text-footnote text-text-tertiary">—</span>}
        </div>
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
            <Icon name="star" size={15} strokeWidth={2.2} className="text-system-blue" />
            Meiste MVP
          </div>
          {awards.topMotm
            ? <span className="text-callout font-bold text-text-primary truncate block">{awards.topMotm[0]} <span className="text-text-tertiary font-medium">({awards.topMotm[1]})</span></span>
            : <span className="text-footnote text-text-tertiary">—</span>}
        </div>
      </div>

      {/* Admin management */}
      {isAdmin && (
        <div className="modern-card p-4 space-y-3">
          <div className="text-footnote font-semibold text-text-secondary">Saison verwalten</div>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Neue Saison (Name optional)" className="form-input flex-1" />
            <button onClick={createSeason} disabled={busy} className="btn-primary whitespace-nowrap">
              Starten
            </button>
          </div>
          {active && (
            <button onClick={endSeason} disabled={busy}
              className="w-full px-4 py-2 rounded-xl bg-bg-tertiary text-text-secondary font-medium hover:text-text-primary transition-colors">
              {`„${active.name}" beenden`}
            </button>
          )}
          <p className="text-[11px] text-text-tertiary">
            Neue Spiele werden automatisch der laufenden Saison zugeordnet.
          </p>
        </div>
      )}
    </div>
  );
}
