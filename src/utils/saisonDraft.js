/**
 * Saison-Draft — neue Mannschaft für eine neue Saison zusammenstellen.
 *
 * Ablauf (siehe db/18_draft.sql):
 *   1. Budget je Person festlegen. Vorschlag = Kontostand der Vorsaison plus
 *      Wert ihres alten Kaders; beides ist überschreibbar.
 *   2. Abwechselnd ziehen, beginnend bei dem, der ausgewählt wurde.
 *   3. Ab 14 Spielern darf man aussteigen; der andere zieht dann allein weiter.
 *   4. Beim Abschluss wandern die Spieler nach `players` — erst dann sind sie
 *      echt. Vorher lässt sich jeder Zug zurücknehmen.
 */
import { supabaseDb } from './supabase';
import { wechselAusDraft } from './spielerWechsel';

export const TEAMS = ['AEK', 'Real'];
export const PERSON = { AEK: 'Alexander', Real: 'Philip' };
export const MINDEST_PICKS = 14;

/**
 * Laufender Draft, sonst null.
 *
 * Ohne `version` wird JEDER offene Draft gefunden. Das ist Absicht: gedraftet
 * wird fuer die KOMMENDE Saison, waehrend die App noch in der alten steht.
 * Wuerde hier nach der angesehenen Saison gefiltert, waere ein laufender
 * Draft fuer FC27 unsichtbar, sobald man FC26 ansieht.
 */
export async function ladeOffenenDraft(version = null) {
  const eq = version ? { fifa_version: version, status: 'laufend' } : { status: 'laufend' };
  const { data, error } = await supabaseDb.select('draft_sessions', '*', {
    eq, skipFifaFilter: true,
  });
  if (error) throw error;
  return (data || [])[0] || null;
}

export async function ladePicks(sessionId) {
  const { data, error } = await supabaseDb.select('draft_picks', '*', {
    eq: { session_id: sessionId },
    skipFifaFilter: true,
  });
  if (error) throw error;
  return (data || []).sort((a, b) => a.nummer - b.nummer);
}

/**
 * Budgetvorschlag aus der Vorsaison: Kontostand + Kaderwert.
 *
 * finances.balance steht in Euro, players.value in Millionen — ohne die
 * Umrechnung wäre ein Kader von 40 Mio genau 40 Euro wert.
 */
export function budgetVorschlag(team, vorsaison, finanzen, spieler) {
  const konto = (finanzen || [])
    .find((f) => f.team === team && (f.fifa_version || 'FC25') === vorsaison)?.balance ?? 0;
  const kader = (spieler || [])
    .filter((p) => p.team === team && (p.fifa_version || 'FC25') === vorsaison)
    .reduce((s, p) => s + (Number(p.value) || 0), 0);
  return Math.max(0, Math.round(Number(konto) || 0) + Math.round(kader * 1_000_000));
}

/** Wer ist als Nächstes dran? */
export function amZug(session, picks) {
  if (!session) return null;
  const zaehler = { AEK: 0, Real: 0 };
  for (const p of picks) zaehler[p.team] = (zaehler[p.team] || 0) + 1;

  const raus = { AEK: session.fertig_aek, Real: session.fertig_real };
  if (raus.AEK && raus.Real) return null;
  if (raus.AEK) return 'Real';
  if (raus.Real) return 'AEK';

  // Abwechselnd, beginnend beim gewählten Startspieler. Wer weniger Spieler
  // hat, ist dran; bei Gleichstand der, der beginnt.
  const start = session.beginner === 'Real' ? 'Real' : 'AEK';
  const anderer = start === 'AEK' ? 'Real' : 'AEK';
  if (zaehler[start] === zaehler[anderer]) return start;
  return zaehler[start] > zaehler[anderer] ? anderer : start;
}

/** Verbleibendes Budget je Team. */
export function restBudget(session, picks) {
  const ausgegeben = { AEK: 0, Real: 0 };
  for (const p of picks) ausgegeben[p.team] = (ausgegeben[p.team] || 0) + (Number(p.preis) || 0);
  return {
    AEK: (session?.budget_aek || 0) - ausgegeben.AEK,
    Real: (session?.budget_real || 0) - ausgegeben.Real,
    ausgegeben,
  };
}

export function anzahlProTeam(picks) {
  const z = { AEK: 0, Real: 0 };
  for (const p of picks) z[p.team] = (z[p.team] || 0) + 1;
  return z;
}

export async function starteDraft({ version, budgetAek, budgetReal, beginner }) {
  const { data, error } = await supabaseDb.insert('draft_sessions', {
    fifa_version: version,
    budget_aek: Math.round(budgetAek),
    budget_real: Math.round(budgetReal),
    beginner,
    mindest_picks: MINDEST_PICKS,
    // Steht so schon als Spalten-Default in db/18_draft.sql. Hier trotzdem
    // ausdruecklich: ladeOffenenDraft() filtert genau danach, und ein Wert,
    // der erst in der Datenbank entsteht, macht den Zusammenhang unsichtbar.
    status: 'laufend',
  });
  if (error) throw error;
  return data;
}

