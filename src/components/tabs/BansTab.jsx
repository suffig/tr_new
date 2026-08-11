import { useState, useMemo } from 'react';
import Icon from '../icons/Icon';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import { BAN_TYPES } from '../../constants/banTypes';
import HorizontalNavigation from '../HorizontalNavigation';
import TeamLogo from '../TeamLogo';

/**
 * Sperren.
 *
 * Die Seite hatte dieselbe Karte dreimal im Code stehen (aktiv, beendet,
 * gefiltert) — jede Aenderung musste an drei Stellen passieren. Jetzt gibt es
 * eine Karte.
 *
 * Ausserdem stand die Zahl der offenen Spiele dreimal in derselben Karte: im
 * Chip ("Aktiv · 3 Spiele verbleibend"), als grosse Zahl rechts und im
 * Fortschrittstext. Geblieben sind die grosse Zahl und der Fortschritt.
 *
 * Die Kartentypen kamen als Emoji (🟨🟥). Auf dem Handy brach das Paar mitten
 * im Chip auf zwei Zeilen um und der Typ-Text "Gelb-Rote Karte" stand
 * dreizeilig in einem 50px-Chip. Jetzt zeichnen wir die Karten selbst.
 *
 * Die Farben kamen aus der festen Tailwind-Palette (bg-yellow-100 …) und
 * blieben im Dunkelmodus hell.
 */

/** Spielkarten als kleine Rechtecke — kein Emoji, das umbrechen koennte. */
function SperrGlyph({ typ, size = 'md' }) {
  const h = size === 'sm' ? 'h-3.5 w-2.5' : 'h-5 w-3.5';
  if (typ === 'Verletzung') {
    return <Icon name="warning" size={size === 'sm' ? 14 : 20} strokeWidth={2.2} className="text-system-orange" />;
  }
  if (typ === 'Rote Karte') {
    return <span className={`${h} rounded-[2px] bg-system-red inline-block`} />;
  }
  if (typ === 'Gelb-Rote Karte') {
    return (
      <span className="inline-flex">
        <span className={`${h} rounded-[2px] bg-system-yellow inline-block`} />
        <span className={`${h} rounded-[2px] bg-system-red inline-block -ml-1`} />
      </span>
    );
  }
  return <Icon name="ban" size={size === 'sm' ? 14 : 20} strokeWidth={2.2} className="text-text-tertiary" />;
}

const TYP_FARBE = {
  'Gelb-Rote Karte': 'text-system-red',
  'Rote Karte': 'text-system-red',
  'Verletzung': 'text-system-orange',
};

function SperrKarte({ ban, spieler }) {
  const gesamt = ban.totalgames || 0;
  const abgesessen = ban.matchesserved || 0;
  const offen = Math.max(gesamt - abgesessen, 0);
  const aktiv = offen > 0;
  const anteil = gesamt > 0 ? Math.min((abgesessen / gesamt) * 100, 100) : 100;

  return (
    <div className={`modern-card ${aktiv ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0">
          <SperrGlyph typ={ban.type} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-text-primary truncate">{spieler?.name || 'Unbekannt'}</span>
            <TeamLogo team={spieler?.team || 'Unbekannt'} size="sm" className="flex-shrink-0" />
          </div>
          <div className={`text-caption2 ${TYP_FARBE[ban.type] || 'text-text-tertiary'}`}>{ban.type}</div>
        </div>

        {aktiv ? (
          <div className="text-center flex-shrink-0">
            <div className="stat-display text-2xl text-system-red num-tabular leading-none">{offen}</div>
            <div className="text-caption2 text-text-tertiary mt-0.5">offen</div>
          </div>
        ) : (
          <span className="chip chip-green flex-shrink-0">
            <Icon name="check" size={12} strokeWidth={2.6} />Beendet
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${aktiv ? 'bg-system-red' : 'bg-system-green'}`}
               style={{ width: `${anteil}%` }} />
        </div>
        <div className="mt-1 text-caption2 text-text-tertiary num-tabular">
          {abgesessen} von {gesamt} {gesamt === 1 ? 'Spiel' : 'Spielen'} abgesessen
        </div>
      </div>

      {ban.reason && (
        <div className="mt-2 text-footnote text-text-secondary">{ban.reason}</div>
      )}
    </div>
  );
}

