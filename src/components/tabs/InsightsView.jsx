import { useMemo } from 'react';
import Kraefteverhaeltnis from '../Kraefteverhaeltnis';

/** Dezimalzahl deutsch — dieselbe Schreibweise wie in Statistik und Duell. */
const dez = (n, stellen = 1) =>
  Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import { getTeamDisplay } from '../../constants/teams';

// Einblicke — Auswertungen aus Daten, die zwar erfasst, aber bisher nirgends
// ausgewertet wurden (Wochentag, Eigentore, Karten, Kaderwert, Sperren).
// Alles rein abgeleitet, kein zusaetzlicher Speicher noetig.

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAY_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
// Anzeige-Reihenfolge Mo–So statt der JS-Reihenfolge So–Sa
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function parseGoals(raw) {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) || [];
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

/** Ein Torlisten-Eintrag -> { name, count }. Eigentore behalten ihr Praefix. */
function goalEntries(raw) {
  return parseGoals(raw).map((g) => {
    const isObj = typeof g === 'object' && g !== null;
    return {
      name: isObj ? (g.player ?? g.player_id) : g,
      count: isObj ? (g.count || 1) : 1,
    };
  }).filter((e) => e.name != null);
}

function computeInsights(matches, players, bans) {
  const list = matches || [];

  // --- Wochentags-Rhythmus -------------------------------------------------
  const byDay = WEEK_ORDER.map((d) => ({
    day: d, label: WEEKDAYS[d], long: WEEKDAY_LONG[d],
    games: 0, goals: 0, aekWins: 0, realWins: 0, draws: 0,
  }));
  const dayIndex = Object.fromEntries(byDay.map((b, i) => [b.day, i]));

  // --- Torschuetzen-Wirkung + Eigentore ------------------------------------
  const scorer = {};          // name -> { games, wins, draws, goals, team }
  const ownGoals = { AEK: 0, Real: 0 };
  let ownGoalMatches = 0;

  // --- Karten ---------------------------------------------------------------
  const cards = { AEK: { yellow: 0, red: 0 }, Real: { yellow: 0, red: 0 } };

  for (const m of list) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    const outcome = a > b ? 'AEK' : b > a ? 'Real' : 'draw';

    const d = m.date ? new Date(m.date) : null;
    if (d && !isNaN(d)) {
      const slot = byDay[dayIndex[d.getDay()]];
      if (slot) {
        slot.games++; slot.goals += a + b;
        if (outcome === 'AEK') slot.aekWins++;
        else if (outcome === 'Real') slot.realWins++;
        else slot.draws++;
      }
    }

    cards.AEK.yellow += m.yellowa || 0; cards.AEK.red += m.reda || 0;
    cards.Real.yellow += m.yellowb || 0; cards.Real.red += m.redb || 0;

    // Torschuetzen dieses Spiels (je Spieler nur EINMAL pro Spiel zaehlen)
    let hadOwnGoal = false;
    const scorersThisMatch = new Map();   // name -> { count, team }
    for (const [raw, team] of [[m.goalslista, 'AEK'], [m.goalslistb, 'Real']]) {
      for (const e of goalEntries(raw)) {
        const name = String(e.name);
        if (name.startsWith('Eigentore_')) {
          // "Eigentore_AEK" = von AEK ins eigene Tor, liegt in Reals Liste.
          const culprit = name.replace('Eigentore_', '');
          if (ownGoals[culprit] !== undefined) ownGoals[culprit] += e.count;
          hadOwnGoal = true;
          continue;
        }
        const prev = scorersThisMatch.get(name) || { count: 0, team };
        prev.count += e.count;
        scorersThisMatch.set(name, prev);
      }
    }
    if (hadOwnGoal) ownGoalMatches++;

    for (const [name, info] of scorersThisMatch) {
      const s = scorer[name] || (scorer[name] = { games: 0, wins: 0, draws: 0, goals: 0, team: info.team });
      s.games++; s.goals += info.count;
      if (outcome === info.team) s.wins++;
      else if (outcome === 'draw') s.draws++;
    }
  }

  const totalGames = list.length;
  const teamWins = { AEK: 0, Real: 0 };
  let draws = 0;
  for (const m of list) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    if (a > b) teamWins.AEK++; else if (b > a) teamWins.Real++; else draws++;
  }

  // Nur Spieler mit genug Spielen, sonst ist die Quote Zufall
  const MIN_GAMES = 3;
  const scorerImpact = Object.entries(scorer)
    .filter(([, s]) => s.games >= MIN_GAMES)
    .map(([name, s]) => ({
      name, ...s,
      winRate: s.games ? (s.wins / s.games) * 100 : 0,
      // Vergleich gegen die Gesamtquote des Teams
      baseline: totalGames ? (teamWins[s.team] / totalGames) * 100 : 0,
    }))
    .sort((x, y) => y.winRate - x.winRate || y.games - x.games);

  // --- Kaderwert vs. Bilanz -------------------------------------------------
  const squad = { AEK: 0, Real: 0 };
  for (const p of players || []) {
    if (squad[p.team] !== undefined) squad[p.team] += p.value || 0;
  }
  const value = ['AEK', 'Real'].map((t) => ({
    team: t,
    squadValue: squad[t],
    wins: teamWins[t],
    winRate: totalGames ? (teamWins[t] / totalGames) * 100 : 0,
    costPerWin: teamWins[t] > 0 ? squad[t] / teamWins[t] : null,
  }));

  // --- Sperren-Bilanz -------------------------------------------------------
  // Bewusst deskriptiv: bans tragen weder Datum noch match_id, ein kausaler
  // "Effekt auf Ergebnisse" liesse sich daraus nicht ehrlich berechnen.
  const banStats = { AEK: { count: 0, games: 0, reasons: {} }, Real: { count: 0, games: 0, reasons: {} } };
  for (const b of bans || []) {
    const t = banStats[b.team];
    if (!t) continue;
    t.count++;
    t.games += b.totalgames || 0;
    const r = b.type || b.reason || 'Sonstige';
    t.reasons[r] = (t.reasons[r] || 0) + 1;
  }

  const activeDays = byDay.filter((d) => d.games > 0);
  const busiestDay = activeDays.slice().sort((x, y) => y.games - x.games)[0] || null;
  const richestDay = activeDays.slice().sort((x, y) => (y.goals / y.games) - (x.goals / x.games))[0] || null;

  // --- Haeufigste Ergebnisse ------------------------------------------------
  // Immer in der Reihenfolge AEK:Real, sonst waeren 3:1 und 1:3 ein Topf.
  const ergebnisse = new Map();
  for (const m of list) {
    const key = `${m.goalsa || 0}:${m.goalsb || 0}`;
    ergebnisse.set(key, (ergebnisse.get(key) || 0) + 1);
  }
  const topErgebnisse = [...ergebnisse.entries()]
    .map(([ergebnis, anzahl]) => ({ ergebnis, anzahl, anteil: anzahl / (totalGames || 1) }))
    .sort((x, y) => y.anzahl - x.anzahl || x.ergebnis.localeCompare(y.ergebnis))
    .slice(0, 6);

  // --- Tore je Spiel --------------------------------------------------------
  const torSummen = list.map((m) => (m.goalsa || 0) + (m.goalsb || 0));
  const maxTore = torSummen.length ? Math.max(...torSummen) : 0;
  const torHistogramm = [];
  for (let i = 0; i <= maxTore; i++) {
    torHistogramm.push({ tore: i, anzahl: torSummen.filter((t) => t === i).length });
  }
  const schnittTore = torSummen.length
    ? torSummen.reduce((s, t) => s + t, 0) / torSummen.length
    : 0;
  // Median statt nur Mittelwert: ein einzelnes 7:5 verschiebt den Schnitt
  // spuerbar, der Median sagt, wie ein typisches Spiel aussieht.
  const sortiert = [...torSummen].sort((a, b) => a - b);
  const medianTore = sortiert.length
    ? (sortiert.length % 2
      ? sortiert[(sortiert.length - 1) / 2]
      : (sortiert[sortiert.length / 2 - 1] + sortiert[sortiert.length / 2]) / 2)
    : 0;

  // --- Serien ---------------------------------------------------------------
  // Chronologisch, sonst haengt die laengste Serie an der Sortierung der Liste.
  const chrono = [...list].sort((x, y) => new Date(x.date || 0) - new Date(y.date || 0));
  const serien = { AEK: null, Real: null };
  for (const team of ['AEK', 'Real']) {
    const beste = { zuNull: 0, ungeschlagen: 0, siege: 0 };
    const laufend = { zuNull: 0, ungeschlagen: 0, siege: 0 };
    for (const m of chrono) {
      const eigene = team === 'AEK' ? (m.goalsa || 0) : (m.goalsb || 0);
      const gegen = team === 'AEK' ? (m.goalsb || 0) : (m.goalsa || 0);

      laufend.zuNull = gegen === 0 ? laufend.zuNull + 1 : 0;
      laufend.ungeschlagen = eigene >= gegen ? laufend.ungeschlagen + 1 : 0;
      laufend.siege = eigene > gegen ? laufend.siege + 1 : 0;

      beste.zuNull = Math.max(beste.zuNull, laufend.zuNull);
      beste.ungeschlagen = Math.max(beste.ungeschlagen, laufend.ungeschlagen);
      beste.siege = Math.max(beste.siege, laufend.siege);
    }
    serien[team] = { beste, aktuell: laufend };
  }

  return {
    totalGames, teamWins, draws,
    byDay, activeDays, busiestDay, richestDay,
    scorerImpact, ownGoals, ownGoalMatches,
    cards, value, banStats,
    topErgebnisse, torHistogramm, schnittTore, medianTore, maxTore,
    serien,
  };
}

