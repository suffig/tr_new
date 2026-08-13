/**
 * Hall of Fame — die Titel einer Saison.
 *
 * WAS AUS WELCHER QUELLE KOMMT
 * Die Datenlage ist je Saison verschieden, und das entscheidet, welche Titel
 * es überhaupt geben kann:
 *
 *   players        Tore, Marktwert, Team — für ALLE Saisons, auch die
 *                  importierten Altsaisons (dort gibt es nur Gesamtzahlen).
 *   bans           Sperren mit Art und Dauer, hängen an der Spielerzeile.
 *   spieler_des_spiels  Auszeichnungen je Saison.
 *   matches        Einzelspiele — die gibt es erst ab FC25. Alles, was ein
 *                  einzelnes Spiel braucht ("meiste Tore in einem Spiel",
 *                  "bester Schnitt"), fehlt davor.
 *
 * KEIN TITEL OHNE TRÄGER
 * Ein Titel, den niemand gewonnen hat, wird nicht vergeben — statt „—" oder
 * „keine Angabe" fällt die Kachel weg. Eine leere Auszeichnung ist keine.
 *
 * GLEICHSTAND WIRD BENANNT
 * Bei mehreren Bestwerten steht die Zahl der Gleichauf dabei, statt willkürlich
 * einen zu küren. Wer zufällig alphabetisch vorn liegt, hat nichts gewonnen.
 */

import { nameKey } from './playerIdentity';

/** Eigentore stehen als "Eigentore_AEK"/"Eigentore_Real" in derselben Liste. */
const istEigentor = (n) => String(n || '').startsWith('Eigentore_');

/** Eine Torschützenliste in [{name, anzahl}] bringen — beide Altformate. */
function schuetzen(roh) {
  let liste = roh;
  if (typeof roh === 'string') { try { liste = JSON.parse(roh); } catch { return []; } }
  if (!Array.isArray(liste)) return [];
  return liste.map((g) => {
    const o = typeof g === 'object' && g !== null;
    return { name: o ? g.player : g, anzahl: o ? (Number(g.count) || 1) : 1 };
  }).filter((g) => g.name && !istEigentor(g.name));
}

/**
 * Den Besten aus einer Map name -> Zahl ziehen.
 *
 * Gibt zusätzlich zurück, wie viele denselben Wert haben — ohne das würde bei
 * Gleichstand einer gekürt, der nur zufällig zuerst in der Liste stand.
 */
function bester(zaehler, mindestens = 1) {
  let spitze = null;
  for (const [name, wert] of zaehler) {
    if (wert < mindestens) continue;
    if (!spitze || wert > spitze.wert) spitze = { name, wert };
  }
  if (!spitze) return null;
  const gleichauf = [...zaehler.values()].filter((w) => w === spitze.wert).length;
  return { ...spitze, gleichauf };
}

/**
 * Alle Saisons, für die es Titel geben kann — neueste zuerst.
 *
 * Aus den SPIELERZEILEN, nicht aus den Spielen: die Altsaisons haben Spieler,
 * aber keine Einzelspiele. Nur nach Spielen zu gehen hiesse, sieben Saisons
 * zu verschweigen.
 */
export function saisonsMitTiteln(players) {
  const raus = new Set();
  for (const p of players || []) if (p?.fifa_version) raus.add(p.fifa_version);
  return [...raus].sort(
    (a, b) => (parseInt(String(b).replace(/\D/g, ''), 10) || 0)
            - (parseInt(String(a).replace(/\D/g, ''), 10) || 0)
  );
}

/**
 * Die Titel einer Saison.
 *
 * `vorsaison` ist die davor liegende Version (oder null) — nur für den
 * Aufsteiger, der ohne Vergleichswert nicht zu bilden ist.
 */
