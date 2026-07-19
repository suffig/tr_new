import toast from 'react-hot-toast';
import { chronoAsc } from './matchChronology';

// Record + monthly-recap alerts, derived purely from matches.
// A snapshot of the current bests lives in localStorage; when a new match list
// beats one of them, a celebratory toast fires. Runs once per app session.

const SNAP_KEY = 'fusta_records_snapshot_v1';
const RECAP_KEY = 'fusta_last_recap_month';

function computeSnapshot(matches) {
  let maxStreak = 0, biggestMargin = 0, mostGoalsGame = 0;
  let curWho = null, curLen = 0;
  const chrono = [...matches].sort(chronoAsc);
  for (const m of chrono) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    biggestMargin = Math.max(biggestMargin, a === b ? 0 : Math.abs(a - b));
    mostGoalsGame = Math.max(mostGoalsGame, a + b);
    if (a === b) { curWho = null; curLen = 0; continue; }
    const w = a > b ? 'AEK' : 'Real';
    if (w === curWho) curLen++; else { curWho = w; curLen = 1; }
    maxStreak = Math.max(maxStreak, curLen);
  }
  return { maxStreak, biggestMargin, mostGoalsGame, totalGames: matches.length };
}

export function checkMilestones(matches, names = { aek: 'Alexander', real: 'Philip' }) {
  if (!Array.isArray(matches) || matches.length === 0) return;
  if (window.__fustaMilestonesChecked) return;
  window.__fustaMilestonesChecked = true;
  // Verzögert feuern, damit Start-Toasts nicht im Mount-Trubel verschwinden.
  setTimeout(() => runChecks(matches, names), 1500);
}

function runChecks(matches, names) {

  const snap = computeSnapshot(matches);
  let old = null;
  try { old = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null'); } catch { /* ignore */ }

  if (old) {
    if (snap.maxStreak > old.maxStreak && snap.maxStreak >= 3) {
      toast(`🔥 Neuer Rekord: ${snap.maxStreak} Siege in Folge!`, { duration: 6000 });
    }
    if (snap.biggestMargin > old.biggestMargin && snap.biggestMargin >= 3) {
      toast(`💥 Neuer Kantersieg-Rekord: ${snap.biggestMargin} Tore Differenz!`, { duration: 6000 });
    }
    if (snap.mostGoalsGame > old.mostGoalsGame && snap.mostGoalsGame >= 6) {
      toast(`⚽ Torreichstes Spiel aller Zeiten: ${snap.mostGoalsGame} Tore!`, { duration: 6000 });
    }
    // Runde Spiel-Meilensteine (50, 100, 150, …)
    const oldHundred = Math.floor(old.totalGames / 50);
    const newHundred = Math.floor(snap.totalGames / 50);
    if (newHundred > oldHundred) {
      toast(`🎉 Meilenstein: ${newHundred * 50}. Spiel im Duell!`, { duration: 6000 });
    }
  }
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snap)); } catch { /* ignore */ }

  // --- Monats-Recap: einmal beim ersten Öffnen im neuen Monat -------------
  try {
    const nowMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const last = localStorage.getItem(RECAP_KEY);
    if (last && last !== nowMonth) {
      const prev = last; // der Monat, in dem zuletzt geöffnet wurde
      const inPrev = matches.filter((m) => String(m.date || '').startsWith(prev));
      if (inPrev.length > 0) {
        let a = 0, r = 0;
        for (const m of inPrev) {
          if ((m.goalsa || 0) > (m.goalsb || 0)) a++;
          else if ((m.goalsb || 0) > (m.goalsa || 0)) r++;
        }
        const lead = a === r ? 'Unentschieden' : (a > r ? `${names.aek} vorn` : `${names.real} vorn`);
        toast(`📅 Euer Monat: ${inPrev.length} Spiele · ${a}:${r} · ${lead}. Rückblick im Duell-Tab!`, { duration: 8000 });
      }
    }
    localStorage.setItem(RECAP_KEY, nowMonth);
  } catch { /* ignore */ }
}
