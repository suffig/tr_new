import { useMemo, useState, useRef, useEffect } from 'react';
import Kraefteverhaeltnis from '../Kraefteverhaeltnis';
import { dez } from '../../utils/zahlen';
import toast from 'react-hot-toast';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import LoadingSpinner from '../LoadingSpinner';
import HorizontalNavigation from '../HorizontalNavigation';
import SeasonView from './SeasonView';
import RecordsView from './RecordsView';
import SpielerListe from './duell/SpielerListe';
import HallOfFame from './duell/HallOfFame';
import SpielerVergleich from './duell/SpielerVergleich';
import SperrenUebersicht from './duell/SperrenUebersicht';
import SaisonVergleich from './duell/SaisonVergleich';
import KaderVerlauf from './duell/KaderVerlauf';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { chronoAsc, chronoDesc } from '../../utils/matchChronology';
import { aggregatePlayers } from '../../utils/playerIdentity';
import { saisonNummern } from '../../utils/saisonNummern';
import { getCurrentFifaVersion } from '../../utils/fifaVersionManager';
import { LEGACY_SAISONS, siegeGesamt } from '../../utils/legacySaison';
import { istArchiv } from '../../utils/laufendeSaison';
import { spielerStatistik, summenJePerson } from '../../utils/spielerStatistik';

// goalslist entries are either a plain name string or { player_id, player, count }
function parseGoals(raw) {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) || [];
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

function computeDuel(matches, resolveName) {
  const list = matches || [];
  let aekW = 0, realW = 0, draws = 0, aekG = 0, realG = 0, prizeA = 0, prizeR = 0;
  let biggest = { margin: -1 };
  const scorers = {};

  for (const x of list) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    aekG += a; realG += b;
    prizeA += x.prizeaek || 0; prizeR += x.prizereal || 0;
    if (a > b) aekW++; else if (b > a) realW++; else draws++;

    const margin = Math.abs(a - b);
    if (margin > biggest.margin && a !== b) {
      biggest = { margin, winner: a > b ? 'AEK' : 'Real', score: `${a}:${b}`, date: x.date };
    }

    for (const [raw] of [[x.goalslista], [x.goalslistb]]) {
      for (const g of parseGoals(raw)) {
        const isObj = typeof g === 'object' && g !== null;
        const name = resolveName(isObj ? (g.player ?? g.player_id) : g);
        const cnt = isObj ? (g.count || 1) : 1;
        if (name && !String(name).startsWith('Eigentore')) scorers[name] = (scorers[name] || 0) + cnt;
      }
    }
  }

  // Order newest-first for streak & form (fall back to date if no id)
  const ordered = [...list].sort(chronoDesc);

  let streak = null, who = null, len = 0;
  for (const x of ordered) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    if (a === b) break;
    const w = a > b ? 'AEK' : 'Real';
    if (who === null) { who = w; len = 1; } else if (w === who) len++; else break;
  }
  if (who && len >= 1) streak = { who, len };

  const last10 = ordered.slice(0, 10).map((x) => {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    return a === b ? 'D' : (a > b ? 'AEK' : 'Real');
  });

  const topScorers = Object.entries(scorers)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, goals]) => ({ name, goals }));
  const topScorer = topScorers[0] || null;

  // Per-season head-to-head split (oldest → newest).
  const bySeason = {};
  for (const x of list) {
    const v = x.fifa_version || 'FC25';
    const a = x.goalsa || 0, b = x.goalsb || 0;
    const s = bySeason[v] || (bySeason[v] = { aekW: 0, realW: 0, draws: 0, aekG: 0, realG: 0 });
    if (a > b) s.aekW++; else if (b > a) s.realW++; else s.draws++;
    s.aekG += a; s.realG += b;
  }
  // Nummer kommt spaeter aus saisonNummern() — hier nur die Reihenfolge.
  // Selbst nummerieren wuerde Saisons ohne Spiele (FC15) ueberspringen und
  // FC25 hier "Saison 1", in der Saisonansicht aber "Saison 2" nennen.
  const seasonH2H = Object.entries(bySeason)
    .sort((p, q) => (parseInt(String(p[0]).replace(/\D/g, ''), 10) || 0) - (parseInt(String(q[0]).replace(/\D/g, ''), 10) || 0))
    .map(([v, s]) => ({ version: v, ...s }));

  return { total: list.length, aekW, realW, draws, aekG, realG, prizeA, prizeR, biggest, streak, last10, topScorer, topScorers, seasonH2H };
}

/**
 * Bilanz ueber WIRKLICH alle Saisons.
 *
 * Der Kopf sagte "Über alle Saisons", rechnete aber nur mit `matches` — und
 * Einzelspiele gibt es nur aus FC25 und FC26. Die sieben Altsaisons steuern
 * ihre gezaehlten Bilanzen bei; ohne sie fehlten hier ueber 800 Spiele.
 *
 * Die Herkunft wird mitgefuehrt, weil beides nicht dasselbe ist: erfasste
 * Spiele lassen sich nachschlagen, gezaehlte nicht.
 */
function gesamtBilanz(ausSpielen) {
  const g = {
    aekW: ausSpielen.aekW, realW: ausSpielen.realW, draws: ausSpielen.draws,
    total: ausSpielen.total, aekG: ausSpielen.aekG, realG: ausSpielen.realG,
    erfasst: ausSpielen.total, gezaehlt: 0,
    toreAus: ausSpielen.total > 0 ? 1 : 0, // Saisons, deren Tore mitzaehlen
    ohneBilanz: [],
  };
  for (const [version, info] of Object.entries(LEGACY_SAISONS)) {
    if (!info.bilanz) { g.ohneBilanz.push(version); continue; }
    const b = info.bilanz;
    g.aekW += siegeGesamt(b.AEK);
    g.realW += siegeGesamt(b.Real);
    g.draws += b.unentschieden || 0;
    g.total += b.spiele || 0;
    g.gezaehlt += b.spiele || 0;
    // Tore hat nicht jede Altsaison (FC16 zaehlte nur Siege).
    if (b.AEK?.tore != null && b.Real?.tore != null) {
      g.aekG += b.AEK.tore;
      g.realG += b.Real.tore;
      g.toreAus++;
    }
  }
  return g;
}

/**
 * Tore je Spiel — geteilt durch die Spiele der Saisons, deren Tore bekannt
 * sind. Sonst teilte man 6707 Tore durch 902 Spiele, obwohl aus FC15/FC16
 * keine Tore ueberliefert sind.
 */
function toreJeSpiel(g) {
  const spieleMitToren = g.erfasst + Object.values(LEGACY_SAISONS)
    .filter((i) => i.bilanz?.AEK?.tore != null)
    .reduce((s, i) => s + (i.bilanz.spiele || 0), 0);
  return spieleMitToren ? (g.aekG + g.realG) / spieleMitToren : 0;
}

