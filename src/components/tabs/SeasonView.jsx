import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import { getTeamDisplay } from '../../constants/teams';
import { getCurrentFifaVersion } from '../../utils/fifaVersionManager';
import { istLegacySaison, legacyInfo, siegeGesamt } from '../../utils/legacySaison';
import { saisonListe } from '../../utils/saisonNummern';
import LegacyHinweis from '../LegacyHinweis';

// A "Saison" == a FIFA version. Matches already carry `fifa_version`
// (legacy rows without one count as FC25), so seasons are derived purely from
// existing data — no extra table, no season_id.

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

// MVP kommt aus den Spielen dieser Saison. Die TORSCHUETZEN dagegen aus den
// Spielerzeilen (siehe unten): players.goals ist der gepflegte Stand je Saison,
// waehrend die Match-Torlisten nur so weit zurueckreichen, wie Spiele erfasst
// sind. Bei FC25 stehen dort die uebernommenen Karrierezahlen — aus den
// Torlisten kaeme eine viel zu kleine Zahl heraus.
function computeAwards(matches) {
  const motm = {};
  for (const m of matches) {
    if (m.manofthematch) motm[m.manofthematch] = (motm[m.manofthematch] || 0) + 1;
  }
  const top = (obj) => Object.entries(obj).sort((x, y) => y[1] - x[1])[0] || null;
  return { topMotm: top(motm) };
}

