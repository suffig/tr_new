/**
 * Eine neue Saison anlegen — die Schritte, die dabei zwingend zusammengehören.
 *
 * Aus NewSeasonModal herausgeloest, damit der gefuehrte Saisonwechsel und das
 * Anlegen im Admin-Bereich dieselbe Logik benutzen. Die Reihenfolge ist der
 * heikle Teil und deshalb hier festgeschrieben:
 *
 *   1. Version lokal registrieren
 *   2. Vereinsangaben zusammenbauen (Basis + Ueberschreibungen)
 *   3. ZUERST in der Datenbank registrieren und das Ergebnis PRUEFEN
 *   4. erst dann lokal aktivieren
 *
 * Punkt 3 vor 4: eine Saison, die nur lokal existiert, ist fuer die andere
 * Person unsichtbar — und sobald fifa_version ein Fremdschluessel auf
 * fifa_versions ist, wuerde dort jeder Insert abgewiesen. Wer in einer solchen
 * Saison ein Spiel eintraegt, verliert es.
 */
import {
  addCustomFifaVersion,
  setCurrentFifaVersion,
  getCurrentFifaVersion,
  getAllFifaVersions,
} from './fifaVersionManager';
import { getVersionTeams, setVersionTeams } from './versionTeamManager';
import { pushVersionToDB, pushTeamsToDB, setActiveVersionInDB } from './fifaVersionsSync';

/**
 * Ist die ID als Saisonkennung brauchbar?
 *
 * Prueft auch, ob sie schon vergeben ist: das Anlegen wuerde die bestehende
 * Saison sonst ueberschreiben — samt Vereinsnamen und Wappen, und in der
 * Datenbank per Upsert. Aus FC25 mit acht Jahren Daten wuerde stillschweigend
 * die neue Saison.
 */
export function pruefeVersionsId(roh) {
  const id = String(roh || '').trim().toUpperCase();
  if (!id) return { ok: false, fehler: 'Die Saison braucht eine Kennung (z. B. FC27).' };
  if (!/^[A-Za-z]+\d*$/.test(id)) {
    return { ok: false, fehler: 'Kennung ungültig — Buchstaben, dann Ziffern (z. B. FC27, EA25).' };
  }
  if (Object.keys(getAllFifaVersions()).includes(id)) {
    return { ok: false, fehler: `${id} gibt es schon. Bitte eine andere Kennung wählen.` };
  }
  return { ok: true, id };
}

/**
 * @param {object} o
 * @param {string} o.id            Versionskennung, z. B. 'FC27'
 * @param {string} [o.name]        Anzeigename
 * @param {object} [o.teams]       { AEK: {label, short, logo}, Real: {...} }
 * @param {string} [o.basisVon]    Vereinsangaben dieser Saison als Grundlage
 * @param {boolean} [o.aktivieren] sofort zur laufenden Saison machen
 */
export async function legeSaisonAn({ id, name, teams = {}, basisVon = null, aktivieren = true }) {
  const geprueft = pruefeVersionsId(id);
  if (!geprueft.ok) throw new Error(geprueft.fehler);
  const version = geprueft.id;
  const anzeige = String(name || '').trim() || version;

  await addCustomFifaVersion(version, {
    displayName: anzeige,
    description: `Saison ${version}`,
    createdAt: new Date().toISOString(),
    createdBy: 'admin',
  });

  // Basis: entweder die Angaben einer bestehenden Saison oder die Vorgaben der
  // neuen. So bleiben Farbe, Wappen-Slot und "Ehemalige" erhalten, auch wenn
  // im Formular nur die Namen ausgefuellt wurden.
  const basis = getVersionTeams(basisVon || version);
  const konfig = JSON.parse(JSON.stringify(basis));
  for (const key of ['AEK', 'Real']) {
    konfig[key] = konfig[key] || {
      color: key === 'AEK' ? 'blue' : 'red', icon: key.toLowerCase(), customIcon: null,
    };
    const t = teams[key] || {};
    if (t.label?.trim()) konfig[key].label = t.label.trim();
    if (t.short?.trim()) konfig[key].short = t.short.trim();
    if (t.logo) konfig[key].customIcon = t.logo;
  }
  setVersionTeams(konfig, version);

  const reg = await pushVersionToDB(version, { name: anzeige, teams: konfig });
  if (!reg.ok) {
    throw new Error(
      'Die Saison konnte nicht in der Datenbank registriert werden und wurde deshalb ' +
      'NICHT aktiviert. Bitte Verbindung prüfen und erneut versuchen.'
    );
  }
  await pushTeamsToDB(version, konfig);

  if (aktivieren) {
    setCurrentFifaVersion(version);
    await setActiveVersionInDB(version);
  }

  return { version, anzeige, teams: konfig };
}

/**
 * Vorschlag für die nächste FREIE Kennung.
 *
 * Nicht einfach +1 auf die angesehene Saison: wer FC25 im Archiv betrachtet
 * und den Wechsel startet, bekaeme sonst FC26 vorgeschlagen — die es schon
 * gibt. Deshalb wird ab der hoechsten bekannten Nummer hochgezaehlt, bis eine
 * freie Kennung gefunden ist.
 */
export function naechsteVersionsId(aktuell = null) {
  const jetzt = aktuell || getCurrentFifaVersion();
  const m = String(jetzt).match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return '';
  const praefix = m[1];
  const stellen = m[2].length;

  const bekannt = new Set(Object.keys(getAllFifaVersions()));
  // Von der hoechsten bekannten Nummer mit diesem Praefix aus weiterzaehlen.
  let hoechste = Number(m[2]);
  for (const v of bekannt) {
    const t = String(v).match(new RegExp(`^${praefix}(\\d+)$`));
    if (t) hoechste = Math.max(hoechste, Number(t[1]));
  }
  for (let n = hoechste + 1; n <= hoechste + 50; n++) {
    // Zweistellig bleibt zweistellig: FC26 -> FC27.
    const kandidat = `${praefix}${String(n).padStart(stellen, '0')}`;
    if (!bekannt.has(kandidat)) return kandidat;
  }
  return '';
}