/** Haeufigste Endstaende — "wie geht ein Spiel zwischen euch typischerweise aus". */
function haeufigsteErgebnisse(matches, grenze = 6) {
  const zaehler = new Map();
  for (const m of matches || []) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    const k = `${a}:${b}`;
    zaehler.set(k, (zaehler.get(k) || 0) + 1);
  }
  return [...zaehler.entries()]
    .map(([ergebnis, anzahl]) => {
      const [a, b] = ergebnis.split(':').map(Number);
      return { ergebnis, anzahl, sieger: a > b ? 'AEK' : b > a ? 'Real' : null };
    })
    .sort((x, y) => y.anzahl - x.anzahl || y.ergebnis.localeCompare(x.ergebnis))
    .slice(0, grenze);
}

/** Wie deutlich fallen Siege aus — volle Verteilung, nicht bei 3+ abgeschnitten. */
function tordifferenzen(matches) {
  const zaehler = new Map();
  for (const m of matches || []) {
    const diff = Math.abs((m.goalsa || 0) - (m.goalsb || 0));
    if (diff === 0) continue;
    const e = zaehler.get(diff) || { aek: 0, real: 0 };
    if ((m.goalsa || 0) > (m.goalsb || 0)) e.aek++; else e.real++;
    zaehler.set(diff, e);
  }
  return [...zaehler.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([diff, e]) => ({ diff, ...e, gesamt: e.aek + e.real }));
}

/** Zu-Null-Siege und laengste Siegesserie je Person. */
function serienUndZuNull(matches) {
  // chronoAsc ist ein Vergleicher, keine Sortierfunktion.
  const chrono = [...(matches || [])].sort(chronoAsc);
  const raus = {
    zuNull: { AEK: 0, Real: 0 },
    laengste: { AEK: 0, Real: 0 },
    abende: { AEK: 0, Real: 0, geteilt: 0 },
  };
  let lauf = null, laenge = 0;
  for (const m of chrono) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    if (a > b && b === 0) raus.zuNull.AEK++;
    if (b > a && a === 0) raus.zuNull.Real++;
    const sieger = a > b ? 'AEK' : b > a ? 'Real' : null;
    if (sieger && sieger === lauf) laenge++;
    else { lauf = sieger; laenge = sieger ? 1 : 0; }
    if (sieger && laenge > raus.laengste[sieger]) raus.laengste[sieger] = laenge;
  }
  // Abendbilanz: wer hat den Abend fuer sich entschieden, nicht nur Spiele.
  const proTag = {};
  for (const m of chrono) (proTag[String(m.date || '?')] ||= []).push(m);
  for (const spiele of Object.values(proTag)) {
    let a = 0, r = 0;
    for (const m of spiele) {
      if ((m.goalsa || 0) > (m.goalsb || 0)) a++;
      else if ((m.goalsb || 0) > (m.goalsa || 0)) r++;
    }
    if (a > r) raus.abende.AEK++; else if (r > a) raus.abende.Real++; else raus.abende.geteilt++;
  }
  return raus;
}


// "Abendform": win split by game number within an evening (same date, by id).
// Game 1 = sober, game 3+ = later in the evening — the beer curve, basically.
function computeEvenings(matches) {
  const byDate = {};
  for (const m of (matches || [])) {
    const key = String(m.date || '?');
    (byDate[key] = byDate[key] || []).push(m);
  }
  // Jede Position einzeln — frueher wurde ab dem dritten Spiel alles in einen
  // Topf "3+" geworfen. Damit war die eigentliche Frage nicht zu beantworten:
  // wie weit traegt die Form ueber den Abend, und wo kippt sie.
  const buckets = new Map();
  for (const games of Object.values(byDate)) {
    games.sort((p, q) => (p.id || 0) - (q.id || 0));
    games.forEach((m, i) => {
      const pos = i + 1;
      const s = buckets.get(pos) || { aekW: 0, realW: 0, draws: 0 };
      const a = m.goalsa || 0, b = m.goalsb || 0;
      if (a > b) s.aekW++; else if (b > a) s.realW++; else s.draws++;
      buckets.set(pos, s);
    });
  }
  // Nur die ersten fuenf Positionen: laenger wird ein Abend selten, und die
  // Ausreisser danach (ein einzelnes sechstes Spiel) verzerren das Bild mehr,
  // als sie erklaeren.
  return [...buckets.entries()]
    .filter(([pos]) => pos <= 5)
    .sort((a, b) => a[0] - b[0])
    .map(([pos, s]) => ({ pos, label: `Spiel ${pos}`, ...s, games: s.aekW + s.realW + s.draws }))
    .filter((b) => b.games > 0);
}

// Sum goals per player within a single match (both goalslist formats).
function matchPlayerGoals(match, resolveName) {
  const tally = {};
  for (const raw of [match.goalslista, match.goalslistb]) {
    for (const g of parseGoals(raw)) {
      const isObj = typeof g === 'object' && g !== null;
      const name = resolveName(isObj ? (g.player ?? g.player_id) : g);
      const cnt = isObj ? (g.count || 1) : 1;
      if (name && !String(name).startsWith('Eigentore')) tally[name] = (tally[name] || 0) + cnt;
    }
  }
  return tally;
}

function fmtDay(s) {
  return s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
}

