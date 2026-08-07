#!/usr/bin/env node
/**
 * Erzeugt aus einer getippten Altsaison ein SQL-Importskript.
 *
 *   node scripts/altsaison-import.mjs fc15
 *
 * Liest scripts/altsaisons/<name>.mjs und schreibt db/<nr>_<version>_import.sql.
 * Danach steht ein Bericht im Terminal: Summen, zusammengefasste Schreibweisen
 * und die Namen, bei denen die Zuordnung offen blieb.
 *
 * Warum ueberhaupt ein Generator: die Rohdaten sind Strichlisten aus mehreren
 * Jahren. Derselbe Mensch steht dort in bis zu vier Schreibweisen ("Oduamadi",
 * "Oduamardi", "Oduarmadi", "Odumardi"), und die Torliste enthaelt Spieler, die
 * im Endkader nicht mehr auftauchen. Von Hand fasst man das nicht sauber
 * zusammen — und merkt den Fehler erst, wenn die Torsumme nicht mehr stimmt.
 * Deshalb prueft das Skript am Ende gegen die Rohsumme.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Wie nameKey() in src/utils/playerIdentity.js — muss gleich bleiben. */
export const nkey = (n) =>
  String(n ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * "Martins 189|Uche 152" -> [['Martins', 189], ['Uche', 152]]
 *
 * Absichtlich nachsichtig, weil jede Saison anders getippt wurde: mal
 * "Uche 152", mal "Aubameyang 58x", mal "Stranzl 1,5Mx" oder "Neuer 45M x".
 * Erlaubt sind also Komma als Dezimaltrenner und ein Schwanz aus M/x/€/Haken.
 */
export function paare(text) {
  const out = [];
  for (const teil of String(text ?? '').split(/[|\n]/)) {
    const t = teil.trim();
    if (!t) continue;
    const m = t.match(/^(.+?)\s+([\d]+(?:[.,][\d]+)?)\s*[Mm]?\s*[x✔✓]?\s*€?\s*$/);
    if (m) out.push([m[1].trim(), Number(m[2].replace(',', '.'))]);
    else out.push([t, NaN]); // faellt unten als unlesbar auf, statt still zu fehlen
  }
  return out.filter(([, n]) => {
    if (Number.isNaN(n)) return false;
    return true;
  });
}

/** Zeilen, die paare() NICHT lesen konnte — damit nichts still verschwindet. */
export function unlesbar(text) {
  return String(text ?? '')
    .split(/[|\n]/)
    .map((t) => t.trim())
    .filter((t) => t && !/^(.+?)\s+([\d]+(?:[.,][\d]+)?)\s*[Mm]?\s*[x✔✓]?\s*€?\s*$/.test(t));
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

/** Sperrdauern wie die App sie vorgibt. */
const DAUER = { 'Gelb-Rote Karte': 1, 'Rote Karte': 2, Verletzung: 3 };

/** Kuerzel aus den handgetippten Listen. */
const ART_KURZ = {
  v: 'Verletzung', verletzung: 'Verletzung',
  r: 'Rote Karte', rot: 'Rote Karte', rotekarte: 'Rote Karte',
  gr: 'Gelb-Rote Karte', gelbrot: 'Gelb-Rote Karte', gelbrotekarte: 'Gelb-Rote Karte',
};

const artNormal = (a) => {
  const roh = String(a).trim();
  const k = roh.toLowerCase().replace(/[^a-z]/g, '');
  if (ART_KURZ[k]) return ART_KURZ[k];
  return roh
    .replace(/Gelb-Rote-Karte/g, 'Gelb-Rote Karte')
    .replace(/Rote-Karte/g, 'Rote Karte')
    .replace(/Gelb-Rote Karte Karte/g, 'Gelb-Rote Karte');
};

/**
 * Eine Sperr-Zeile lesen. Zwei Schreibweisen, beide kommen in den Rohdaten vor:
 *   "Carvalho|Gelb-Rote-Karte"   (FC15)
 *   "Martins V ✔"                (FC16 — Kuerzel + abgesessen-Haken)
 * Der Haken ist keine Deko: ❌ heisst, die Sperre lief noch. Dann bleibt
 * matchesserved 0 und die Sperre steht in der App als offen.
 */
function sperrZeile(zeile) {
  const roh = zeile.trim();
  if (!roh) return null;
  if (roh.includes('|')) {
    const [n, a] = roh.split('|');
    return { name: n.trim(), art: artNormal(a), abgesessen: true };
  }
  const m = roh.match(/^(.+?)\s+(V|R|G-?R|Verletzung|Rote[- ]?Karte|Gelb-?Rote[- ]?Karte)\s*([✔✓x])?\s*(❌|✗)?\s*$/i);
  if (!m) return null;
  return { name: m[1].trim(), art: artNormal(m[2]), abgesessen: !m[4] };
}

export function baue(saison) {
  const { version, name, teams, kader = {}, tore, sds, sperren = '', konten = {} } = saison;
  const varianten = saison.varianten || {};
  const unklar = new Set((saison.unklar || []).map(nkey));

  /** Zielschreibweise + Schluessel fuer einen Rohnamen. */
  const ziel = (roh) => {
    const k = nkey(roh);
    if (unklar.has(k)) return [String(roh).trim(), k];
    const v = varianten[k];
    if (v) return [v, nkey(v)];
    return [String(roh).trim(), k];
  };

  // --- Kader zuerst: er bestimmt Team, Marktwert und Anzeigenamen -----------
  const ausKader = new Map();
  for (const [team, liste] of Object.entries(kader)) {
    for (const [roh, wert] of paare(liste)) {
      const [anzeige, k] = ziel(roh);
      ausKader.set(k, { name: anzeige, team, value: wert });
    }
  }

  const spieler = new Map();
  const merke = (roh, tore = 0) => {
    const [anzeige, k] = ziel(roh);
    let e = spieler.get(k);
    if (!e) {
      const kad = ausKader.get(k);
      e = { name: kad?.name ?? anzeige, team: kad?.team ?? null, goals: 0, value: kad?.value ?? 0 };
      spieler.set(k, e);
    }
    e.goals += tore;
    return k;
  };

  for (const k of ausKader.keys()) merke(ausKader.get(k).name);
  const torListe = paare(tore);
  for (const [n, c] of torListe) merke(n, Math.round(c));

  // SdS je Spieler zusammenfassen: in den Rohdaten stehen Namen teils doppelt
  // ("Hernandez 5" ... "Hernandez 1"), die App erwartet eine Zeile je Saison.
  const sdsListe = paare(sds);
  const sdsSumme = new Map();
  for (const [roh, c] of sdsListe) {
    const [anzeige, k] = ziel(roh);
    if (nkey(anzeige) !== 'unbekannt') merke(roh);
    const e = sdsSumme.get(k) || { name: anzeige, count: 0 };
    e.name = spieler.get(k)?.name ?? anzeige;
    e.count += Math.round(c);
    sdsSumme.set(k, e);
  }

  const sperrListe = [];
  const sperrenUnlesbar = [];
  for (const zeile of String(sperren).trim().split('\n')) {
    if (!zeile.trim()) continue;
    const s = sperrZeile(zeile);
    if (!s) { sperrenUnlesbar.push(zeile.trim()); continue; }
    sperrListe.push({ k: merke(s.name), art: s.art, abgesessen: s.abgesessen });
  }
  if (sperrenUnlesbar.length) {
    throw new Error(
      `Sperr-Zeilen nicht lesbar: ${sperrenUnlesbar.join(' / ')} — ` +
      'sonst fehlen sie still im Import.'
    );
  }

  // Wer keinem Kader zuzuordnen ist: die Kaderliste ist der Endstand, die Tore
  // liefen ueber die ganze Saison — inklusive abgegebener Spieler.
  for (const e of spieler.values()) if (!e.team) e.team = 'Ehemalige';

  // Die Sperren haengen ueber den NAMEN an der Spielerzeile. Zwei Spieler mit
  // demselben Anzeigenamen wuerden den join verdoppeln — dann lieber abbrechen.
  const proName = new Map();
  for (const e of spieler.values()) proName.set(e.name, (proName.get(e.name) || 0) + 1);
  const doppelt = [...proName].filter(([, n]) => n > 1).map(([n]) => n);
  if (doppelt.length) {
    throw new Error(
      `Anzeigenamen doppelt vergeben: ${doppelt.join(', ')} — ` +
      'die Sperren wuerden sich vervielfachen. Varianten in der Saisondatei klaeren.'
    );
  }

  // --- SQL ------------------------------------------------------------------
  const z = [];
  const A = (s) => z.push(s);
  const rohTore = torListe.reduce((s, [, c]) => s + Math.round(c), 0);
  const summeTore = [...spieler.values()].reduce((s, e) => s + e.goals, 0);

  A('-- ============================================================================');
  A(`--  IMPORT — Saison ${name}  (Legacy: nur Gesamtzahlen, keine Einzelspiele)`);
  A('-- ============================================================================');
  A('--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,');
  A(`--  sondern scripts/altsaisons/${String(version).toLowerCase()}.mjs anpassen.`);
  A('--');
  A('--  VORHER: Backup anlegen (Supabase -> Database -> Backups).');
  A('--');
  A(`--  ${spieler.size} Spieler (${summeTore} Tore), ${sperrListe.length} Sperren,`);
  A(`--  ${sdsSumme.size} SdS-Zeilen, ${Object.keys(konten).length} Kontostaende.`);
  A('--');
  A('--  Aus dieser Zeit gibt es KEINE einzelnen Spiele, nur Summen. Bilanz,');
  A('--  Duell, Form und Echtgeld bleiben deshalb leer — das ist die Datenlage,');
  A('--  kein Fehler. Die App kennzeichnet die Saison ueber LEGACY_SAISONS in');
  A('--  src/utils/legacySaison.js entsprechend.');
  A('--');
  A('--  Sperrdauern sind geschaetzt (Gelb-Rot 1, Rot 2, Verletzung 3 Spiele —');
  A('--  die Vorgaben der App); in den Rohdaten stand nur "abgesessen".');
  A('--');
  A('--  Wiederholbar: loescht zuerst alles dieser Saison und legt es neu an.');
  A('-- ============================================================================');
  A('');
  A('begin;');
  A('');
  A('-- 1) Saison registrieren. Die App liest teams direkt aus dieser Spalte');
  A('--    (fifaVersionsSync.js) — color/icon/customIcon muessen mit rein,');
  A('--    sonst fehlen die Vereinsfarben.');
  A('insert into public.fifa_versions (id, name, is_active, teams) values (');
  A(`  ${q(version)}, ${q(name)}, false,`);
  const teamJson = {
    AEK: { color: 'blue', icon: 'aek', customIcon: null, ...(teams?.AEK || {}) },
    Real: { color: 'red', icon: 'real', customIcon: null, ...(teams?.Real || {}) },
    Ehemalige: { label: 'Ehemalige', short: 'Ehem.', color: 'gray', icon: '⚫', customIcon: null },
  };
  A(`  '${JSON.stringify(teamJson).replace(/'/g, "''")}'::jsonb)`);
  A('on conflict (id) do update set name = excluded.name, teams = excluded.teams;');
  A('');
  A('-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)');
  for (const t of ['bans', 'spieler_des_spiels', 'players', 'finances']) {
    A(`delete from public.${t} where fifa_version = ${q(version)};`);
  }
  A('');
  A('-- 3) Spieler');
  A('insert into public.players (name, team, goals, value, fifa_version) values');
  A([...spieler.values()]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .map((e) => `  (${q(e.name)}, ${q(e.team)}, ${e.goals}, ${e.value}, ${q(version)})`)
    .join(',\n') + ';');
  A('');
  A('-- 4) Spieler des Spiels — eine Zeile je Spieler');
  A('insert into public.spieler_des_spiels (name, team, count, fifa_version) values');
  A([...sdsSumme.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
    .map(([k, e]) =>
      `  (${q(e.name)}, ${q(spieler.get(k)?.team ?? 'Ehemalige')}, ${e.count}, ${q(version)})`)
    .join(',\n') + ';');
  A('');
  if (sperrListe.length) {
    // Werteliste + join, NICHT ein "select … limit 1 union all select … limit 1":
    // Postgres verbietet LIMIT direkt vor UNION (ERROR 42601, syntax error at
    // or near "union"). Ausserdem ist das hier kuerzer und lesbar.
    A('-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.');
    A('--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),');
    A('--    der join trifft also genau einmal.');
    A('insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)');
    A('select p.id, p.team, s.art, s.dauer, s.abgesessen, s.art, ' + q(version));
    A('from (values');
    A(sperrListe
      .map(({ k, art, abgesessen }) => {
        const d = DAUER[art] ?? 2;
        return `  (${q(spieler.get(k).name)}, ${q(art)}, ${d}, ${abgesessen ? d : 0})`;
      })
      .join(',\n'));
    A(') as s(name, art, dauer, abgesessen)');
    A(`join public.players p on p.fifa_version = ${q(version)} and p.name = s.name;`);
    A('');
  }
  if (Object.keys(konten).length) {
    A('-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.');
    A('insert into public.finances (team, balance, debt, fifa_version) values');
    A(Object.entries(konten)
      .map(([t, b]) => `  (${q(t)}, ${Math.round(b)}, 0, ${q(version)})`)
      .join(',\n') + ';');
    A('');
  }
  A('commit;');
  A('');
  A('-- Kontrolle');
  A(`select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = ${q(version)}`);
  A(`union all select 'Sperren', count(*), null from public.bans where fifa_version = ${q(version)}`);
  A(`union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = ${q(version)}`);
  A(`union all select 'Konten', count(*), null from public.finances where fifa_version = ${q(version)};`);

  // --- Bericht --------------------------------------------------------------
  const gesehen = new Map();
  for (const roh of [
    ...torListe.map(([n]) => n),
    ...sdsListe.map(([n]) => n),
    ...Object.values(kader).flatMap((l) => paare(l).map(([n]) => n)),
    ...String(sperren).trim().split('\n').map(sperrZeile).filter(Boolean).map((s) => s.name),
  ]) {
    const [, k] = ziel(roh);
    if (!gesehen.has(k)) gesehen.set(k, new Set());
    gesehen.get(k).add(roh.trim());
  }

  // Unlesbare Zeilen melden — eine vertippte Zeile faellt sonst still weg.
  const uebrig = [
    ...unlesbar(tore).map((t) => `Tore: ${t}`),
    ...unlesbar(sds).map((t) => `SdS: ${t}`),
    ...Object.entries(kader).flatMap(([team, l]) => unlesbar(l).map((t) => `Kader ${team}: ${t}`)),
  ];
  if (uebrig.length) {
    throw new Error(`Nicht lesbare Zeilen:\n  ${uebrig.join('\n  ')}`);
  }

  return {
    sql: z.join('\n') + '\n',
    bericht: {
      spieler: spieler.size,
      offeneSperren: sperrListe.filter((s) => !s.abgesessen).length,
      proTeam: [...new Set([...spieler.values()].map((e) => e.team))].map((t) => {
        const l = [...spieler.values()].filter((e) => e.team === t);
        return { team: t, anzahl: l.length, tore: l.reduce((s, e) => s + e.goals, 0) };
      }),
      tore: summeTore,
      rohTore,
      stimmt: summeTore === rohTore,
      sperren: sperrListe.length,
      sdsZeilen: sdsSumme.size,
      sdsGesamt: [...sdsSumme.values()].reduce((s, e) => s + e.count, 0),
      sdsRoh: sdsListe.reduce((s, [, c]) => s + Math.round(c), 0),
      zusammengefasst: [...gesehen.entries()]
        .filter(([, v]) => v.size > 1)
        .map(([k, v]) => `${spieler.get(k)?.name ?? k} <- ${[...v].sort().join(' / ')}`)
        .sort(),
      offen: [...spieler.values()].filter((e) => unklar.has(nkey(e.name))).map((e) => e.name),
    },
  };
}

// --- Aufruf ----------------------------------------------------------------
const arg = process.argv[2];
if (!arg) {
  const da = readdirSync(resolve(wurzel, 'scripts/altsaisons')).filter((f) => f.endsWith('.mjs'));
  console.error(`Aufruf: node scripts/altsaison-import.mjs <saison>\nVorhanden: ${da.map((f) => f.replace('.mjs', '')).join(', ')}`);
  process.exit(1);
}

const quelle = resolve(wurzel, `scripts/altsaisons/${arg}.mjs`);
const saison = (await import(pathToFileURL(quelle).href)).default;
const { sql, bericht } = baue(saison);

// Syntax pruefen, BEVOR die Datei jemanden erreicht. libpg_query ist dieselbe
// Grammatik, die der Server benutzt — was hier durchgeht, geht auch in Supabase
// durch. Anlass: ein "select … limit 1 union all select … limit 1" ist gueltig
// aussehendes, aber unzulaessiges SQL (Postgres verbietet LIMIT vor UNION) und
// fiel erst im SQL-Editor auf.
try {
  const { parse } = await import('pgsql-parser');
  const { stmts } = await parse(sql);
  console.log(`Syntax geprueft (libpg_query): ${stmts.length} Anweisungen ✓`);
} catch (e) {
  if (e?.code === 'ERR_MODULE_NOT_FOUND') {
    console.warn('Hinweis: pgsql-parser fehlt — Syntax ungeprueft (npm i -D pgsql-parser).');
  } else {
    console.error(`\nSYNTAXFEHLER im erzeugten SQL: ${e.message}`);
    console.error('Nicht geschrieben. Bitte den Generator korrigieren.');
    process.exit(3);
  }
}

const nr = String(saison.dateiNummer ?? 11).padStart(2, '0');
const ziel = resolve(wurzel, `db/${nr}_${String(saison.version).toLowerCase()}_import.sql`);
writeFileSync(ziel, sql, 'utf8');

console.log(`geschrieben: db/${nr}_${String(saison.version).toLowerCase()}_import.sql\n`);
console.log(`Spieler gesamt: ${bericht.spieler}`);
for (const t of bericht.proTeam) {
  console.log(`  ${t.team.padEnd(10)} ${String(t.anzahl).padStart(2)} Spieler, ${String(t.tore).padStart(4)} Tore`);
}
console.log(`Tore gesamt:   ${bericht.tore}  (Rohdaten: ${bericht.rohTore}) ${bericht.stimmt ? '✓' : '✗ WEICHT AB'}`);
console.log(`Sperren:       ${bericht.sperren}` +
  (bericht.offeneSperren ? `  (davon ${bericht.offeneSperren} nicht abgesessen)` : ''));
console.log(`SdS:           ${bericht.sdsZeilen} Zeilen, ${bericht.sdsGesamt} gesamt (roh ${bericht.sdsRoh})`);
if (bericht.zusammengefasst.length) {
  console.log('\nZusammengefasste Schreibweisen:');
  for (const z of bericht.zusammengefasst) console.log('  ' + z);
}
if (bericht.offen.length) {
  console.log('\nUnklar geblieben (stehen als eigener Eintrag da): ' + bericht.offen.join(', '));
}
if (!bericht.stimmt) {
  console.error('\nFEHLER: Torsumme weicht von den Rohdaten ab — nicht importieren.');
  process.exit(2);
}