/** Torschuetzen EINER Saison aus den Spielerzeilen dieser Saison. */
function saisonTorschuetzen(players, version) {
  return (players || [])
    .filter((p) => (p.fifa_version || 'FC25') === version && (Number(p.goals) || 0) > 0)
    .map((p) => ({ name: p.name, goals: Number(p.goals) || 0, team: p.team }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

/**
 * Siegbilanz einer Altsaison, aus der Strichliste statt aus Spielen.
 *
 * Bewusst KEINE Punkte und keine Tordifferenz: die Ergebnisse wurden damals
 * nicht notiert, eine "0" dort waere eine Behauptung. Gezeigt wird nur, was
 * belegt ist — Siege, davon nach Verlaengerung und nach Elfmeterschiessen.
 */
function LegacySiege({ bilanz, aekName, realName }) {
  const seiten = [
    { side: 'AEK', name: aekName, farbe: 'text-system-blue', balken: 'bg-system-blue', ...bilanz.AEK },
    { side: 'Real', name: realName, farbe: 'text-system-red', balken: 'bg-system-red', ...bilanz.Real },
  ]
    .map((s) => ({ ...s, siege: siegeGesamt(s) }))
    .sort((a, b) => b.siege - a.siege);
  const spiele = seiten.reduce((s, x) => s + x.siege, 0);
  const beste = Math.max(...seiten.map((s) => s.siege), 1);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-footnote font-medium text-text-muted">Überlieferte Siege</span>
        <span className="text-caption2 text-text-tertiary num-tabular">{spiele} Spiele</span>
      </div>
      <div className="space-y-2">
        {seiten.map((s) => (
          <div key={s.side}>
            <div className="flex items-center gap-2.5">
              <TeamLogo team={s.side === 'AEK' ? 'aek' : 'real'} size="xs" />
              <span className={`text-sm font-semibold truncate min-w-0 flex-1 ${s.farbe}`}>{s.name}</span>
              <span className="stat-display text-xl num-tabular text-text-primary">{s.siege}</span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
              <div className={`h-full ${s.balken}`} style={{ width: `${(s.siege / beste) * 100}%` }} />
            </div>
            <p className="text-caption2 text-text-tertiary mt-1">
              {s.regulaer} regulär
              {s.nachVerlaengerung ? ` · ${s.nachVerlaengerung} n.V.` : ''}
              {s.nachElfmeter ? ` · ${s.nachElfmeter} n.E.` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeasonView({ matches, players, aekName, realName }) {
  const currentVersion = getCurrentFifaVersion();

  // Seasons = the FIFA versions that appear in the data (plus the current one),
  // ordered oldest→newest so FC25 = Saison 1, FC26 = Saison 2, …
  const seasons = useMemo(
    () => saisonListe(matches, players, currentVersion),
    [matches, players, currentVersion]
  );

  const [selected, setSelected] = useState(currentVersion);
  const current = seasons.find((s) => s.version === selected) || seasons[seasons.length - 1];

  const seasonMatches = useMemo(
    () => (matches || []).filter((m) => (m.fifa_version || 'FC25') === current?.version),
    [matches, current]
  );

  const { A, R } = useMemo(() => computeStandings(seasonMatches), [seasonMatches]);
  const awards = useMemo(() => computeAwards(seasonMatches), [seasonMatches]);
  const torschuetzen = useMemo(
    () => saisonTorschuetzen(players, current?.version),
    [players, current]
  );

  if (!matches) {
    return <div className="text-center py-16 text-text-muted">Lade Saison…</div>;
  }

  const total = seasonMatches.length;
  const legacy = istLegacySaison(current?.version);
  const legacyBilanz = legacyInfo(current?.version)?.bilanz || null;
  const isActive = current?.version === currentVersion;
  const leader = A.pts === R.pts ? null : (A.pts > R.pts ? 'AEK' : 'Real');

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
          value={current?.version || ''}
          onChange={(e) => setSelected(e.target.value)}
          className="form-input flex-1 max-w-[62%]"
        >
          {seasons.map((s) => (
            <option key={s.version} value={s.version}>
              {s.label}{s.version === currentVersion ? ' · aktuell' : ''}
            </option>
          ))}
        </select>
        {/* "Läuft" waere fuer eine Legacy-Saison falsch, auch wenn man sie
            gerade ausgewaehlt hat — gespielt wird darin nicht mehr. */}
        <span className={`text-footnote font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
          legacy ? 'bg-system-yellow/15 text-system-yellow'
                 : isActive ? 'bg-system-green/15 text-system-green'
                 : 'bg-text-tertiary/15 text-text-secondary'
        }`}>
          {legacy ? 'Archiv' : isActive ? 'Läuft' : 'Beendet'}
        </span>
      </div>

      {/* Matchup subtitle (version-specific team names) */}
      <div className="text-center text-footnote text-text-tertiary -mt-1">
        {getTeamDisplay('AEK', current?.version)} <span className="text-text-muted">vs</span> {getTeamDisplay('Real', current?.version)}
      </div>

      {/* Standings — in einer Legacy-Saison gaebe die Tabelle nur 0/0/0/0 aus.
          Eine Nullzeile behauptet "null Siege", richtig ist "nicht erfasst".
          Bewusst die kompakte Zeile: der ausfuehrliche Hinweis steht schon ganz
          oben, sobald die Legacy-Saison die laufende ist. */}
      {legacy ? (
        <div className="modern-card p-4">
          {/* Manche Altsaisons haben immerhin die Siege ueberliefert (FC16).
              Dann ist eine echte Tabelle moeglich — nur ohne Tordifferenz und
              Punkte, weil niemand die Ergebnisse notiert hat. */}
          {legacyBilanz ? <LegacySiege bilanz={legacyBilanz} aekName={aekName} realName={realName} /> : null}
          <LegacyHinweis version={current?.version} kompakt
                         className={legacyBilanz ? 'mt-3 pt-3 border-t border-border-light' : ''} />
        </div>
      ) : (
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
          <div className="text-[11px] text-text-tertiary mt-2">
            {total} {total === 1 ? 'Spiel' : 'Spiele'} in dieser Saison
          </div>
        </div>
      )}

      {legacy ? null : total === 0 ? (
        <p className="text-center text-footnote text-text-tertiary py-4">
          Für diese Saison sind noch keine Spiele erfasst.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="modern-card p-4">
            <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
              <Icon name="trophy" size={15} strokeWidth={2.2} className="text-system-yellow" />
              {isActive ? 'Führung' : 'Meister'}
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
            {torschuetzen[0]
              ? <span className="text-callout font-bold text-text-primary truncate block">{torschuetzen[0].name} <span className="text-text-tertiary font-medium">({torschuetzen[0].goals})</span></span>
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
      )}

      {/* Torschützenliste der Saison — aus den Spielerzeilen dieser Saison,
          also inklusive der übernommenen Zahlen aus der Zeit vor dem Tracker. */}
      {torschuetzen.length > 0 && (
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-2">
            <Icon name="football" size={15} strokeWidth={2.2} className="text-system-green" />
            Torschützen · Saison {current?.number}
            <span className="ml-auto text-caption2 text-text-tertiary num-tabular">
              {torschuetzen.reduce((s, p) => s + p.goals, 0)} Tore gesamt
            </span>
          </div>
          <div className="space-y-1.5">
            {torschuetzen.slice(0, 8).map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex items-center gap-2.5">
                <span className="w-4 text-caption2 text-text-tertiary num-tabular flex-shrink-0">{i + 1}.</span>
                <TeamLogo team={p.team === 'AEK' ? 'aek' : p.team === 'Real' ? 'real' : 'aek'} size="xs" />
                <span className="text-sm text-text-primary truncate min-w-0 flex-1">{p.name}</span>
                <div className="hidden min-[380px]:block flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden max-w-[6rem]">
                  <div className="h-full bg-system-green/70"
                    style={{ width: `${(p.goals / torschuetzen[0].goals) * 100}%` }} />
                </div>
                <span className="stat-display text-[15px] text-text-primary w-12 text-right flex-shrink-0">{p.goals}</span>
              </div>
            ))}
          </div>
          {torschuetzen.length > 8 && (
            <p className="text-caption2 text-text-tertiary mt-2">
              … und {torschuetzen.length - 8} weitere mit Toren.
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-text-tertiary text-center">
        Saisons entsprechen den FIFA-Versionen. Neue Spiele zählen automatisch zur aktuellen Version ({currentVersion}); eine neue Version (z.&nbsp;B. FC27) startet die nächste Saison.
      </p>
    </div>
  );
}
