// Sterne-Zaehler (Handicap-Wertung).
//
// Regel: wer mit einem SCHWAECHEREN Team antritt, bekommt mehr gutgeschrieben —
// Gutschrift = 6 − Sterne des Teams. Ein 5-Sterne-Team bringt also 1,0, ein
// 0,5-Sterne-Team 5,5.
//
// Diese Datei ist die einzige Quelle fuer Formel und Speicher. Vorher lag beides
// nur im Alkohol-Tab; mit dem Spielduell im Teams-Tab braeuchte es die Regel an
// zwei Stellen — und zwei Kopien derselben Regel laufen frueher oder spaeter
// auseinander.

const KEY = 'sterneData';

export const STERNE_BASIS = 6;

/** Teams-Tab nutzt 'alexander', der Sterne-Zaehler speichert unter 'alex'. */
export const STERNE_PERSON_KEY = { alexander: 'alex', alex: 'alex', philip: 'philip' };

const LEER = { philip: 0, alex: 0, history: [] };

/** Gutschrift fuer eine Team-Staerke. */
export function gutschriftFuer(stars) {
  const s = Number(stars);
  if (!Number.isFinite(s)) return 0;
  return Math.max(0, STERNE_BASIS - s);
}

export function loadSterne() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { ...LEER };
    return {
      philip: Number(raw.philip) || 0,
      alex: Number(raw.alex) || 0,
      history: Array.isArray(raw.history) ? raw.history : [],
    };
  } catch {
    return { ...LEER };
  }
}

export function saveSterne(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore quota */ }
  return data;
}

/**
 * Eine Gutschrift eintragen.
 * Der Verlaufseintrag bleibt formatgleich zum Alkohol-Tab
 * ({ person, stars, gained, timestamp }), damit "Rueckgaengig" dort weiter
 * funktioniert; Zusatzfelder wie `info` stoeren das nicht.
 */
/**
 * Einen einzelnen Verlaufseintrag entfernen und seine Gutschrift zurueckrechnen.
 * @param {number} index Position im Verlauf (aelteste = 0)
 */
export function removeSterneEintrag(index) {
  const data = loadSterne();
  const eintrag = data.history[index];
  if (!eintrag) return data;
  const key = STERNE_PERSON_KEY[eintrag.person] || eintrag.person;
  const abzug = eintrag.gained ?? gutschriftFuer(eintrag.stars);
  const next = {
    ...data,
    // Nie unter 0 — der Zaehler ist eine Punktesumme, keine Schuld.
    [key]: Math.max(0, (Number(data[key]) || 0) - abzug),
    history: data.history.filter((_, i) => i !== index),
  };
  return saveSterne(next);
}

export function addSterneEintrag({ person, stars, info = null }) {
  const key = STERNE_PERSON_KEY[person] || person;
  const gained = gutschriftFuer(stars);
  const data = loadSterne();
  const next = {
    ...data,
    [key]: (Number(data[key]) || 0) + gained,
    history: [
      ...data.history,
      { person: key, stars, gained, timestamp: new Date().toISOString(), ...(info ? { info } : {}) },
    ],
  };
  saveSterne(next);
  return { gained, data: next };
}