export function titelDerSaison({ version, players, matches, bans, sds, vorsaison = null }) {
  const zeilen = (players || []).filter((p) => p.fifa_version === version);
  if (!zeilen.length) return { version, titel: [], spiele: 0, spieler: 0 };

  const spiele = (matches || []).filter((m) => (m.fifa_version || 'FC25') === version);
  const titel = [];

  // ── Torschützenkönig ───────────────────────────────────────────────────
  // Aus players.goals: das ist die einzige Quelle, die auch die Altsaisons
  // kennt. Für FC25/FC26 stimmt sie mit den Torschützenlisten überein.
  {
    const z = new Map();
    for (const p of zeilen) if ((p.goals || 0) > 0) {
      z.set(p.name, Math.max(z.get(p.name) || 0, Number(p.goals) || 0));
    }
    const b = bester(z);
    if (b) titel.push({
      id: 'torschuetzenkoenig', titel: 'Torschützenkönig', icon: 'football',
      farbe: 'text-system-orange', name: b.name,
      wert: `${b.wert} ${b.wert === 1 ? 'Tor' : 'Tore'}`,
      gleichauf: b.gleichauf,
    });
  }

  // ── Spieler des Spiels ─────────────────────────────────────────────────
  {
    const z = new Map();
    for (const s of sds || []) {
      if ((s.fifa_version || 'FC25') !== version) continue;
      z.set(s.name, (z.get(s.name) || 0) + (Number(s.count) || 0));
    }
    const b = bester(z);
    if (b) titel.push({
      id: 'sds', titel: 'Spieler des Spiels', icon: 'star',
      farbe: 'text-system-blue', name: b.name,
      wert: `${b.wert}×`, gleichauf: b.gleichauf,
    });
  }

  // ── Verletzungen: Anzahl UND Dauer ─────────────────────────────────────
  // Zwei Zahlen, weil sie Verschiedenes sagen: dreimal kurz ausgefallen ist
  // etwas anderes als einmal für acht Spiele.
  const nachId = new Map(zeilen.map((p) => [p.id, p]));
  {
    const anzahl = new Map(), dauer = new Map();
    for (const b of bans || []) {
      const p = nachId.get(b.player_id);
      if (!p) continue;
      if (!/verletz/i.test(String(b.type || ''))) continue;
      anzahl.set(p.name, (anzahl.get(p.name) || 0) + 1);
      dauer.set(p.name, (dauer.get(p.name) || 0) + (Number(b.totalgames) || 0));
    }
    const b = bester(anzahl);
    if (b) titel.push({
      id: 'verletzungen', titel: 'Lazarett', icon: 'ban',
      farbe: 'text-system-orange', name: b.name,
      wert: `${b.wert}× verletzt`,
      zusatz: `${dauer.get(b.name) || 0} ${(dauer.get(b.name) || 0) === 1 ? 'Spiel' : 'Spiele'} verpasst`,
      gleichauf: b.gleichauf,
    });
  }

  // ── Grobian: Sperren wegen Karten ──────────────────────────────────────
  // Getrennt von den Verletzungen — das eine ist Pech, das andere Verhalten.
  {
    const z = new Map();
    for (const b of bans || []) {
      const p = nachId.get(b.player_id);
      if (!p) continue;
      const art = String(b.type || '');
      if (!/rot|gelb/i.test(art)) continue;
      z.set(p.name, (z.get(p.name) || 0) + 1);
    }
    const b = bester(z);
    if (b) titel.push({
      id: 'grobian', titel: 'Grobian', icon: 'ban',
      farbe: 'text-system-red', name: b.name,
      wert: `${b.wert} ${b.wert === 1 ? 'Sperre' : 'Sperren'}`,
      zusatz: 'wegen Rot oder Gelb-Rot', gleichauf: b.gleichauf,
    });
  }

  // ── Teuerster Spieler ──────────────────────────────────────────────────
  {
    const z = new Map();
    for (const p of zeilen) if ((Number(p.value) || 0) > 0) {
      z.set(p.name, Math.max(z.get(p.name) || 0, Number(p.value)));
    }
    const b = bester(z);
    if (b) titel.push({
      id: 'teuerster', titel: 'Teuerster Spieler', icon: 'euro',
      farbe: 'text-system-teal', name: b.name,
      wert: `${String(b.wert).replace('.', ',')} Mio €`, gleichauf: b.gleichauf,
    });
  }

  // ── Aufsteiger: groesster Torzuwachs gegenueber der Vorsaison ──────────
  if (vorsaison) {
    const vorher = new Map();
    for (const p of players || []) {
      if (p.fifa_version !== vorsaison) continue;
      vorher.set(nameKey(p.name), Number(p.goals) || 0);
    }
    const z = new Map();
    for (const p of zeilen) {
      const alt = vorher.get(nameKey(p.name));
      // Nur wer schon da war: ein Neuzugang "steigert" sich nicht von 0,
      // er faengt an. Das waere sonst automatisch der beste Aufsteiger.
      if (alt == null) continue;
      const zuwachs = (Number(p.goals) || 0) - alt;
      if (zuwachs > 0) z.set(p.name, zuwachs);
    }
    const b = bester(z);
    if (b) titel.push({
      id: 'aufsteiger', titel: 'Aufsteiger', icon: 'trendingUp',
      farbe: 'text-system-green', name: b.name,
      wert: `+${b.wert} ${b.wert === 1 ? 'Tor' : 'Tore'}`,
      zusatz: `gegenüber ${vorsaison}`, gleichauf: b.gleichauf,
    });
  }

  // ── Eiserner: meiste Saisons am Stueck, bis einschliesslich dieser ─────
  {
    const proPerson = new Map();
    for (const p of players || []) {
      const k = nameKey(p.name);
      if (!proPerson.has(k)) proPerson.set(k, { name: p.name, versionen: new Set() });
      proPerson.get(k).versionen.add(p.fifa_version);
    }
    const nummer = (v) => parseInt(String(v).replace(/\D/g, ''), 10) || 0;
    const jetzt = nummer(version);
    const z = new Map();
    for (const { name, versionen } of proPerson.values()) {
      const zahlen = new Set([...versionen].map(nummer));
      if (!zahlen.has(jetzt)) continue;      // in dieser Saison nicht dabei
      let lauf = 0;
      for (let n = jetzt; zahlen.has(n); n--) lauf += 1;
      z.set(name, lauf);
    }
    const b = bester(z, 2);   // eine einzelne Saison ist keine Serie
    if (b) titel.push({
      id: 'eiserner', titel: 'Eiserner', icon: 'calendar',
      farbe: 'text-system-purple', name: b.name,
      wert: `${b.wert} Saisons am Stück`, gleichauf: b.gleichauf,
    });
  }

  // ── Nur mit Einzelspielen: Tore in einem Spiel, bester Schnitt ─────────
  if (spiele.length) {
    const besteEinzel = new Map();
    const summe = new Map(), trefferspiele = new Map();
    for (const m of spiele) {
      for (const feld of ['goalslista', 'goalslistb']) {
        for (const g of schuetzen(m?.[feld])) {
          besteEinzel.set(g.name, Math.max(besteEinzel.get(g.name) || 0, g.anzahl));
          summe.set(g.name, (summe.get(g.name) || 0) + g.anzahl);
          trefferspiele.set(g.name, (trefferspiele.get(g.name) || 0) + 1);
        }
      }
    }

    const b1 = bester(besteEinzel, 2);   // ein einzelnes Tor ist kein Rekord
    if (b1) titel.push({
      id: 'packer', titel: 'Meiste Tore in einem Spiel', icon: 'zap',
      farbe: 'text-system-yellow', name: b1.name,
      wert: `${b1.wert} Tore`, gleichauf: b1.gleichauf,
    });

    // Bester Schnitt — nur bei mindestens drei Trefferspielen. Wer einmal
    // dreimal trifft, hat einen Schnitt von 3,0 und sagt damit nichts aus.
    const schnitt = new Map();
    for (const [name, n] of trefferspiele) {
      if (n < 3) continue;
      schnitt.set(name, Math.round(((summe.get(name) || 0) / n) * 10) / 10);
    }
    const b2 = bester(schnitt);
    if (b2) titel.push({
      id: 'schnitt', titel: 'Bester Schnitt', icon: 'trendingUp',
      farbe: 'text-system-green', name: b2.name,
      wert: `${String(b2.wert).replace('.', ',')} Tore je Spiel`,
      zusatz: `aus ${trefferspiele.get(b2.name)} Spielen mit Tor`,
      gleichauf: b2.gleichauf,
    });
  }

  return { version, titel, spiele: spiele.length, spieler: zeilen.length };
}