export async function ziehe({ session, picks, team, name, preis, position }) {
  const rest = restBudget(session, picks);
  if (preis > rest[team]) {
    throw new Error(`Das übersteigt das Budget von ${PERSON[team]} um ${((preis - rest[team]) / 1_000_000).toFixed(2)} Mio €.`);
  }
  const nummer = (picks[picks.length - 1]?.nummer || 0) + 1;
  const { data, error } = await supabaseDb.insert('draft_picks', {
    session_id: session.id,
    nummer,
    team,
    spieler_name: String(name).trim(),
    preis: Math.round(preis),
    position: position || null,
  });
  if (error) throw error;
  return data;
}

export async function nimmZurueck(pickId) {
  const { error } = await supabaseDb.delete('draft_picks', pickId);
  if (error) throw error;
}

export async function setzeFertig(session, team, fertig) {
  const feld = team === 'AEK' ? 'fertig_aek' : 'fertig_real';
  const { error } = await supabaseDb.update('draft_sessions', { [feld]: fertig }, session.id);
  if (error) throw error;
}

export async function aktualisiereBudget(session, { budgetAek, budgetReal }) {
  const { error } = await supabaseDb.update('draft_sessions', {
    budget_aek: Math.round(budgetAek),
    budget_real: Math.round(budgetReal),
  }, session.id);
  if (error) throw error;
}

/**
 * Draft abschließen: Spieler nach `players` schreiben, Kontostand als Restgeld
 * setzen, Session schließen.
 *
 * Die Reihenfolge ist Absicht: erst die Spieler (der teure Teil), dann die
 * Konten, zuletzt die Session. Bricht es zwischendrin ab, bleibt der Draft
 * offen und lässt sich erneut abschließen — die schon angelegten Spieler
 * werden dabei übersprungen, weil in draft_picks.player_id steht, wer schon
 * übernommen wurde.
 */
export async function schliesseAb(session, picks) {
  const angelegt = [];
  for (const p of picks) {
    if (p.player_id) continue;
    const { data, error } = await supabaseDb.insert('players', {
      name: p.spieler_name,
      team: p.team,
      position: p.position || null,
      goals: 0,
      value: Number((p.preis / 1_000_000).toFixed(2)),
      fifa_version: session.fifa_version,
    });
    if (error) throw new Error(`„${p.spieler_name}" konnte nicht angelegt werden: ${error.message}`);
    await supabaseDb.update('draft_picks', { player_id: data.id }, p.id);
    angelegt.push(data);
  }

  // Restgeld wird zum Startkapital der neuen Saison.
  const rest = restBudget(session, picks);
  for (const team of TEAMS) {
    const { data: vorhanden } = await supabaseDb.select('finances', '*', {
      eq: { team, fifa_version: session.fifa_version },
      skipFifaFilter: true,
    });
    const betrag = Math.max(0, rest[team]);
    if (vorhanden && vorhanden.length) {
      await supabaseDb.update('finances', { balance: betrag }, vorhanden[0].id);
    } else {
      await supabaseDb.insert('finances', {
        team, balance: betrag, debt: 0, fifa_version: session.fifa_version,
      });
    }
  }

  // Die Zuordnungen als Wechsel festhalten.
  //
  // Ohne das reisst der Verlauf an jeder Saisongrenze ab: der Draft legt neue
  // Spielerzeilen an, und wer dabei die Seite wechselt, stuende in
  // spieler_wechsel nirgends. In try, weil der Draft an dieser Stelle bereits
  // durch ist — ein Fehler beim Verlauf darf ihn nicht offen lassen.
  try {
    await wechselAusDraft({
      zuordnungen: picks.map((p) => ({
        name: p.spieler_name,
        team: p.team,
        spielerId: p.player_id ?? angelegt.find((a) => a.name === p.spieler_name)?.id ?? null,
      })),
      fifaVersion: session.fifa_version,
    });
  } catch (e) {
    console.warn('Draft abgeschlossen, Wechsel nicht festgehalten:', e);
  }

  const { error } = await supabaseDb.update('draft_sessions', {
    status: 'abgeschlossen',
    beendet_at: new Date().toISOString(),
  }, session.id);
  if (error) throw error;
  return angelegt.length;
}

export async function brichAb(session) {
  const { error } = await supabaseDb.update('draft_sessions', { status: 'abgebrochen' }, session.id);
  if (error) throw error;
}

/** Kann der Draft abgeschlossen werden? */
export function abschlussBereit(picks) {
  const z = anzahlProTeam(picks);
  return z.AEK >= MINDEST_PICKS && z.Real >= MINDEST_PICKS;
}
