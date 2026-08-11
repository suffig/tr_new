import { useMemo, useEffect, useState } from 'react';
import Icon from '../../icons/Icon';
import {
  gluecksIndex, katalogSchnitt, proWoche, proSaison, duellBilanz,
} from '../../../utils/ziehungsStatistik';
import { loadSterne, duelleAusHistorie } from '../../../utils/sterneCounter';
import { fetchAlleSaisonZiehungen } from '../../../utils/teamCollection';

// Vier Auswertungen, die die vorhandene Sammlungs-Statistik NICHT schon zeigt:
// der Vergleich mit dem Katalog (zieht wirklich jemand ueberdurchschnittlich?),
// die echten Spielduelle (bisher stand dort nur, wer das bessere Team gezogen
// hat — nicht, wer gewonnen hat), der Wochenrhythmus und der Blick ueber die
// Saisons hinweg.

const fmt = (r, stellen = 2) =>
  r == null || !Number.isFinite(r) ? '—' : r.toFixed(stellen).replace('.', ',');

const ACCENT = {
  alexander: { text: 'text-system-blue', bar: 'bg-system-blue' },
  alex: { text: 'text-system-blue', bar: 'bg-system-blue' },
  philip: { text: 'text-system-red', bar: 'bg-system-red' },
};

function Karte({ icon, farbe, titel, hinweis, children }) {
  return (
    <div className="modern-card">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="karten-titel inline-flex items-center gap-2 min-w-0">
          <Icon name={icon} size={17} strokeWidth={2.2} className={farbe} />
          <span className="truncate">{titel}</span>
        </h3>
        {hinweis && <span className="text-[11px] text-text-tertiary whitespace-nowrap">{hinweis}</span>}
      </div>
      {children}
    </div>
  );
}

