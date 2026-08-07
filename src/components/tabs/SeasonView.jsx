import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import { getTeamDisplay } from '../../constants/teams';
import { getCurrentFifaVersion } from '../../utils/fifaVersionManager';
import { istLegacySaison, legacyInfo, siegeGesamt } from '../../utils/legacySaison';
import { saisonListe } from '../../utils/saisonNummern';
import LegacyHinweis from '../LegacyHinweis';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { istArchiv } from '../../utils/laufendeSaison';

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
  const spiele = bilanz.spiele ?? seiten.reduce((s, x) => s + x.siege, 0);
  const beste = Math.max(...seiten.map((s) => s.siege), 1);

  // Je Saison ist unterschiedlich viel ueberliefert: FIFA 16 hat die
  // Aufschluesselung nach Verlaengerung und Elfmeterschiessen, die uebrigen
  // dafuer die Tore. Gezeigt wird, was da ist — nichts wird ergaenzt.
  const zusatz = (s) => {
    const teile = [];
    if (s.regulaer != null) teile.push(`${s.regulaer} regulär`);
    if (s.nachVerlaengerung) teile.push(`${s.nachVerlaengerung} n.V.`);
    if (s.nachElfmeter) teile.push(`${s.nachElfmeter} n.E.`);
    if (s.tore != null) teile.push(`${s.tore} Tore`);
    return teile.join(' · ');
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-footnote font-medium text-text-muted">Überlieferte Siege</span>
        <span className="text-caption2 text-text-tertiary num-tabular">
          {spiele} Spiele{bilanz.unentschieden ? ` · ${bilanz.unentschieden} unentschieden` : ''}
        </span>
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
            {zusatz(s) && <p className="text-caption2 text-text-tertiary mt-1">{zusatz(s)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeasonView({ matches, players, aekName, realName }) {
  const currentVersion = getCurrentFifaVersion();

  // Auszeichnungen, Sperren und Kontostaende ueber ALLE Saisons — erst damit
  // sieht jede Saison gleich aus. Vorher gab es fuer Altsaisons nur die
  // Torschuetzen, weil die anderen Zahlen gar nicht geladen wurden.
  const { data: sdsAlle } = useSupabaseQuery('spieler_des_spiels', '*', { skipFifaFilter: true });
  const { data: bansAlle } = useSupabaseQuery('bans', '*', { skipFifaFilter: true });
  const { data: finanzenAlle } = useSupabaseQuery('finances', '*', { skipFifaFilter: true });

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
  const torschuetzen = useMemo(
    () => saisonTorschuetzen(players, current?.version),
    [players, current]
  );

  if (!matches) {
    return <div className="text-center py-16 text-text-muted">Lade Saison…</div>;
  }

  const v = current?.version;
  const sdsSaison = (sdsAlle || []).filter((x) => (x.fifa_version || 'FC25') === v);
  const sperrenSaison = (bansAlle || []).filter((x) => (x.fifa_version || 'FC25') === v);
  const kontenSaison = (finanzenAlle || []).filter((x) => (x.fifa_version || 'FC25') === v);
  const topSds = [...sdsSaison].sort((a, b) => (b.count || 0) - (a.count || 0))[0] || null;
  const sdsGesamt = sdsSaison.reduce((sum, x) => sum + (x.count || 0), 0);
  const kontoVon = (team) => kontenSaison.find((x) => x.team === team)?.balance ?? null;
  const kaderwert = (team) => (players || [])
    .filter((p) => (p.fifa_version || 'FC25') === v && p.team === team)
    .reduce((sum, p) => sum + (Number(p.value) || 0), 0);

  // Sieger: aus den Spielen, wenn es welche gibt, sonst aus der ueberlieferten
  // Bilanz. Nur so hat jede Saison einen — auch die reinen Zahlen-Saisons.
  const bilanzInfo = legacyInfo(current?.version)?.bilanz || null;
  const siegerAusSpielen = A.pts === R.pts ? null : (A.pts > R.pts ? 'AEK' : 'Real');
  const siegerAusBilanz = bilanzInfo
    ? (siegeGesamt(bilanzInfo.AEK) === siegeGesamt(bilanzInfo.Real) ? null
       : siegeGesamt(bilanzInfo.AEK) > siegeGesamt(bilanzInfo.Real) ? 'AEK' : 'Real')
    : null;
  const sieger = seasonMatches.length > 0 ? siegerAusSpielen : siegerAusBilanz;
  const bestesSds = topSds;
  const kaderGroesse = (players || []).filter((p) => (p.fifa_version || 'FC25') === v).length;

  const total = seasonMatches.length;
  const legacy = istLegacySaison(current?.version);
  const legacyBilanz = legacyInfo(current?.version)?.bilanz || null;

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
        {/* Abgeschlossen ist jede Saison ausser der laufenden — auch FC25,
            obwohl es echte Einzelspiele hat. Ob die Zahlen aus Spielen oder
            aus einer Strichliste stammen, ist eine andere Frage und steht
            weiter unten. */}
        <span className={`text-footnote font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
          istArchiv(v) ? 'bg-bg-tertiary text-text-secondary'
                       : 'bg-system-green/15 text-system-green'
        }`}>
          {istArchiv(v) ? 'Archiv' : 'Läuft'}
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

      {/* Drei Kennzahlen — fuer JEDE Saison dieselben. Frueher gab es sie nur
          fuer Saisons mit Einzelspielen; Altsaisons sprangen direkt zur
          Torschuetzenliste und sahen dadurch voellig anders aus. */}
      <div className="grid grid-cols-3 gap-2">
        <div className="modern-card p-3">
          <div className="flex items-center gap-1.5 text-caption2 font-medium text-text-muted mb-1">
            <Icon name="trophy" size={13} strokeWidth={2.2} className="text-system-yellow" />
            {istArchiv(v) ? 'Sieger' : 'Führung'}
          </div>
          {sieger ? (
            <span className={`text-footnote font-bold truncate block ${
              sieger === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
              {sieger === 'AEK' ? aekName : realName}
            </span>
          ) : <span className="text-caption1 text-text-tertiary">Gleichstand</span>}
        </div>
        <div className="modern-card p-3">
          <div className="flex items-center gap-1.5 text-caption2 font-medium text-text-muted mb-1">
            <Icon name="football" size={13} strokeWidth={2.2} className="text-system-orange" />
            Torschützenkönig
          </div>
          {torschuetzen[0] ? (
            <span className="text-footnote font-bold text-text-primary truncate block">
              {torschuetzen[0].name}
              <span className="text-text-tertiary font-medium num-tabular"> {torschuetzen[0].goals}</span>
            </span>
          ) : <span className="text-caption1 text-text-tertiary">—</span>}
        </div>
        <div className="modern-card p-3">
          <div className="flex items-center gap-1.5 text-caption2 font-medium text-text-muted mb-1">
            <Icon name="star" size={13} strokeWidth={2.2} className="text-system-blue" />
            Meiste SdS
          </div>
          {bestesSds ? (
            <span className="text-footnote font-bold text-text-primary truncate block">
              {bestesSds.name}
              <span className="text-text-tertiary font-medium num-tabular"> {bestesSds.count}</span>
            </span>
          ) : <span className="text-caption1 text-text-tertiary">—</span>}
        </div>
      </div>

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

      {/* Eckdaten der Saison — auch die gab es vorher nur indirekt und nie
          fuer Altsaisons, obwohl Sperren und Kontostaende importiert sind. */}
      <div className="modern-card p-4">
        <div className="flex items-center gap-2 text-footnote font-semibold text-text-muted mb-2.5">
          <Icon name="clipboard" size={15} strokeWidth={2.2} className="text-text-tertiary" />
          Eckdaten
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Spieler</span>
            <span className="num-tabular text-text-primary">{kaderGroesse}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Sperren</span>
            <span className="num-tabular text-text-primary">{sperrenSaison.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Tore</span>
            <span className="num-tabular text-text-primary">
              {torschuetzen.reduce((sum, p) => sum + p.goals, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Auszeichnungen</span>
            <span className="num-tabular text-text-primary">{sdsGesamt}</span>
          </div>
        </div>
        {kontenSaison.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-light space-y-1.5">
            {['AEK', 'Real'].map((team) => kontoVon(team) == null ? null : (
              <div key={team} className="flex items-center gap-2.5 text-sm">
                <TeamLogo team={team === 'AEK' ? 'aek' : 'real'} size="xs" />
                <span className="flex-1 truncate text-text-secondary">
                  {getTeamDisplay(team, v)}
                </span>
                <span className="num-tabular text-text-primary">
                  {(kontoVon(team) / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio €
                </span>
                <span className="num-tabular text-caption2 text-text-tertiary w-20 text-right">
                  Kader {kaderwert(team).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-text-tertiary text-center">
        Saisons entsprechen den FIFA-Versionen. Neue Spiele zählen automatisch zur aktuellen Version ({currentVersion}); eine neue Version (z.&nbsp;B. FC27) startet die nächste Saison.
      </p>
    </div>
  );
}