function Section({ icon, iconClass, title, hint, children }) {
  return (
    <div className="modern-card">
      <h3 className="text-title3 inline-flex items-center gap-2 mb-1">
        <Icon name={icon} size={18} strokeWidth={2.2} className={iconClass} />
        {title}
      </h3>
      {hint && <p className="text-caption1 text-text-tertiary mb-3">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

export default function InsightsView({ matches, players, bans }) {
  const r = useMemo(() => computeInsights(matches, players, bans), [matches, players, bans]);

  if (!r.totalGames) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-purple/10 text-system-purple flex items-center justify-center">
          <Icon name="bulb" size={30} strokeWidth={1.8} />
        </div>
        <p className="text-text-muted">Noch keine Einblicke.</p>
        <p className="text-footnote text-text-tertiary mt-1">
          Sobald Spiele erfasst sind, entstehen hier Muster aus euren Daten.
        </p>
      </div>
    );
  }

  const maxDayGames = Math.max(...r.byDay.map((d) => d.games), 1);

  return (
    <div className="space-y-4">
      {/* 1 — Spielrhythmus nach Wochentag */}
      <Section
        icon="calendar" iconClass="text-system-blue" title="Spielrhythmus"
        hint="An welchen Tagen ihr spielt — und wie die Spiele an ihnen ausgehen."
      >
        <div className="space-y-1.5">
          {r.byDay.map((d) => {
            const share = (d.games / maxDayGames) * 100;
            const avg = d.games ? d.goals / d.games : 0;
            return (
              <div key={d.day} className="flex items-center gap-2.5">
                <span className="w-7 text-caption1 font-semibold text-text-secondary flex-shrink-0">{d.label}</span>
                <div className="flex-1 h-6 rounded-lg bg-bg-tertiary overflow-hidden relative min-w-0">
                  {d.games > 0 && (
                    <div className="h-full flex" style={{ width: `${Math.max(share, 8)}%` }}>
                      {d.aekWins > 0 && <div className="bg-system-blue h-full" style={{ flexGrow: d.aekWins }} />}
                      {d.draws > 0 && <div className="bg-text-quaternary h-full" style={{ flexGrow: d.draws }} />}
                      {d.realWins > 0 && <div className="bg-system-red h-full" style={{ flexGrow: d.realWins }} />}
                    </div>
                  )}
                </div>
                <span className="w-16 text-right text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                  {d.games > 0 ? `${d.games}× · ${dez(avg)}` : '–'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-caption2 text-text-tertiary">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-system-blue" />{getTeamDisplay('AEK')}</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-text-quaternary" />Unent.</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-system-red" />{getTeamDisplay('Real')}</span>
          <span className="ml-auto">Zahlen: Spiele · Tore/Spiel</span>
        </div>
        {(r.busiestDay || r.richestDay) && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {r.busiestDay && (
              <div className="bg-bg-tertiary rounded-xl p-3">
                <div className="text-caption2 text-text-muted">Häufigster Spieltag</div>
                <div className="text-footnote font-bold text-text-primary mt-0.5">{r.busiestDay.long}</div>
                <div className="text-caption2 text-text-tertiary num-tabular">{r.busiestDay.games} Spiele</div>
              </div>
            )}
            {r.richestDay && r.richestDay.games > 0 && (
              <div className="bg-bg-tertiary rounded-xl p-3">
                <div className="text-caption2 text-text-muted">Torreichster Tag</div>
                <div className="text-footnote font-bold text-text-primary mt-0.5">{r.richestDay.long}</div>
                <div className="text-caption2 text-text-tertiary num-tabular">
                  {dez(r.richestDay.goals / r.richestDay.games)} Tore/Spiel
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 2 — Torschützen-Wirkung */}
      <Section
        icon="zap" iconClass="text-system-orange" title="Wer entscheidet Spiele"
        hint="Siegquote des Teams in Spielen, in denen der Spieler getroffen hat (ab 3 Spielen)."
      >
        {r.scorerImpact.length > 0 ? (
          <div className="space-y-1.5">
            {r.scorerImpact.slice(0, 8).map((s) => {
              const diff = s.winRate - s.baseline;
              return (
                <div key={s.name} className="flex items-center gap-2.5 bg-bg-tertiary rounded-xl px-3 py-2">
                  <TeamLogo team={s.team === 'AEK' ? 'aek' : 'real'} size="xs" />
                  <span className="flex-1 text-sm font-medium text-text-primary truncate min-w-0">{s.name}</span>
                  <span className="text-caption2 text-text-tertiary num-tabular flex-shrink-0">{s.games} Sp.</span>
                  <span className={`stat-display text-[15px] w-12 text-right flex-shrink-0 ${
                    s.winRate >= 60 ? 'text-system-green' : s.winRate <= 35 ? 'text-system-red' : 'text-text-secondary'
                  }`}>
                    {s.winRate.toFixed(0)}%
                  </span>
                  {Math.abs(diff) >= 5 && (
                    <span className={`chip chip-sm flex-shrink-0 ${diff > 0 ? 'chip-green' : 'chip-red'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                    </span>
                  )}
                </div>
              );
            })}
            <p className="text-caption2 text-text-tertiary mt-2">
              Der Chip zeigt den Abstand zur normalen Siegquote des Teams.
            </p>
          </div>
        ) : (
          <p className="text-footnote text-text-tertiary">
            Noch kein Spieler mit mindestens 3 Toren-Spielen — die Quote wäre sonst reiner Zufall.
          </p>
        )}
      </Section>

      {/* 3 — Eigentore */}
      <Section
        icon="football" iconClass="text-system-red" title="Eigentor-Ehrentafel"
        hint="Wird seit jeher miterfasst, war aber bisher nirgends zu sehen."
      >
        {(r.ownGoals.AEK + r.ownGoals.Real) > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {['AEK', 'Real'].map((t) => (
                <div key={t} className="bg-bg-tertiary rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TeamLogo team={t === 'AEK' ? 'aek' : 'real'} size="xs" />
                    <span className="text-caption1 font-semibold text-text-secondary truncate">{getTeamDisplay(t)}</span>
                  </div>
                  <div className={`stat-display text-[26px] ${t === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                    {r.ownGoals[t]}
                  </div>
                  <div className="text-caption2 text-text-tertiary">
                    {r.ownGoals[t] === 1 ? 'Eigentor' : 'Eigentore'}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-caption2 text-text-tertiary mt-2 num-tabular">
              In {r.ownGoalMatches} von {r.totalGames} Spielen fiel mindestens ein Eigentor.
            </p>
          </>
        ) : (
          <p className="text-footnote text-text-tertiary">Noch kein einziges Eigentor. Beachtlich.</p>
        )}
      </Section>

      {/* 4 — Karten-Disziplin */}
      <Section
        icon="ban" iconClass="text-system-yellow" title="Disziplin"
        hint="Karten werden bei jedem Spiel erfasst — hier zum ersten Mal ausgewertet."
      >
        {/* Karten als Kraefteverhaeltnis statt als zwei Kacheln: die Frage
            ist "wer sammelt mehr", und die beantwortet eine geteilte Flaeche
            unmittelbar. Nebenbei loest es das Platzproblem — "Dynamo Dresden"
            passte in die halbbreite Kachel neben dem Wappen nicht hinein. */}
        <div className="divide-y divide-border-light">
          <Kraefteverhaeltnis
            label="Gelbe Karten" aek={r.cards.AEK.yellow} real={r.cards.Real.yellow}
            aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
          <Kraefteverhaeltnis
            label="Rote Karten" aek={r.cards.AEK.red} real={r.cards.Real.red}
            aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
          <Kraefteverhaeltnis
            label="Karten je Spiel" zusatz={`${r.totalGames} Spiele`}
            aek={r.totalGames ? (r.cards.AEK.yellow + r.cards.AEK.red) / r.totalGames : 0}
            real={r.totalGames ? (r.cards.Real.yellow + r.cards.Real.red) / r.totalGames : 0}
            anzeige={(n) => dez(n, 2)}
            aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
        </div>
      </Section>

      {/* 5 — Kaderwert gegen Bilanz */}
      <Section
        icon="euro" iconClass="text-system-green" title="Kaderwert gegen Bilanz"
        hint="Zahlt sich der teurere Kader aus? Kaderwert ist der heutige Stand."
      >
        <div className="divide-y divide-border-light">
          <Kraefteverhaeltnis
            label="Kaderwert" zusatz="heutiger Stand"
            aek={r.value[0]?.squadValue} real={r.value[1]?.squadValue}
            anzeige={(n) => `${dez(n)} Mio`}
            aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
          <Kraefteverhaeltnis
            label="Siege"
            aek={r.value[0]?.wins} real={r.value[1]?.wins}
            aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
        </div>
        {/* Die eigentliche Antwort auf die Frage der Ueberschrift. Sie steht
            bewusst NICHT als Balken da: "Millionen je Sieg" ist ein Preis, und
            beim Preis ist weniger besser — eine geteilte Flaeche wuerde die
            teurere Seite als die groessere zeigen und damit das Gegenteil
            nahelegen. */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border-light">
          {r.value.map((v) => (
            <div key={v.team}>
              <div className={`stat-display text-[17px] num-tabular ${
                v.team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                {v.costPerWin != null ? `${dez(v.costPerWin)} Mio` : '—'}
              </div>
              <div className="text-caption2 text-text-tertiary truncate">
                je Sieg · {getTeamDisplay(v.team)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 6 — Sperren-Bilanz */}
      <Section
        icon="warning" iconClass="text-system-orange" title="Sperren-Bilanz"
        hint="Wer fehlt häufiger — und wie viele Spiele kostet das."
      >
        {(r.banStats.AEK.count + r.banStats.Real.count) > 0 ? (
          <>
            <div className="divide-y divide-border-light">
              <Kraefteverhaeltnis
                label="Sperren"
                aek={r.banStats.AEK.count} real={r.banStats.Real.count}
                aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
              <Kraefteverhaeltnis
                label="Spiele Ausfall" zusatz="dadurch verpasst"
                aek={r.banStats.AEK.games} real={r.banStats.Real.games}
                aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
            </div>
            {/* Der haeufigste Grund je Seite — eine Zahl ist das nicht, also
                auch kein Balken. */}
            <div className="flex justify-between gap-2 mt-3">
              {['AEK', 'Real'].map((t) => {
                const grund = Object.entries(r.banStats[t].reasons).sort((x, y) => y[1] - x[1])[0];
                return (
                  <span key={t} className="min-w-0">
                    {grund
                      ? <span className="chip chip-sm chip-orange">{grund[0]}</span>
                      : <span className="text-caption2 text-text-tertiary">keine</span>}
                  </span>
                );
              })}
            </div>
            <p className="text-caption2 text-text-tertiary mt-2">
              Bewusst nur eine Bilanz: Sperren tragen kein Datum und keinen Spielbezug, ein
              belastbarer Effekt auf Ergebnisse liesse sich daraus nicht berechnen.
            </p>
          </>
        ) : (
          <p className="text-footnote text-text-tertiary">Keine Sperren in diesem Zeitraum.</p>
        )}
      </Section>

      {/* 7 — Häufigste Ergebnisse */}
      <Section
        icon="target" iconClass="text-system-teal" title="Häufigste Ergebnisse"
        hint={`Immer als ${getTeamDisplay('AEK')} : ${getTeamDisplay('Real')} gelesen — 3:1 und 1:3 sind zwei verschiedene Ergebnisse.`}
      >
        <div className="space-y-1.5">
          {r.topErgebnisse.map((e) => (
            <div key={e.ergebnis} className="flex items-center gap-2.5">
              <span className="w-12 stat-display text-[15px] text-text-primary">{e.ergebnis}</span>
              <div className="flex-1 h-2.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div className="h-full bg-system-teal"
                  style={{ width: `${(e.anzahl / r.topErgebnisse[0].anzahl) * 100}%` }} />
              </div>
              <span className="w-20 text-right text-caption2 text-text-tertiary num-tabular">
                {e.anzahl}× · {Math.round(e.anteil * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* 8 — Tore pro Spiel */}
      <Section
        icon="football" iconClass="text-system-green" title="Tore pro Spiel"
        hint="Wie torreich eure Spiele typischerweise sind."
      >
        <div className="flex items-end gap-1 h-24">
          {r.torHistogramm.map((h) => {
            const maxAnzahl = Math.max(1, ...r.torHistogramm.map((x) => x.anzahl));
            return (
              <div key={h.tore} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-caption2 text-text-tertiary num-tabular">{h.anzahl || ''}</span>
                <div className="w-full rounded-t-md bg-system-green/70"
                  style={{ height: `${Math.max(2, (h.anzahl / maxAnzahl) * 100)}%` }} />
                <span className="text-caption2 text-text-tertiary num-tabular">{h.tore}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-bg-tertiary rounded-xl p-3 text-center">
            <div className="stat-display text-lg text-text-primary">
              {r.schnittTore.toFixed(1).replace('.', ',')}
            </div>
            <div className="text-caption2 text-text-tertiary">⌀ Tore</div>
          </div>
          <div className="bg-bg-tertiary rounded-xl p-3 text-center">
            <div className="stat-display text-lg text-text-primary">
              {String(r.medianTore).replace('.', ',')}
            </div>
            <div className="text-caption2 text-text-tertiary">typisches Spiel (Median)</div>
          </div>
        </div>
        <p className="text-caption2 text-text-tertiary mt-2">
          Der Median steht daneben, weil ein einzelnes Torfestival den Durchschnitt
          spürbar anhebt, ohne dass die meisten Spiele so aussehen.
        </p>
      </Section>

      {/* 9 — Serien */}
      <Section
        icon="zap" iconClass="text-system-purple" title="Längste Serien"
        hint="Die längste Kette am Stück — chronologisch gerechnet, nicht nach Listenreihenfolge."
      >
        {/* Drei Serien-Arten nebeneinander, jede als geteilte Flaeche. Sie
            standen als zwei halbbreite Kacheln da, in denen jeweils dieselben
            drei Zeilen wiederholt wurden — vergleichen musste man quer ueber
            die Luecke zwischen den Kacheln, also genau ueber die Stelle, an
            der ein Balken die Antwort schon gibt. */}
        <div className="divide-y divide-border-light">
          {[
            { id: 'zuNull', label: 'Ohne Gegentor' },
            { id: 'ungeschlagen', label: 'Ungeschlagen' },
            { id: 'siege', label: 'Siege' },
          ].map((art) => {
            const a = r.serien.AEK, b = r.serien.Real;
            // "Laeuft noch" heisst: die aktuelle Serie ist zugleich die
            // laengste bisher — und laenger als eins, sonst waere jedes
            // Einzelergebnis eine "Serie".
            const laeuft = [
              a.aktuell[art.id] > 1 && a.aktuell[art.id] === a.beste[art.id] ? getTeamDisplay('AEK') : null,
              b.aktuell[art.id] > 1 && b.aktuell[art.id] === b.beste[art.id] ? getTeamDisplay('Real') : null,
            ].filter(Boolean);
            return (
              <Kraefteverhaeltnis
                key={art.id}
                label={art.label}
                zusatz={laeuft.length ? `läuft gerade: ${laeuft.join(' und ')}` : 'am Stück, chronologisch'}
                aek={a.beste[art.id]} real={b.beste[art.id]}
                aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
            );
          })}
        </div>
        <p className="text-caption2 text-text-tertiary mt-2">
          Gezählt wird die längste Kette am Stück. Steht {'„läuft gerade"'} darunter,
          ist die aktuelle Serie zugleich die längste bisher.
        </p>
      </Section>
    </div>
  );
}
