// Match Service - comprehensive match deletion with financial reversal.
//
// IMPORTANT API CONTRACT (supabaseDb):
//   select(table, cols, { eq: {...} })  — filters MUST live in options.eq
//   update(table, data, id)             — third arg is the ROW ID
//   delete(table, id)                   — second arg is the ROW ID
// A previous version passed filter objects directly (e.g. { team: 'AEK' }) —
// those filters were silently dropped / matched nothing, so edits & deletions
// reversed finances against wrong data or not at all. Do not regress this.
import { supabaseDb } from '../utils/supabase';

/** Types that live on `finances.debt` (everything else affects `balance`). */
const DEBT_TYPES = ['Echtgeld-Ausgleich', 'Echtgeld-Ausgleich (getilgt)'];

/**
 * Fetch a single finance row for a team, preferring the match's FIFA version.
 * Deleting an FC25 match while the app runs FC26 must reverse money in the
 * FC25 finances — never in the currently active version's bucket.
 */
async function getFinanceRow(team, version) {
  if (version) {
    const r = await supabaseDb.select('finances', '*', {
      eq: { team, fifa_version: version }, skipFifaFilter: true,
    });
    if (!r.error && r.data && r.data.length > 0) return r.data[0];
  }
  const { data, error } = await supabaseDb.select('finances', '*', { eq: { team } });
  if (error || !data || data.length === 0) return null;
  return data[0];
}

/** Reverse one transaction from the team's finances (clamped at 0). */
async function reverseTransaction(trans, version) {
  const fin = await getFinanceRow(trans.team, version);
  if (!fin) {
    console.warn(`No finance row for team ${trans.team} — cannot reverse ${trans.type}`);
    return;
  }
  if (DEBT_TYPES.includes(trans.type)) {
    // 'Echtgeld-Ausgleich' added +amount to the loser's debt;
    // '(getilgt)' reduced the winner's debt by |amount| (amount is negative).
    // Reversal for both: debt_new = debt - amount, clamped ≥ 0.
    const newDebt = Math.max(0, (fin.debt || 0) - trans.amount);
    await supabaseDb.update('finances', { debt: newDebt }, fin.id);
  } else {
    const newBalance = Math.max(0, (fin.balance || 0) - trans.amount);
    await supabaseDb.update('finances', { balance: newBalance }, fin.id);
  }
}

/**
 * Comprehensive match deletion with financial + stats reversal.
 * Also used by the edit flow (delete old state, then re-book the edited match).
 */