// Derive achievements purely from match data (no backend).
function computeAchievements(matches, resolveName, names) {
  const list = matches || [];
  const total = list.length;
  let totalPrize = 0;
  let bestHat = null;       // { player, goals, date }
  let bestKanter = null;    // { score, winner, margin, date }
  let cleanSheet = null;    // { score, winner, date }
  let torfabrik = null;     // { score, total, date }

  for (const x of list) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    // Nur GEWONNENE Preisgelder zählen (Verlierer-Preisgeld ist negativ und
    // würde die Summe sinnlos saldieren).
    totalPrize += Math.max(0, x.prizeaek || 0) + Math.max(0, x.prizereal || 0);

    const tally = matchPlayerGoals(x, resolveName);
    for (const [player, goals] of Object.entries(tally)) {
      if (goals >= 3 && (!bestHat || goals > bestHat.goals)) bestHat = { player, goals, date: x.date };
    }

    const margin = Math.abs(a - b);
    if (a !== b && margin >= 5 && (!bestKanter || margin > bestKanter.margin)) {
      bestKanter = { score: `${a}:${b}`, winner: a > b ? 'AEK' : 'Real', margin, date: x.date };
    }
    if (a !== b && Math.min(a, b) === 0 && !cleanSheet) {
      cleanSheet = { score: `${a}:${b}`, winner: a > b ? 'AEK' : 'Real', date: x.date };
    }
    if (a + b >= 8 && (!torfabrik || a + b > torfabrik.total)) {
      torfabrik = { score: `${a}:${b}`, total: a + b, date: x.date };
    }
  }

  // Longest historical win streak (chronological by id then date).
  const chrono = [...list].sort(chronoAsc);
  let maxStreak = { who: null, len: 0 }, curWho = null, curLen = 0;
  for (const x of chrono) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    if (a === b) { curWho = null; curLen = 0; continue; }
    const w = a > b ? 'AEK' : 'Real';
    if (w === curWho) curLen++; else { curWho = w; curLen = 1; }
    if (curLen > maxStreak.len) maxStreak = { who: w, len: curLen };
  }

  const who = (t) => (t === 'AEK' ? names.aek : names.real);

  return [
    {
      id: 'hattrick', title: 'Hattrick', icon: 'football', iconClass: 'text-system-green',
      desc: '3 Tore eines Spielers in einem Match',
      unlocked: !!bestHat,
      context: bestHat ? `${bestHat.player} · ${bestHat.goals} Tore · ${fmtDay(bestHat.date)}` : null,
    },
    {
      id: 'kanter', title: 'Kantersieg', icon: 'zap', iconClass: 'text-system-orange',
      desc: 'Sieg mit 5+ Toren Abstand',
      unlocked: !!bestKanter,
      context: bestKanter ? `${bestKanter.score} · ${who(bestKanter.winner)} · ${fmtDay(bestKanter.date)}` : null,
    },
    {
      id: 'cleansheet', title: 'Zu-Null-Sieg', icon: 'trophy', iconClass: 'text-system-blue',
      desc: 'Sieg ohne Gegentor',
      unlocked: !!cleanSheet,
      context: cleanSheet ? `${cleanSheet.score} · ${who(cleanSheet.winner)} · ${fmtDay(cleanSheet.date)}` : null,
    },
    {
      id: 'streak5', title: 'Dominanz', icon: 'zap', iconClass: 'text-system-red',
      desc: '5 Siege in Folge',
      unlocked: maxStreak.len >= 5,
      context: maxStreak.who ? `Rekord: ${maxStreak.len}× · ${who(maxStreak.who)}` : null,
      progress: { current: Math.min(maxStreak.len, 5), target: 5 },
    },
    {
      id: 'torfabrik', title: 'Torfabrik', icon: 'football', iconClass: 'text-system-orange',
      desc: 'Ein Match mit 8+ Toren',
      unlocked: !!torfabrik,
      context: torfabrik ? `${torfabrik.score} · ${torfabrik.total} Tore · ${fmtDay(torfabrik.date)}` : null,
    },
    {
      id: 'prize10m', title: 'Große Kasse', icon: 'euro', iconClass: 'text-system-green',
      desc: '10 Mio € Preisgeld gewonnen (gesamt)',
      unlocked: totalPrize >= 10000000,
      context: `${totalPrize.toLocaleString('de-DE')} € bisher`,
      progress: { current: Math.min(totalPrize, 10000000), target: 10000000 },
    },
    {
      id: 'games50', title: 'Halbes Hundert', icon: 'calendar', iconClass: 'text-system-blue',
      desc: '50 Spiele gespielt',
      unlocked: total >= 50,
      context: `${total} Spiele bisher`,
      progress: { current: Math.min(total, 50), target: 50 },
    },
    {
      id: 'games100', title: 'Jubiläum', icon: 'calendar', iconClass: 'text-system-purple',
      desc: '100 Spiele gespielt',
      unlocked: total >= 100,
      context: `${total} Spiele bisher`,
      progress: { current: Math.min(total, 100), target: 100 },
    },
  ];
}


/**
 * Einheitlicher Rahmen fuer den ganzen Duell-Bereich.
 *
 * Vorher hatte fast jeder Abschnitt seinen eigenen Kopf: mal Icon links, mal
 * ohne, mal mit Zusatz rechts, mal in anderer Groesse. Ein Rahmen fuer alle
 * macht den Tab ruhig — und neue Auswertungen fuegen sich von selbst ein.
 */
function Karte({ icon, iconClass = 'text-text-tertiary', titel, zusatz, hinweis, children, className = '' }) {
  return (
    <div className={`modern-card p-4 ${className}`}>
      {/* Umbrechend statt abschneidend: in den schmalen Karten des
          Zweier-Rasters passte "Aktuelle Serie" neben dem Zusatz nicht mehr
          und wurde zu "Aktuelle S…". Der Titel hat Vorrang, der Zusatz
          rutscht notfalls in die zweite Zeile. */}
      {(titel || zusatz) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2.5">
          {icon && <Icon name={icon} size={15} strokeWidth={2.2} className={`${iconClass} flex-shrink-0`} />}
          <span className="text-footnote font-semibold text-text-muted">{titel}</span>
          {zusatz != null && (
            <span className="ml-auto text-caption2 text-text-tertiary num-tabular">{zusatz}</span>
          )}
        </div>
      )}
      {children}
      {hinweis && <p className="text-caption2 text-text-tertiary mt-2">{hinweis}</p>}
    </div>
  );
}

/** Kompakte Kennzahl im Raster — gleiche Optik wie Karte, nur kleiner. */
function StatCard({ iconName, iconClass, label, zusatz, children }) {
  return (
    <Karte icon={iconName} iconClass={iconClass} titel={label} zusatz={zusatz}>
      <div className="text-text-primary">{children}</div>
    </Karte>
  );
}

/** Zwei Personen, ein Balken — das wiederkehrende Muster im Duell. */
function Gegenueber({ aek, real, aekName, realName, einheit = '', klein = false }) {
  const summe = (Number(aek) || 0) + (Number(real) || 0);
  const anteil = summe > 0 ? (aek / summe) * 100 : 50;
  return (
    <div>
      <div className={`flex items-baseline justify-between ${klein ? 'text-caption1' : 'text-sm'}`}>
        <span className="text-system-blue font-semibold truncate">
          {klein ? '' : `${aekName} · `}<span className="num-tabular">{aek}{einheit}</span>
        </span>
        <span className="text-system-red font-semibold truncate">
          <span className="num-tabular">{real}{einheit}</span>{klein ? '' : ` · ${realName}`}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full overflow-hidden bg-bg-tertiary flex">
        <div className="bg-system-blue h-full" style={{ width: `${anteil}%` }} />
        <div className="bg-system-red h-full" style={{ width: `${100 - anteil}%` }} />
      </div>
    </div>
  );
}

