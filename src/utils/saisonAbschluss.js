/**
 * Was beim Abschluss einer Saison zu klären ist.
 *
 * Der Saisonwechsel ist der einzige Moment, in dem man eine Saison noch
 * vollständig überblickt. Danach ist sie Archiv, und offene Posten stehen für
 * immer offen da — eine nicht beglichene Echtgeld-Rechnung ebenso wie eine
 * halb abgesessene Sperre. Deshalb wird hier zusammengetragen, was noch hängt,
 * BEVOR die neue Saison beginnt.
 *
 * Absichtlich nur eine Bestandsaufnahme: die Funktion aendert nichts. Was
 * damit geschieht, entscheidet die Oberflaeche zusammen mit dem Nutzer.
 */

export const OFFEN_SCHULDEN = 'schulden';
export const OFFEN_SPERREN = 'sperren';
export const OFFEN_ENTWURF = 'entwurf';

const KEY_ENTWURF = 'fusta_match_draft';

/** Endstand und offene Punkte einer Saison. */
export function saisonAbschluss({ version, matches, players, finances, bans }) {
  const inSaison = (x) => (x?.fifa_version || 'FC25') === version;

  const spiele = (matches || []).filter(inSaison);
  const kader = (players || []).filter(inSaison);
  const konten = (finances || []).filter(inSaison);
  const sperren = (bans || []).filter(inSaison);

  let siegeAek = 0, siegeReal = 0, unentschieden = 0, toreAek = 0, toreReal = 0;
  for (const m of spiele) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    toreAek += a; toreReal += b;
    if (a > b) siegeAek++; else if (b > a) siegeReal++; else unentschieden++;
  }

  const proTeam = (team) => {
    const eigene = kader.filter((p) => p.team === team);
    return {
      spieler: eigene.length,
      kaderwert: eigene.reduce((s, p) => s + (Number(p.value) || 0), 0),
      konto: konten.find((f) => f.team === team)?.balance ?? 0,
      schulden: konten.find((f) => f.team === team)?.debt ?? 0,
    };
  };

  const aek = proTeam('AEK');
  const real = proTeam('Real');

  const torschuetzenkoenig = [...kader]
    .filter((p) => (Number(p.goals) || 0) > 0)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0))[0] || null;

  // Sperren, die nicht zu Ende abgesessen sind. Sie verfallen mit der Saison —
  // Sperren haengen ueber player_id an einer Spielerzeile, und die gibt es in
  // der neuen Saison nicht mehr.
  const offeneSperren = sperren.filter(
    (b) => (b.matchesserved ?? 0) < (b.totalgames ?? 0)
  );

  // Ein liegengebliebener Spielentwurf wuerde in der neuen Saison mit den
  // Spielern der alten wieder auftauchen.
  let entwurf = null;
  try {
    const roh = localStorage.getItem(KEY_ENTWURF);
    if (roh) entwurf = JSON.parse(roh);
  } catch { /* kein Entwurf */ }

  const offen = [];
  if (aek.schulden > 0 || real.schulden > 0) {
    offen.push({
      art: OFFEN_SCHULDEN,
      titel: 'Offene Echtgeld-Rechnung',
      text: aek.schulden > 0
        ? `Alexander schuldet ${aek.schulden.toLocaleString('de-DE')} €.`
        : `Philip schuldet ${real.schulden.toLocaleString('de-DE')} €.`,
      hinweis: 'Nach dem Wechsel steht sie in einer abgeschlossenen Saison.',
    });
  }
  if (offeneSperren.length) {
    offen.push({
      art: OFFEN_SPERREN,
      titel: `${offeneSperren.length} ${offeneSperren.length === 1 ? 'Sperre' : 'Sperren'} nicht abgesessen`,
      text: offeneSperren
        .map((b) => kader.find((p) => p.id === b.player_id)?.name)
        .filter(Boolean).join(', ') || 'Spieler nicht mehr auffindbar',
      hinweis: 'Sperren gelten je Saison und verfallen mit ihr.',
    });
  }
  if (entwurf) {
    offen.push({
      art: OFFEN_ENTWURF,
      titel: 'Spielentwurf liegt noch',
      text: 'Ein begonnenes Spiel wurde nie abgeschlossen.',
      hinweis: 'In der neuen Saison stünde es mit den alten Spielern da.',
    });
  }

  return {
    version,
    spiele: spiele.length,
    siegeAek, siegeReal, unentschieden, toreAek, toreReal,
    sieger: siegeAek === siegeReal ? null : (siegeAek > siegeReal ? 'AEK' : 'Real'),
    aek, real,
    torschuetzenkoenig,
    sperren: sperren.length,
    offeneSperren,
    offen,
    // Das ist die Zahl, mit der es in der neuen Saison weitergeht.
    budget: {
      AEK: Math.round(aek.konto) + Math.round(aek.kaderwert * 1_000_000),
      Real: Math.round(real.konto) + Math.round(real.kaderwert * 1_000_000),
    },
  };
}

/** Liegengebliebenen Spielentwurf verwerfen. */
export function verwerfeEntwurf() {
  try {
    localStorage.removeItem(KEY_ENTWURF);
    return true;
  } catch {
    return false;
  }
}