export async function deleteMatch(id) {
  // --- ID normalisation & validation -------------------------------------
  if (id === null || id === undefined) throw new Error('No match ID provided for deletion');
  let matchId;
  if (typeof id === 'string') {
    matchId = parseInt(id, 10);
    if (isNaN(matchId)) throw new Error(`Invalid match ID string: "${id}"`);
  } else if (typeof id === 'bigint') {
    const n = Number(id);
    matchId = BigInt(n) === id ? n : id;
  } else if (typeof id === 'number') {
    matchId = id;
  } else {
    throw new Error(`Unsupported match ID type: ${typeof id}`);
  }
  const validNumber = typeof matchId === 'number' && Number.isInteger(matchId) && matchId > 0;
  const validBigInt = typeof matchId === 'bigint' && matchId > 0n;
  if (!validNumber && !validBigInt) throw new Error(`Invalid match ID: ${matchId}`);

  // --- 1. Load the match (across ALL versions — ids are globally unique,
  // and an old-season match must stay deletable while a newer season runs).
  const { data: matchRows, error: matchError } = await supabaseDb.select(
    'matches',
    '*',
    { eq: { id: matchId }, skipFifaFilter: true }
  );
  if (matchError) throw matchError;
  if (!matchRows || matchRows.length === 0) {
    throw new Error(`Match with ID ${matchId} not found in database`);
  }
  const match = matchRows[0];
  // All reversals target the MATCH's season, not the currently active one.
  const matchVersion = match.fifa_version || null;

  // --- 2. Load this match's transactions ---------------------------------
  const { data: transRows, error: transError } = await supabaseDb.select(
    'transactions',
    '*',
    { eq: { match_id: matchId }, skipFifaFilter: true }
  );
  if (transError) throw transError;
  const matchTransactions = transRows || [];
  console.log(`deleteMatch(${matchId}): reversing ${matchTransactions.length} transactions`);

  // --- 3. Reverse financial effects --------------------------------------
  const prizeReversedFor = new Set();
  for (const trans of matchTransactions) {
    await reverseTransaction(trans, trans.fifa_version || matchVersion);
    if (trans.type === 'Preisgeld') prizeReversedFor.add(trans.team);
  }

  // Fallback ONLY when no Preisgeld transaction was recorded for a team
  // (e.g. legacy rows). Unconditional double-reversal was a bug.
  if (!prizeReversedFor.has('AEK') && typeof match.prizeaek === 'number' && match.prizeaek !== 0) {
    await reverseTransaction({ team: 'AEK', type: 'Preisgeld', amount: match.prizeaek }, matchVersion);
  }
  if (!prizeReversedFor.has('Real') && typeof match.prizereal === 'number' && match.prizereal !== 0) {
    await reverseTransaction({ team: 'Real', type: 'Preisgeld', amount: match.prizereal }, matchVersion);
  }

  // --- 4. Delete the transactions (by their real row ids) -----------------
  for (const trans of matchTransactions) {
    const { error: delError } = await supabaseDb.delete('transactions', trans.id);
    if (delError) throw delError;
  }
  const { data: remaining } = await supabaseDb.select('transactions', 'id', { eq: { match_id: matchId }, skipFifaFilter: true });
  if (remaining && remaining.length > 0) {
    throw new Error(`Transaction deletion incomplete: ${remaining.length} rows remain for match ${matchId}`);
  }

  // --- 5. Subtract player goals (own goals are never player stats) --------
  const parseList = (raw) => {
    try {
      if (typeof raw === 'string') return JSON.parse(raw) || [];
      if (Array.isArray(raw)) return raw;
    } catch { /* ignore */ }
    return [];
  };
  const removeGoals = async (goalslist, team) => {
    const goalCounts = {};
    for (const g of parseList(goalslist)) {
      const name = typeof g === 'object' && g !== null ? g.player : g;
      const cnt = typeof g === 'object' && g !== null ? (g.count || 1) : 1;
      if (!name || String(name).startsWith('Eigentore_')) continue;
      goalCounts[name] = (goalCounts[name] || 0) + cnt;
    }
    for (const [playerName, count] of Object.entries(goalCounts)) {
      // Version-aware: an FC25 match's scorer is the FC25 player row.
      const { data: players } = await supabaseDb.select('players', '*', {
        eq: { name: playerName, team }, skipFifaFilter: true,
      });
      if (!players || players.length === 0) {
        console.warn(`Player ${playerName} (${team}) not found for goal removal`);
        continue;
      }
      const player = players.find((p) => (p.fifa_version || 'FC25') === (matchVersion || 'FC25')) || players[0];
      const newGoals = Math.max(0, (player.goals || 0) - count);
      await supabaseDb.update('players', { goals: newGoals }, player.id);
    }
  };
  await removeGoals(match.goalslista, 'AEK');
  await removeGoals(match.goalslistb, 'Real');

  // --- 6. Reverse "Spieler des Spiels" ------------------------------------
  if (match.manofthematch) {
    let sdsTeam = null;
    const inList = (raw) => parseList(raw).some((g) =>
      (typeof g === 'object' && g !== null ? g.player : g) === match.manofthematch);
    if (inList(match.goalslista)) sdsTeam = 'AEK';
    else if (inList(match.goalslistb)) sdsTeam = 'Real';
    else {
      const { data: players } = await supabaseDb.select('players', 'team', { eq: { name: match.manofthematch } });
      if (players && players.length > 0) sdsTeam = players[0].team;
    }
    if (sdsTeam) {
      const { data: sdsRows } = await supabaseDb.select('spieler_des_spiels', '*', {
        eq: { name: match.manofthematch, team: sdsTeam }, skipFifaFilter: true,
      });
      if (sdsRows && sdsRows.length > 0) {
        const sds = sdsRows.find((s) => (s.fifa_version || 'FC25') === (matchVersion || 'FC25')) || sdsRows[0];
        await supabaseDb.update('spieler_des_spiels', { count: Math.max(0, (sds.count || 0) - 1) }, sds.id);
      }
    }
  }

  // --- 7. Delete the match record -----------------------------------------
  const { error: deleteError } = await supabaseDb.delete('matches', matchId);
  if (deleteError) throw deleteError;
  const { data: still } = await supabaseDb.select('matches', 'id', { eq: { id: matchId }, skipFifaFilter: true });
  if (still && still.length > 0) {
    throw new Error(`Match deletion failed: match ${matchId} still exists`);
  }

  console.log(`✅ deleteMatch(${matchId}) complete — transactions, finances, goals, SdS reversed`);

  // Keep open views (Finanzen, Duell, Stats) in sync without a tab switch.
  try { window.dispatchEvent(new CustomEvent('fusta-refresh')); } catch { /* no window */ }
}