// Shareable season-recap image drawn on a canvas (portrait 1080x1350).
function WrappedView({ d, aekName, realName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !d.total) return;
    const W = 1080, H = 1350;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const cx = W / 2;
    const font = (size, weight = '700') => `${weight} ${size}px -apple-system, "Segoe UI", Roboto, sans-serif`;

    // Background + accent orbs
    ctx.fillStyle = '#0A1119'; ctx.fillRect(0, 0, W, H);
    const orb = (x, y, r, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(10,17,25,0)');
      ctx.globalAlpha = alpha; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    };
    orb(170, 170, 460, '#3D9BFF', 0.28);
    orb(920, 240, 460, '#FF453A', 0.24);

    const at = (t, x, y, size, color, weight = '700', align = 'center') => {
      ctx.fillStyle = color; ctx.textAlign = align; ctx.font = font(size, weight);
      ctx.fillText(t, x, y);
    };

    // Header
    at('DAS DUELL', cx, 160, 78, '#FFFFFF', '800');
    at('FUSTA · Rückblick', cx, 214, 34, '#8A93A0', '600');

    // Scoreboard
    //
    // g statt d: der BILDSCHIRM rechnet mit gesamtBilanz(), also samt der
    // sieben Altsaisons, die nur als gezaehlte Bilanz vorliegen. Das Bild
    // nahm dagegen nur `d` — die Saisons mit Einzelspielen. Auf demselben
    // Schirm stand damit "950 Spiele", und das Bild zum Teilen sagte "142".
    //
    // Der Torschuetzenkoenig unten kommt aus den Spielerzeilen und deckt
    // ebenfalls alle Saisons ab; mit `d` passte er zu keiner Zahl darueber.
    const g = gesamtBilanz(d);
    const lx = 285, rx = W - 285;
    at(aekName, lx, 360, 42, '#3D9BFF', '700');
    at(realName, rx, 360, 42, '#FF453A', '700');
    at(String(g.aekW), lx, 510, 150, '#3D9BFF', '800');
    at(String(g.realW), rx, 510, 150, '#FF453A', '800');
    at(':', cx, 505, 100, '#5A6472', '700');
    at(`${g.total} Spiele · ${g.draws} Remis`, cx, 585, 34, '#8A93A0', '600');
    // Woher die Zahlen kommen. Höchster Sieg, Preisgeld und Serie lassen sich
    // nur aus erfassten Einzelspielen bilden — ohne diesen Hinweis behauptet
    // das Bild, alles beziehe sich auf denselben Satz Spiele.
    if (g.gezaehlt > 0) {
      at(`${g.erfasst} erfasst · ${g.gezaehlt} gezählt`, cx, 630, 26, '#5A6472', '600');
    }

    // Stat rows
    let y = 720;
    const rowH = 104;
    const row = (label, value, valueColor = '#FFFFFF') => {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(90, y - 54); ctx.lineTo(W - 90, y - 54); ctx.stroke();
      at(label, 90, y, 34, '#8A93A0', '600', 'left');
      at(value, W - 90, y, 40, valueColor, '700', 'right');
      y += rowH;
    };
    // Mit Tausenderpunkt wie auf dem Bildschirm — dort steht '2.079'.
    row('Torverhältnis', `${g.aekG.toLocaleString('de-DE')} : ${g.realG.toLocaleString('de-DE')}`);
    // Nicht durch g.total teilen: aus FC15/FC16 sind keine Tore ueberliefert,
    // ihre Spiele zaehlen aber mit. Dieselbe Rechnung wie auf dem Bildschirm.
    row('Ø Tore / Spiel', toreJeSpiel(g).toFixed(1).replace('.', ','));
    if (d.biggest.margin >= 0) {
      row('Höchster Sieg', `${d.biggest.score}  ${d.biggest.winner === 'AEK' ? aekName : realName}`,
        d.biggest.winner === 'AEK' ? '#3D9BFF' : '#FF453A');
    }
    if (d.topScorer) row('Torschützenkönig', `${d.topScorer.name} (${d.topScorer.goals})`);
    const pd = d.prizeA - d.prizeR;
    row('Preisgeld-Saldo', pd === 0 ? '±0 €' : `${pd > 0 ? '+' : ''}${pd.toLocaleString('de-DE')} € ${pd > 0 ? aekName : realName}`,
      pd === 0 ? '#8A93A0' : pd > 0 ? '#3D9BFF' : '#FF453A');
    if (d.streak) row('Aktuelle Serie', `${d.streak.len}× ${d.streak.who === 'AEK' ? aekName : realName}`,
      d.streak.who === 'AEK' ? '#3D9BFF' : '#FF453A');


    // Footer
    at(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }), 90, H - 70, 30, '#5A6472', '600', 'left');
    at('FUSTA', W - 90, H - 70, 34, '#FF8A6B', '800', 'right'); // Markenfarbe (Canvas kennt keine CSS-Variablen)
  }, [d, aekName, realName]);

  const filename = `fusta-rueckblick-${new Date().toISOString().slice(0, 10)}.png`;

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Rückblick gespeichert');
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'FUSTA Rückblick' });
      } else {
        save();
      }
    } catch { /* user cancelled */ }
  };

  if (!d.total) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-green/12 text-system-green flex items-center justify-center">
          <Icon name="star" size={30} strokeWidth={1.8} />
        </div>
        <p className="text-text-muted">Noch kein Rückblick möglich.</p>
        <p className="text-footnote text-text-tertiary mt-1">Nach den ersten Spielen entsteht hier eure teilbare Grafik.</p>
      </div>
    );
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;

  return (
    <div className="space-y-4">
      <div className="modern-card p-3">
        <canvas ref={canvasRef} className="w-full h-auto rounded-xl" style={{ aspectRatio: '1080 / 1350' }} />
      </div>
      <div className="flex gap-3">
        <button onClick={save} className="flex-1 btn-primary inline-flex items-center justify-center gap-2">
          <Icon name="chevronDown" size={16} strokeWidth={2.4} /> Speichern
        </button>
        {canShare && (
          <button onClick={share} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-bg-tertiary text-text-primary font-medium">
            <Icon name="zap" size={16} strokeWidth={2.4} /> Teilen
          </button>
        )}
      </div>
    </div>
  );
}