/** Glücks-Index: ⌀ gezogene Sterne gegen den Schnitt des Katalogs. */
function GluecksIndex({ people, pulls, catalog }) {
  const basis = useMemo(() => katalogSchnitt(catalog), [catalog]);
  const werte = people.map((p) => ({
    ...p,
    idx: gluecksIndex(pulls.filter((e) => e.person === p.id), basis),
  }));
  const maxAbw = Math.max(0.25, ...werte.map((w) => Math.abs(w.idx.abweichung || 0)));

  if (!werte.some((w) => w.idx.anzahl > 0)) return null;

  return (
    <Karte icon="trendingUp" farbe="text-system-green" titel="Glücks-Index"
      hinweis={`Katalog ⌀ ${fmt(basis)}★`}>
      <div className="space-y-3">
        {werte.map((w) => {
          const a = ACCENT[w.id] || ACCENT.philip;
          const abw = w.idx.abweichung;
          const anteil = abw == null ? 0 : Math.abs(abw) / maxAbw;
          return (
            <div key={w.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-text-secondary">{w.name}</span>
                <span className="text-text-tertiary num-tabular">
                  ⌀ {fmt(w.idx.schnitt)}★ · {w.idx.anzahl} Ziehungen
                </span>
              </div>
              {/* Nulllinie in der Mitte: nach rechts = besser als der Katalog. */}
              <div className="relative h-3 rounded-full bg-bg-tertiary overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
                {abw != null && abw !== 0 && (
                  <div
                    className={`absolute inset-y-0 ${abw > 0 ? a.bar : 'bg-text-tertiary'}`}
                    style={{
                      left: abw > 0 ? '50%' : `${50 - anteil * 50}%`,
                      width: `${anteil * 50}%`,
                    }}
                  />
                )}
              </div>
              <div className="mt-1 text-[11px] text-text-tertiary">
                {abw == null ? 'Keine Wertungen' : abw > 0
                  ? <>+{fmt(abw)}★ über dem Katalog-Schnitt</>
                  : abw < 0
                    ? <>{fmt(abw)}★ unter dem Katalog-Schnitt</>
                    : 'genau im Katalog-Schnitt'}
                {w.idx.bestes != null && <> · Bestes {fmt(w.idx.bestes, 1)}★, schlechtestes {fmt(w.idx.schlechtestes, 1)}★</>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 pt-3 border-t border-border-light text-[11px] text-text-tertiary">
        Verglichen wird mit dem Durchschnitt aller ziehbaren Teams — nicht mit
        der Mitte der Skala. Im Katalog liegen deutlich mehr Teams im Mittelfeld
        als an den Rändern.
      </p>
    </Karte>
  );
}

/** Bilanz der tatsächlich ausgetragenen Spielduelle. */
function DuellAuswertung({ people, catalog }) {
  const ratingFuerTeam = useMemo(() => {
    const m = new Map(catalog.map((t) => [t.name, t.rating]));
    return (name) => m.get(name) ?? null;
  }, [catalog]);

  const duelle = useMemo(
    () => duelleAusHistorie(loadSterne().history, ratingFuerTeam),
    [ratingFuerTeam]
  );
  const bilanz = useMemo(() => duellBilanz(duelle, ['alex', 'philip']), [duelle]);
  const nameVon = (key) => (key === 'alex' ? people[0]?.name : people[1]?.name) || key;

  if (!bilanz.gesamt) {
    return (
      <Karte icon="zap" farbe="text-system-purple" titel="Spielduelle">
        <p className="text-sm text-text-muted">
          Noch kein Spielduell ausgetragen. Über &bdquo;Spielduell&ldquo; im
          Teams-Bereich werden Sieger und Sterne erfasst — die Bilanz erscheint
          danach hier.
        </p>
      </Karte>
    );
  }

  const a = bilanz.siege.alex || 0;
  const p = bilanz.siege.philip || 0;
  const summe = Math.max(1, a + p);

  return (
    <Karte icon="zap" farbe="text-system-purple" titel="Spielduelle"
      hinweis={`${bilanz.gesamt} ${bilanz.gesamt === 1 ? 'Duell' : 'Duelle'}`}>
      <div className="flex items-center gap-2">
        <span className="w-8 text-right text-lg font-bold text-system-blue num-tabular">{a}</span>
        <div className="flex-1 h-4 rounded-full overflow-hidden bg-bg-tertiary flex text-[9px] font-bold text-white">
          <div className="bg-system-blue h-full flex items-center justify-center" style={{ width: `${(a / summe) * 100}%` }}>
            {a > 0 ? Math.round((a / summe) * 100) + '%' : ''}
          </div>
          <div className="bg-system-red h-full flex items-center justify-center" style={{ width: `${(p / summe) * 100}%` }}>
            {p > 0 ? Math.round((p / summe) * 100) + '%' : ''}
          </div>
        </div>
        <span className="w-8 text-lg font-bold text-system-red num-tabular">{p}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-text-tertiary">
        <span>{people[0]?.name}</span>
        <span>
          {bilanz.unentschiedenInBilanz
            ? 'Gleichstand'
            : `${nameVon(bilanz.fuehrend)} führt`}
          {bilanz.serie.laenge > 1 && ` · 🔥 ${nameVon(bilanz.serie.person)} ${bilanz.serie.laenge}×`}
        </span>
        <span>{people[1]?.name}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-border-light grid grid-cols-2 gap-2">
        <div className="bg-bg-tertiary rounded-xl p-3 text-center">
          <div className="stat-display text-lg text-system-orange">
            {bilanz.underdogQuote == null ? '—' : `${Math.round(bilanz.underdogQuote * 100)}%`}
          </div>
          <div className="text-[11px] text-text-tertiary">Underdog-Quote</div>
        </div>
        <div className="bg-bg-tertiary rounded-xl p-3 text-center">
          <div className="stat-display text-lg text-text-primary">
            {bilanz.schnittDifferenz == null ? '—' : `${bilanz.schnittDifferenz > 0 ? '+' : ''}${fmt(bilanz.schnittDifferenz, 1)}★`}
          </div>
          <div className="text-[11px] text-text-tertiary">⌀ Vorsprung des Siegers</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-text-tertiary">
        {bilanz.vergleichbar > 0
          ? <>In {bilanz.underdogSiege} von {bilanz.vergleichbar} Duellen mit unterschiedlicher Teamstärke hat das schwächere Team gewonnen.</>
          : <>Für die Underdog-Quote braucht es Duelle, in denen beide Teams eine Wertung haben und die Stärke sich unterscheidet.</>}
      </p>
    </Karte>
  );
}

/** Ziehungen je Kalenderwoche. */
function WochenRhythmus({ people, pulls }) {
  const reihe = useMemo(
    () => proWoche(pulls, people.map((p) => p.id), 10),
    [pulls, people]
  );
  if (reihe.length < 2) return null;
  const max = Math.max(1, ...reihe.map((w) => w.gesamt));
  const schnitt = reihe.reduce((s, w) => s + w.gesamt, 0) / reihe.length;

  return (
    <Karte icon="calendar" farbe="text-system-blue" titel="Ziehungen pro Woche"
      hinweis={`⌀ ${fmt(schnitt, 1)} / Woche`}>
      <div className="flex items-end gap-1 h-24">
        {reihe.map((w) => (
          <div key={w.woche} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] text-text-tertiary num-tabular">{w.gesamt || ''}</span>
            {/* Gestapelt: beide Personen in einer Woche uebereinander. */}
            <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden bg-bg-tertiary"
              style={{ height: `${Math.max(4, (w.gesamt / max) * 100)}%` }}>
              <div className="bg-system-blue" style={{ height: `${w.gesamt ? ((w[people[0].id] || 0) / w.gesamt) * 100 : 0}%` }} />
              <div className="bg-system-red" style={{ height: `${w.gesamt ? ((w[people[1].id] || 0) / w.gesamt) * 100 : 0}%` }} />
            </div>
            <span className="text-[9px] text-text-tertiary truncate max-w-full">{w.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-text-tertiary">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-system-blue" />{people[0].name}</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-system-red" />{people[1].name}</span>
        <span className="ml-auto">Woche ab Montag</span>
      </div>
    </Karte>
  );
}

/** Sammlung je Saison — braucht die Ziehungen über den Saison-Filter hinaus. */
function SaisonVergleich({ people }) {
  const [zustand, setZustand] = useState({ lade: true, pulls: [], fehler: false });

  useEffect(() => {
    let aktiv = true;
    fetchAlleSaisonZiehungen().then((res) => {
      if (!aktiv) return;
      setZustand({ lade: false, pulls: res.pulls || [], fehler: !res.ok });
    });
    return () => { aktiv = false; };
  }, []);

  const reihe = useMemo(
    () => proSaison(zustand.pulls, people.map((p) => p.id)),
    [zustand.pulls, people]
  );

  if (zustand.lade) {
    return (
      <Karte icon="grid" farbe="text-system-orange" titel="Sammlung je Saison">
        <p className="text-sm text-text-muted">Lade Saisons…</p>
      </Karte>
    );
  }
  // Nur eine Saison in den Daten? Dann sagt der Vergleich nichts aus.
  if (zustand.fehler || reihe.length < 2) return null;

  const max = Math.max(1, ...reihe.map((s) => s.gesamt));

  return (
    <Karte icon="grid" farbe="text-system-orange" titel="Sammlung je Saison"
      hinweis={`${reihe.length} Saisons`}>
      <div className="space-y-2">
        {reihe.map((s) => (
          <div key={s.saison} className="flex items-center gap-2">
            <span className="w-14 text-xs font-semibold text-text-secondary truncate">{s.saison}</span>
            <div className="flex-1 h-4 rounded-full bg-bg-tertiary overflow-hidden flex">
              <div className="bg-system-blue h-full" style={{ width: `${((s[people[0].id] || 0) / max) * 100}%` }} />
              <div className="bg-system-red h-full" style={{ width: `${((s[people[1].id] || 0) / max) * 100}%` }} />
            </div>
            <span className="w-10 text-right text-xs text-text-tertiary num-tabular">{s.gesamt}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-text-tertiary">
        Die Sammlung oben zeigt nur die laufende Saison — hier stehen alle.
      </p>
    </Karte>
  );
}

export default function ZiehungsAuswertung({ people, pulls, catalog }) {
  // Dieselbe Rangfolge wie im uebrigen Teams-Bereich: der Katalog gilt (dort
  // werden Wertungen korrigiert), erst wenn ein Team dort fehlt, zaehlt die in
  // der Ziehung gespeicherte Wertung. Ohne diese Angleichung stuenden auf einem
  // Bildschirm zwei verschiedene Durchschnitte fuer dieselben Ziehungen.
  const normiert = useMemo(() => {
    const ausKatalog = new Map(catalog.map((t) => [t.name, t.rating]));
    return (pulls || []).map((p) => ({
      ...p,
      rating: ausKatalog.has(p.team) ? ausKatalog.get(p.team) : p.rating,
    }));
  }, [pulls, catalog]);

  return (
    <>
      <GluecksIndex people={people} pulls={normiert} catalog={catalog} />
      <DuellAuswertung people={people} catalog={catalog} />
      <WochenRhythmus people={people} pulls={normiert} />
      <SaisonVergleich people={people} />
    </>
  );
}
