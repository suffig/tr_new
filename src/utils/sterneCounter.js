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

/** Text, den ein Spielduell in `info` hinterlaesst. */
export const DUELL_INFO_PREFIX = 'Spielduell: ';

/**
 * Das Duell hinter einem Verlaufseintrag — oder null, wenn der Eintrag keins ist.
 *
 * Neue Eintraege bringen `duell` schon mit. Aeltere haben nur den info-Text
 * "Spielduell: <Team Alexander> vs. <Team Philip>"; daraus stehen beide
 * Teamnamen und ueber `person`/`stars` der Sieger samt seiner Teamstaerke fest.
 * Was fehlt, ist das Rating des Verliererteams — das holt `ratingFuerTeam` aus
 * dem Katalog. Findet es dort nichts, bleibt das Duell trotzdem gueltig, nur
 * ohne Staerkevergleich (rating = null).
 *
 * @param {object} eintrag Verlaufseintrag aus loadSterne().history
 * @param {(name: string) => number|null} [ratingFuerTeam] Katalog-Lookup
 */
export function duellAusEintrag(eintrag, ratingFuerTeam) {
  if (!eintrag) return null;
  if (eintrag.duell?.teams) return eintrag.duell;

  const info = typeof eintrag.info === 'string' ? eintrag.info : '';
  if (!info.startsWith(DUELL_INFO_PREFIX)) return null;
  const teile = info.slice(DUELL_INFO_PREFIX.length).split(' vs. ');
  if (teile.length !== 2) return null;

  const sieger = STERNE_PERSON_KEY[eintrag.person] || eintrag.person;
  const verlierer = sieger === 'alex' ? 'philip' : 'alex';
  const namen = { alex: teile[0].trim(), philip: teile[1].trim() };
  const lookup = typeof ratingFuerTeam === 'function' ? ratingFuerTeam : () => null;
  const rating = (p) => {
    if (p === sieger) return Number(eintrag.stars);
    const r = lookup(namen[p]);
    return Number.isFinite(Number(r)) ? Number(r) : null;
  };

  return {
    sieger,
    verlierer,
    teams: {
      alex: { name: namen.alex, rating: rating('alex') },
      philip: { name: namen.philip, rating: rating('philip') },
    },
  };
}

/** Alle Duelle aus dem Verlauf, aelteste zuerst. */
export function duelleAusHistorie(history, ratingFuerTeam) {
  return (history || [])
    .map((e) => {
      const d = duellAusEintrag(e, ratingFuerTeam);
      return d ? { ...d, timestamp: e.timestamp, gained: e.gained } : null;
    })
    .filter(Boolean);
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
 *
 * `duell` haelt das Ergebnis eines Spielduells strukturiert fest:
 *   { sieger, verlierer, teams: { <person>: { name, rating } } }
 * Aus `stars` allein liesse sich nur die Staerke des Siegerteams ablesen — fuer
 * eine Underdog-Quote braucht es beide Seiten. Aeltere Eintraege haben das Feld
 * nicht; duellAusEintrag() unten holt sie ueber den info-Text nach.
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

export function addSterneEintrag({ person, stars, info = null, duell = null }) {
  const key = STERNE_PERSON_KEY[person] || person;
  const gained = gutschriftFuer(stars);
  const data = loadSterne();
  const next = {
    ...data,
    [key]: (Number(data[key]) || 0) + gained,
    history: [
      ...data.history,
      {
        person: key,
        stars,
        gained,
        timestamp: new Date().toISOString(),
        ...(info ? { info } : {}),
        ...(duell ? { duell } : {}),
      },
    ],
  };
  saveSterne(next);
  return { gained, data: next };
}