export default function DuelTab() {
  // skipFifaFilter → all matches across every FIFA version (all-time rivalry);
  // the Saison sub-view then splits them back out per version.
  const { data: matches, loading: mLoading, error: mError, refetch: refetchMatches } = useSupabaseQuery('matches', '*', { skipFifaFilter: true });
  const { data: players } = useSupabaseQuery('players', '*', { skipFifaFilter: true });
  const { data: managers } = useSupabaseQuery('manager', '*');
  // Auszeichnungen und Sperren ueber ALLE Saisons — 1111 bzw. 322 Eintraege,
  // die im Duell bisher nirgends auftauchten.
  const { data: sdsAlle } = useSupabaseQuery('spieler_des_spiels', '*', { skipFifaFilter: true });
  const { data: sperrenAlle } = useSupabaseQuery('bans', '*', { skipFifaFilter: true });

  const aekName = managers?.find((m) => m.id === 1)?.name || 'Alexander';
  const realName = managers?.find((m) => m.id === 2)?.name || 'Philip';

  const resolveName = useMemo(() => {
    return (idOrName) => {
      if (idOrName == null) return null;
      if (typeof idOrName === 'string' && !/^\d+$/.test(idOrName)) return idOrName;
      const p = (players || []).find((pl) => pl.id === idOrName || String(pl.id) === String(idOrName));
      return p?.name || (typeof idOrName === 'string' ? idOrName : null);
    };
  }, [players]);

  const dRaw = useMemo(() => computeDuel(matches, resolveName), [matches, resolveName]);

  // Saisonnummern aus derselben Quelle wie die Saisonansicht.
  const nummern = useMemo(
    () => saisonNummern(matches, players, getCurrentFifaVersion()),
    [matches, players]
  );

  // Altsaisons ohne Einzelspiele tauchen in seasonH2H nicht auf — die kennt nur
  // Saisons, aus denen es Spiele GIBT. Wo eine Bilanz ueberliefert ist (FC16),
  // gehoert sie trotzdem in die Liste, sonst fehlt eine ganze Saison.
  const alleBilanzen = useMemo(() => {
    const ausSpielen = dRaw.seasonH2H.map((s) => ({ ...s, quelle: 'spiele' }));
    const bekannt = new Set(ausSpielen.map((s) => s.version));
    const ausListe = [];
    for (const [version, info] of Object.entries(LEGACY_SAISONS)) {
      if (bekannt.has(version)) continue;
      if (!info.bilanz) {
        // FC15 hat gar keine Bilanz — aus der Zeit sind nur Strichlisten fuer
        // Tore und Auszeichnungen ueberliefert, keine Ergebnisse. Die Saison
        // trotzdem auffuehren: eine Luecke in der Reihe laesst einen suchen,
        // und "gibt es nicht" ist etwas anderes als "war nicht dabei".
        ausListe.push({ version, aekW: 0, realW: 0, draws: 0, quelle: 'ohne' });
        continue;
      }
      ausListe.push({
        version,
        aekW: siegeGesamt(info.bilanz.AEK),
        realW: siegeGesamt(info.bilanz.Real),
        draws: info.bilanz.unentschieden || 0,
        // Nicht jede Altsaison hat Tore — FC16 zaehlte nur Siege. Dann bleibt
        // die Zeile ohne Torangabe, statt eine 0:0 zu behaupten.
        aekG: info.bilanz.AEK?.tore ?? null,
        realG: info.bilanz.Real?.tore ?? null,
        spiele: info.bilanz.spiele || null,
        quelle: 'strichliste',
      });
    }
    return [...ausSpielen, ...ausListe].sort(
      (a, b) => (nummern.get(a.version) ?? 99) - (nummern.get(b.version) ?? 99)
    );
  }, [dRaw.seasonH2H, nummern]);

  // Torschuetzen kommen aus den SPIELERZEILEN, nicht aus den Match-Torlisten.
  // Grund: players.goals ist der gepflegte Karrierestand je Saison, waehrend
  // die Torlisten nur so weit zurueckreichen, wie Spiele erhalten sind. Und
  // derselbe Mensch hat pro Saison eine eigene Zeile — teils unter anderem
  // Team (Benzema AEK -> Ehemalige) oder in anderer Schreibweise
  // ("St Juste" / "St. Juste"). aggregatePlayers fasst das zusammen.
  const career = useMemo(() => aggregatePlayers(players), [players]);

  const d = useMemo(() => {
    const liste = career
      .filter((p) => p.goals > 0)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        goals: p.goals,
        seasons: p.seasons.filter((s) => s.goals > 0),
        teams: p.teams,
      }));
    return { ...dRaw, topScorers: liste, topScorer: liste[0] || null };
  }, [dRaw, career]);
  const [view, setView] = useState('uebersicht');
  const [mode, setMode] = useState('alltime'); // Übersicht: All-Time vs. Saison
  const achievements = useMemo(
    () => computeAchievements(matches, resolveName, { aek: aekName, real: realName }),
    [matches, resolveName, aekName, realName]
  );
  const evenings = useMemo(() => computeEvenings(matches), [matches]);

  // Alles ueber ALLE Saisons — erfasste Spiele plus die gezaehlten Bilanzen
  // der Altsaisons. Der Kopf behauptete das schon, rechnete es aber nicht.
  const gesamt = useMemo(() => gesamtBilanz(dRaw), [dRaw]);
  const ergebnisse = useMemo(() => haeufigsteErgebnisse(matches), [matches]);
  const diffs = useMemo(() => tordifferenzen(matches), [matches]);
  const serien = useMemo(() => serienUndZuNull(matches), [matches]);
  const personen = useMemo(
    () => summenJePerson(spielerStatistik({ players, sds: sdsAlle, bans: sperrenAlle })),
    [players, sdsAlle, sperrenAlle]
  );

  if (mLoading) return <LoadingSpinner message="Lade Duell…" />;

  if (mError && !matches) {
    return (
      <div className="p-4 text-center py-12">
        <div className="text-system-red mb-4 flex justify-center">
          <Icon name="warning" size={28} strokeWidth={2} />
        </div>
        <p className="text-text-muted mb-4">Fehler beim Laden der Duell-Daten</p>
        <button onClick={refetchMatches} className="btn-primary">Erneut versuchen</button>
      </div>
    );
  }

  const views = [
    { id: 'uebersicht', label: 'Übersicht', iconName: 'zap' },
    { id: 'rekorde', label: 'Rekorde', iconName: 'trophy' },
    { id: 'torschuetzen', label: 'Spieler', iconName: 'users' },
    { id: 'ruhmeshalle', label: 'Hall of Fame', iconName: 'trophy' },
    { id: 'vergleich', label: 'Vergleich', iconName: 'swap' },
    { id: 'sperren', label: 'Sperren', iconName: 'ban' },
    { id: 'saisons', label: 'Saisons', iconName: 'calendar' },
    { id: 'kaderverlauf', label: 'Kader', iconName: 'users' },
    { id: 'rueckblick', label: 'Rückblick', iconName: 'calendar' },
  ];
  // Nur das, was tatsaechlich passiert ist — nicht Erreichbares mit
  // Fortschrittsbalken.
  const besondereMomente = achievements.filter((a) => a.unlocked && a.context);

  // Deutsches Komma: zwei Karten weiter steht "Ø 4,3 pro Spiel" — dieselbe
  // Art Zahl darf nicht einmal mit Punkt und einmal mit Komma dastehen.
  const toreProSpiel = dez(toreJeSpiel(gesamt), 1);
  const fmtEuro = (n) => `${(n / 1).toLocaleString('de-DE')} €`;
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

  return (
    <div className="p-4 pb-24 space-y-4">
      <HorizontalNavigation views={views} selectedView={view} onViewChange={setView} />

      {view === 'rekorde' ? (
        <RecordsView matches={matches} players={players} aekName={aekName} realName={realName} />
      ) : view === 'torschuetzen' ? (
        <SpielerListe players={players} loading={!players} />
      ) : view === 'kaderverlauf' ? (
        <KaderVerlauf players={players} loading={!players} />
      ) : view === 'saisons' ? (
        <SaisonVergleich matches={matches} players={players} loading={!players} />
      ) : view === 'sperren' ? (
        <SperrenUebersicht players={players} bans={sperrenAlle} loading={!players} />
      ) : view === 'vergleich' ? (
        <SpielerVergleich players={players} sds={sdsAlle} bans={sperrenAlle} loading={!players} />
      ) : view === 'ruhmeshalle' ? (
        <HallOfFame players={players} matches={matches} bans={sperrenAlle}
                    sds={sdsAlle} loading={!players} />
      ) : view === 'rueckblick' ? (
        <WrappedView d={d} aekName={aekName} realName={realName} />
      ) : (
        /* Übersicht: All-Time ↔ Saison */
        <>
          <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
            {[['alltime', 'All-Time'], ['saison', 'Saison']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
                  mode === m ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'saison' ? (
            <SeasonView matches={matches} players={players} aekName={aekName} realName={realName} />
          ) : !gesamt.total ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-orange/12 text-system-orange flex items-center justify-center">
                <Icon name="zap" size={30} strokeWidth={1.8} />
              </div>
              <p className="text-text-muted">Noch keine Spiele erfasst.</p>
              <p className="text-footnote text-text-tertiary mt-1">Sobald ihr spielt, entsteht hier eure Bilanz.</p>
            </div>
          ) : (
            <>
      {/* Hero scoreboard — broadcast look: team-colour gradient + big numerals.
          Bewusst OHNE Vereinsnamen: die Zahlen laufen ueber alle Saisons, die
          Vereine wechseln aber je Saison (FC25 AEK/Real, FC26 Dynamo/Schalke).
          Ein Vereinsname haette hier die Bilanz der einen Saison unter dem
          Namen einer anderen ausgewiesen. Die Personen bleiben konstant. */}
      <div className="modern-card p-5 relative overflow-hidden verlauf-duell">
        <div className="text-caption2 text-text-tertiary text-center mb-2">
          Über alle Saisons · {alleBilanzen.length} Saisons
        </div>
        <div className="flex items-stretch">
          <div className="flex-1 flex flex-col items-center text-center">
            <TeamLogo team="aek" size="md" />
            <div className="mt-2 text-footnote font-semibold text-system-blue truncate max-w-full">{aekName}</div>
            <div className="mt-1 text-[54px] leading-none font-black tracking-tight tabular-nums text-system-blue">{gesamt.aekW}</div>
            <div className="text-caption2 text-text-tertiary">Siege</div>
          </div>

          <div className="flex flex-col items-center justify-center px-2">
            <div className="text-title3 font-bold text-text-tertiary">{gesamt.draws}</div>
            <div className="text-caption2 text-text-tertiary">Remis</div>
            <div className="mt-2 text-[10px] text-text-muted">{gesamt.total} Spiele</div>
          </div>

          <div className="flex-1 flex flex-col items-center text-center">
            <TeamLogo team="real" size="md" />
            <div className="mt-2 text-footnote font-semibold text-system-red truncate max-w-full">{realName}</div>
            <div className="mt-1 text-[54px] leading-none font-black tracking-tight tabular-nums text-system-red">{gesamt.realW}</div>
            <div className="text-caption2 text-text-tertiary">Siege</div>
          </div>
        </div>

        {/* Win-share bar */}
        <div className="mt-4 h-2.5 rounded-full overflow-hidden bg-bg-tertiary flex">
          <div className="bg-system-blue h-full" style={{ width: `${(gesamt.aekW / gesamt.total) * 100}%` }} />
          <div className="bg-text-tertiary/40 h-full" style={{ width: `${(gesamt.draws / gesamt.total) * 100}%` }} />
          <div className="bg-system-red h-full" style={{ width: `${(gesamt.realW / gesamt.total) * 100}%` }} />
        </div>

        {/* Herkunft der Zahlen. Erfasste Spiele lassen sich nachschlagen,
            gezaehlte nicht — und aus FC15 ist ueberhaupt keine Bilanz da. */}
        <p className="mt-3 text-caption2 text-text-tertiary text-center">
          {gesamt.erfasst} Spiele erfasst
          {gesamt.gezaehlt > 0 ? ` · ${gesamt.gezaehlt} aus Strichlisten gezählt` : ''}
          {gesamt.ohneBilanz.length > 0 ? ` · ${gesamt.ohneBilanz.join(', ')} ohne Bilanz` : ''}
        </p>
      </div>

      {/* Form (last 10) */}
      <Karte icon="chart" iconClass="text-system-green" titel="Formkurve"
             zusatz={`letzte ${d.last10.length} · erfasst`}>
        <div className="flex flex-wrap gap-1.5">
          {d.last10.map((r, i) => (
            <span
              key={i}
              title={r === 'AEK' ? aekName : r === 'Real' ? realName : 'Remis'}
              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${
                r === 'AEK' ? 'bg-system-blue' : r === 'Real' ? 'bg-system-red' : 'bg-text-tertiary/50'
              }`}
            >
              {r === 'D' ? '–' : r === 'AEK' ? 'A' : 'P'}
            </span>
          ))}
          <span className="text-[10px] text-text-tertiary self-center ml-1">neueste zuerst</span>
        </div>
      </Karte>

      {/* Kräfteverhältnis statt Kacheln.
          Torverhältnis, Siegquote und Preisgeld standen als drei Kacheln
          nebeneinander, jede mit zwei Zahlen und einem Doppelpunkt. Die
          Siegquote war dabei die Prozentfassung derselben Zahlen, die die
          Kopfkarte schon als Balken zeigt. Jetzt eine Fläche, die sich
          teilt — und die Quote braucht es nicht mehr, sie IST der Balken. */}
      <div className="modern-card p-4">
        <div className="text-footnote font-semibold text-text-muted mb-1">Kräfteverhältnis</div>
        <div className="divide-y divide-border-light">
          <Kraefteverhaeltnis
            label="Siege" zusatz={`${gesamt.total} Spiele${gesamt.draws ? ` · ${gesamt.draws} Remis` : ''}`}
            aek={gesamt.aekW} real={gesamt.realW}
            aekName={aekName} realName={realName} />
          <Kraefteverhaeltnis
            label="Tore" zusatz={`Ø ${toreProSpiel} je Spiel · ${gesamt.toreAus} Saisons`}
            aek={gesamt.aekG} real={gesamt.realG}
            aekName={aekName} realName={realName} />
          <Kraefteverhaeltnis
            label="Preisgeld" zusatz="erfasst"
            aek={d.prizeA} real={d.prizeR}
            anzeige={(n) => fmtEuro(n)}
            aekName={aekName} realName={realName} />
          {(serien.zuNull.AEK + serien.zuNull.Real) > 0 && (
            <Kraefteverhaeltnis
              label="Zu-Null-Siege" zusatz="erfasst"
              aek={serien.zuNull.AEK} real={serien.zuNull.Real}
              aekName={aekName} realName={realName} />
          )}
          {(serien.laengste.AEK + serien.laengste.Real) > 0 && (
            <Kraefteverhaeltnis
              label="Längste Serie" zusatz="Siege in Folge · erfasst"
              aek={serien.laengste.AEK} real={serien.laengste.Real}
              aekName={aekName} realName={realName} />
          )}
        </div>
      </div>

      {/* Was nur einer Seite gehört, bleibt eine Kachel — ein Balken für
          "aktuelle Serie" hätte nichts zu teilen. */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard iconName="zap" iconClass="text-system-orange" label="Aktuelle Serie" zusatz="erfasst">
          {d.streak ? (
            <>
              <span className={`text-title3 font-bold ${d.streak.who === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                {d.streak.len}×
              </span>
              <div className="text-[11px] text-text-tertiary mt-0.5">
                in Folge · {d.streak.who === 'AEK' ? aekName : realName}
              </div>
            </>
          ) : (
            <span className="text-footnote text-text-tertiary">—</span>
          )}
        </StatCard>

        <StatCard iconName="trophy" iconClass="text-system-yellow" label="Höchster Sieg" zusatz="erfasst">
          {d.biggest.margin >= 0 ? (
            <>
              <span className={`text-title3 font-bold ${d.biggest.winner === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                {d.biggest.score}
              </span>
              <div className="text-[11px] text-text-tertiary mt-0.5">
                {d.biggest.winner === 'AEK' ? aekName : realName} · {fmtDate(d.biggest.date)}
              </div>
            </>
          ) : <span className="text-footnote text-text-tertiary">—</span>}
        </StatCard>
      </div>

      {/* Top-Torschützen (all-time) */}
      {d.topScorers.length > 0 && (
        <Karte icon="star" iconClass="text-system-orange" titel="Top-Torschützen"
               zusatz="alle Saisons">
          <div className="space-y-1.5">
            {d.topScorers.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className={`w-5 text-center text-sm font-bold ${i === 0 ? 'text-system-yellow' : i === 2 ? 'text-system-orange' : 'text-text-tertiary'}`}>{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-text-primary truncate">{s.name}</span>
                <div className="w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div className="h-full bg-system-orange/70" style={{ width: `${(s.goals / d.topScorers[0].goals) * 100}%` }} />
                </div>
                <span className="text-sm font-bold tabular-nums w-6 text-right">{s.goals}</span>
              </div>
            ))}
          </div>
        </Karte>
      )}

      {/* Head-to-Head je Saison */}
      {alleBilanzen.length > 0 && (
        <Karte icon="calendar" iconClass="text-system-blue" titel="Bilanz je Saison"
               zusatz={`${alleBilanzen.length} Saisons`}>
          <div className="space-y-2.5">
            {alleBilanzen.map((s) => {
              const tot = s.aekW + s.realW + s.draws || 1;
              return (
                <div key={s.version}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-text-secondary font-medium flex items-center gap-1.5">
                      Saison {nummern.get(s.version) ?? '?'} · {s.version}
                      {/* Zwei verschiedene Aussagen: "Archiv" heisst
                          abgeschlossen, "gezaehlt" heisst aus einer
                          Strichliste statt aus Einzelspielen. FC25 ist
                          Archiv, aber nicht gezaehlt. */}
                      {istArchiv(s.version) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
                          Archiv
                        </span>
                      )}
                      {s.quelle === 'strichliste' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-system-yellow/15 text-system-yellow">
                          gezählt
                        </span>
                      )}
                    </span>
                    {s.quelle === 'ohne' ? (
                      <span className="text-text-tertiary">keine Bilanz</span>
                    ) : (
                      <span className="tabular-nums">
                        <span className="text-system-blue font-semibold">{s.aekW}</span>
                        <span className="text-text-tertiary"> · {s.draws} · </span>
                        <span className="text-system-red font-semibold">{s.realW}</span>
                      </span>
                    )}
                  </div>
                  {s.quelle === 'ohne' ? (
                    <p className="text-[10px] text-text-tertiary">
                      Nur Tore, Auszeichnungen und Sperren überliefert — keine Ergebnisse.
                    </p>
                  ) : (
                  <div className="h-2 rounded-full overflow-hidden bg-bg-tertiary flex">
                    <div className="bg-system-blue h-full" style={{ width: `${(s.aekW / tot) * 100}%` }} />
                    <div className="bg-text-tertiary/40 h-full" style={{ width: `${(s.draws / tot) * 100}%` }} />
                    <div className="bg-system-red h-full" style={{ width: `${(s.realW / tot) * 100}%` }} />
                  </div>
                  )}
                  {/* Tore, wo sie ueberliefert sind. FC15 hat gar keine
                      Bilanz, FC16 nur Siege — dort bleibt die Zeile leer,
                      statt eine 0:0 zu behaupten. */}
                  {s.aekG != null && s.realG != null && (
                    <div className="flex items-center justify-between text-[10px] text-text-tertiary mt-0.5 num-tabular">
                      <span className="text-text-secondary">
                        <span className="text-system-blue">{s.aekG}</span>
                        {' : '}
                        <span className="text-system-red">{s.realG}</span>
                        {' Tore'}
                      </span>
                      <span className="text-text-secondary">Ø {((s.aekG + s.realG) / (s.spiele || tot)).toLocaleString('de-DE', { maximumFractionDigits: 1 })} pro Spiel</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Karte>
      )}

      {/* Abendform: jede Spielposition einzeln, nicht mehr ab 3 zusammengefasst */}
      {evenings.length > 1 && (
        <Karte icon="beer" iconClass="text-system-orange" titel="Abendform"
               zusatz={`${evenings.length} Positionen`}
               hinweis="Wie weit trägt die Form über den Abend? Spiel 1 ist nüchtern, danach wird es ehrlicher.">
          <div className="space-y-2.5">
            {evenings.map((b) => {
              const tot = b.games || 1;
              return (
                <div key={b.pos}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-text-secondary font-medium">{b.label}</span>
                    <span className="tabular-nums">
                      <span className="text-system-blue font-semibold">{b.aekW}</span>
                      <span className="text-text-tertiary"> · {b.draws} · </span>
                      <span className="text-system-red font-semibold">{b.realW}</span>
                      <span className="text-text-tertiary"> ({b.games})</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-bg-tertiary flex">
                    <div className="bg-system-blue h-full" style={{ width: `${(b.aekW / tot) * 100}%` }} />
                    <div className="bg-text-tertiary/40 h-full" style={{ width: `${(b.draws / tot) * 100}%` }} />
                    <div className="bg-system-red h-full" style={{ width: `${(b.realW / tot) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Karte>
      )}

      {/* Abendbilanz: wer holt den ABEND, nicht nur einzelne Spiele */}
      {(serien.abende.AEK + serien.abende.Real + serien.abende.geteilt) > 1 && (
        <Karte icon="calendar" iconClass="text-system-purple" titel="Gewonnene Abende"
               zusatz={`${serien.abende.AEK + serien.abende.Real + serien.abende.geteilt} Abende`}
               hinweis={serien.abende.geteilt
                 ? `${serien.abende.geteilt} ${serien.abende.geteilt === 1 ? 'Abend ging' : 'Abende gingen'} unentschieden aus.`
                 : null}>
          <Gegenueber aek={serien.abende.AEK} real={serien.abende.Real}
                      aekName={aekName} realName={realName} />
        </Karte>
      )}

      {/* Wie deutlich faellt ein Sieg aus — volle Verteilung */}
      {diffs.length > 0 && (
        <Karte icon="chart" iconClass="text-system-teal" titel="Deutlichkeit der Siege"
               zusatz={`${diffs.reduce((s, x) => s + x.gesamt, 0)} Entscheidungen`}
               hinweis="Je weiter rechts, desto klarer ging das Spiel aus.">
          <div className="space-y-1.5">
            {diffs.map((x) => {
              const max = Math.max(...diffs.map((y) => y.gesamt), 1);
              return (
                <div key={x.diff} className="flex items-center gap-2">
                  <span className="w-14 text-caption2 text-text-secondary flex-shrink-0 num-tabular">
                    {x.diff} {x.diff === 1 ? 'Tor' : 'Tore'}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-bg-tertiary overflow-hidden flex"
                       style={{ maxWidth: `${(x.gesamt / max) * 100}%` }}>
                    <div className="bg-system-blue h-full" style={{ width: `${(x.aek / x.gesamt) * 100}%` }} />
                    <div className="bg-system-red h-full" style={{ width: `${(x.real / x.gesamt) * 100}%` }} />
                  </div>
                  <span className="text-caption2 text-text-tertiary num-tabular w-6 text-right flex-shrink-0">
                    {x.gesamt}
                  </span>
                </div>
              );
            })}
          </div>
        </Karte>
      )}

      {/* Haeufigste Endstaende */}
      {ergebnisse.length > 1 && (
        <Karte icon="football" iconClass="text-system-green" titel="Häufigste Ergebnisse"
               zusatz={`aus ${d.total} Spielen`}>
          <div className="grid grid-cols-3 gap-2">
            {ergebnisse.map((e) => (
              <div key={e.ergebnis}
                   className={`rounded-xl px-2 py-2 text-center ${
                     e.sieger === 'AEK' ? 'panel-blue' : e.sieger === 'Real' ? 'panel-red' : 'panel-gray'}`}>
                <div className="stat-display text-lg num-tabular text-text-primary">{e.ergebnis}</div>
                <div className="text-caption2 text-text-tertiary">{e.anzahl}×</div>
              </div>
            ))}
          </div>
        </Karte>
      )}

      {/* Auszeichnungen — 1111 Eintraege lagen in der Datenbank und tauchten
          im Duell nirgends auf. Aus ALLEN Saisons, auch den gezaehlten. */}
      {(personen.AEK.sds + personen.Real.sds) > 0 && (
        <Karte icon="star" iconClass="text-system-blue" titel="Spieler des Spiels"
               zusatz={`${personen.AEK.sds + personen.Real.sds + personen.Ehemalige.sds} vergeben`}
               hinweis={personen.Ehemalige.sds > 0
                 ? `${personen.Ehemalige.sds} entfallen auf Spieler ohne Teamzuordnung.`
                 : null}>
          <Gegenueber aek={personen.AEK.sds} real={personen.Real.sds}
                      aekName={aekName} realName={realName} />
        </Karte>
      )}

      {/* Disziplin — Sperren nach Art. Ebenfalls neu im Duell. */}
      {(personen.AEK.sperren + personen.Real.sperren) > 0 && (
        <Karte icon="ban" iconClass="text-system-red" titel="Disziplin"
               zusatz={`${personen.AEK.sperren + personen.Real.sperren + personen.Ehemalige.sperren} Sperren`}
               hinweis={`Zusammen ${personen.AEK.sperrSpiele + personen.Real.sperrSpiele + personen.Ehemalige.sperrSpiele} verpasste Spiele.`}>
          <Gegenueber aek={personen.AEK.sperren} real={personen.Real.sperren}
                      aekName={aekName} realName={realName} />
          {/* Aufschluesselung nach Art: Rot und Verletzung sind zwei sehr
              verschiedene Aussagen ueber jemanden. */}
          <div className="mt-3 space-y-1.5">
            {[...new Set([
              ...Object.keys(personen.AEK.arten),
              ...Object.keys(personen.Real.arten),
            ])].sort().map((art) => {
              const a = personen.AEK.arten[art] || 0;
              const r = personen.Real.arten[art] || 0;
              const max = Math.max(a, r, 1);
              return (
                <div key={art} className="flex items-center gap-2">
                  <span className="w-28 text-caption2 text-text-secondary truncate flex-shrink-0">{art}</span>
                  <span className="num-tabular text-caption2 text-system-blue w-6 text-right">{a}</span>
                  <div className="flex-1 flex items-center gap-0.5">
                    <div className="flex-1 h-2 rounded-l-full bg-bg-tertiary overflow-hidden flex justify-end">
                      <div className="h-full bg-system-blue" style={{ width: `${(a / max) * 100}%` }} />
                    </div>
                    <div className="flex-1 h-2 rounded-r-full bg-bg-tertiary overflow-hidden">
                      <div className="h-full bg-system-red" style={{ width: `${(r / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="num-tabular text-caption2 text-system-red w-6">{r}</span>
                </div>
              );
            })}
          </div>
        </Karte>
      )}

      {/* Bestmarken, die es vorher nicht gab */}
      <div className="grid grid-cols-2 gap-3">
        <Karte icon="trophy" iconClass="text-system-yellow" titel="Längste Siegesserie">
          <Gegenueber aek={serien.laengste.AEK} real={serien.laengste.Real}
                      aekName={aekName} realName={realName} klein />
        </Karte>
        <Karte icon="ban" iconClass="text-system-teal" titel="Zu-Null-Siege">
          <Gegenueber aek={serien.zuNull.AEK} real={serien.zuNull.Real}
                      aekName={aekName} realName={realName} klein />
        </Karte>
      </div>

      {/* Besondere Momente. Standen frueher als eigener Bereich "Erfolge" mit
          Fortschrittsbalken — als Sammelspiel gedacht, aber das hier sind
          schlicht Tatsachen aus euren Spielen. Deshalb nur noch die, die es
          wirklich gab, als Info-Zeilen. */}
      {besondereMomente.length > 0 && (
        <Karte icon="sparkles" iconClass="text-system-yellow" titel="Besondere Momente"
               zusatz={`${besondereMomente.length}`}>
          <div className="space-y-2">
            {besondereMomente.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <Icon name={a.icon} size={15} strokeWidth={2.2}
                      className={`${a.iconClass} mt-0.5 flex-shrink-0`} />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text-primary">{a.title}</span>
                  {a.context && (
                    <span className="text-caption1 text-text-secondary"> — {a.context}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Karte>
      )}
            </>
          )}
        </>
      )}
    </div>
  );
}