export default function BansTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const [status, setStatus] = useState('aktiv');
  const [typ, setTyp] = useState('alle');

  const { data: bans, loading: bansLoading, error: bansError, refetch: refetchBans } = useSupabaseQuery('bans', '*');
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const loading = bansLoading || playersLoading;

  const spielerNach = useMemo(() => {
    const m = new Map();
    for (const p of players || []) m.set(p.id, p);
    return m;
  }, [players]);

  const offen = (b) => (b.totalgames || 0) - (b.matchesserved || 0) > 0;

  const { aktive, beendete, sichtbar } = useMemo(() => {
    const alle = bans || [];
    const aktive = alle.filter(offen);
    const beendete = alle.filter((b) => !offen(b));
    const nachStatus = status === 'aktiv' ? aktive : status === 'beendet' ? beendete : alle;
    const sichtbar = typ === 'alle' ? nachStatus : nachStatus.filter((b) => b.type === typ);
    // Offene zuerst, darin die laengsten Sperren oben — das ist die Reihenfolge,
    // in der man beim Aufstellen wissen will, wer fehlt.
    return {
      aktive, beendete,
      sichtbar: [...sichtbar].sort((a, b) =>
        ((b.totalgames || 0) - (b.matchesserved || 0)) - ((a.totalgames || 0) - (a.matchesserved || 0))),
    };
  }, [bans, status, typ]);

  if (loading) return <LoadingSpinner message="Lade Sperren..." />;

  if (bansError && !bans) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-system-red mb-4 flex justify-center">
          <Icon name="warning" size={28} strokeWidth={2} />
        </div>
        <p className="text-text-muted mb-4">Fehler beim Laden der Sperren</p>
        <button onClick={refetchBans} className="btn-primary">Erneut versuchen</button>
      </div>
    );
  }

  // Status als Segmente, Kartentyp als Auswahlfeld. Vorher war beides in einer
  // Leiste: sieben Reiter mit Zahlen in Klammern, die auf dem Handy drei
  // Reihen fuellten — obwohl "Rote Karte" und "beendet" verschiedene Fragen
  // sind und sich kombinieren lassen sollten.
  const views = [
    { id: 'aktiv', label: `Aktiv (${aktive.length})`, iconName: 'ban' },
    { id: 'beendet', label: `Beendet (${beendete.length})`, iconName: 'check' },
    { id: 'alle', label: `Alle (${bans?.length || 0})`, iconName: 'clipboard' },
  ];

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      <HorizontalNavigation views={views} selectedView={status} onViewChange={setStatus} />

      <div className="flex items-center gap-2 mb-4">
        <Icon name="filter" size={15} strokeWidth={2.2} className="text-text-tertiary flex-shrink-0" />
        <select value={typ} onChange={(e) => setTyp(e.target.value)}
                className="form-input flex-1 text-sm" aria-label="Nach Art filtern">
          <option value="alle">Alle Arten</option>
          {BAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {sichtbar.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-system-green/12 text-system-green flex items-center justify-center">
            <Icon name="check" size={26} strokeWidth={2} />
          </div>
          <h3 className="karten-titel mb-2">
            {status === 'aktiv' ? 'Keine aktiven Sperren' : 'Keine Sperren gefunden'}
          </h3>
          <p className="text-text-muted">
            {typ === 'alle' ? 'Alle sind spielberechtigt.' : 'Mit dieser Art gibt es hier nichts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sichtbar.map((ban) => (
            <SperrKarte key={ban.id} ban={ban} spieler={spielerNach.get(ban.player_id)} />
          ))}
        </div>
      )}
    </div>
  );
}
