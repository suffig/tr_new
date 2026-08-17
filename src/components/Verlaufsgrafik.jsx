import { useId, useMemo, useState } from 'react';

/**
 * Eine Verlaufsgrafik — Linie mit Fläche, für alles, was über die Zeit läuft.
 *
 * WARUM SVG UND NICHT NOCH EINE BALKENREIHE
 * Balken vergleichen Mengen nebeneinander. Ein Verlauf beantwortet eine
 * andere Frage — „wird es mehr oder weniger" —, und die liest man an der
 * Richtung einer Linie ab, nicht an Höhenunterschieden zwischen Säulen.
 *
 * KEINE FREMDE BIBLIOTHEK
 * Das hier sind ein paar Dutzend Zeilen Pfadberechnung. Eine Diagramm-
 * bibliothek wöge ein Vielfaches der ganzen App und brächte ein zweites
 * Design-System mit, das man wieder einfangen müsste.
 *
 * WAS SIE BEWUSST NICHT TUT
 * Sie erfindet keine Punkte. Fehlende Werte werden nicht interpoliert und
 * nicht als Null gezeichnet — sie unterbrechen die Linie. Eine durchgezogene
 * Linie durch eine Lücke behauptet eine Entwicklung, die niemand gemessen
 * hat.
 */

// Oben ist Platz fuer die Wertbeschriftung reserviert, die ueber dem
// hoechsten Punkt sitzt. Links und rechts bleibt es schmal: die erste und
// letzte Beschriftung wird stattdessen nach innen ausgerichtet.
const PAD = { oben: 26, unten: 20, links: 4, rechts: 4 };

export default function Verlaufsgrafik({
  punkte,                 // [{ label, wert, zusatz? }] — wert darf null sein
  farbe = 'var(--system-blue)',
  hoehe = 120,
  formatWert = (n) => n,
  // Kurzform fuer die Beschriftung AM PUNKT. "6 Glaeser" oder "2,68 €"
  // nebeneinander ueberlagern sich bei acht Punkten auf einem Handy zu
  // einem Streifen. Am Punkt steht deshalb nur die Zahl — die Einheit sagt
  // der Knopf darueber, und beim Antippen kommt ohnehin die volle Form.
  formatKurz = null,
  // Eine ZWEITE Reihe auf DERSELBEN Skala: { punkte, farbe, name }.
  // Nur sinnvoll, wenn beide dieselbe Einheit haben — zwei Torreihen ja,
  // Tore gegen Euro nicht. Die gemeinsame Skala ist genau der Punkt: sonst
  // koennte man die beiden Linien nicht vergleichen.
  zweite = null,
  nullBasiert = true,     // Achse bei 0 beginnen lassen
}) {
  const id = useId();
  const [aktiv, setAktiv] = useState(null);

  const daten = useMemo(() => {
    const werte = (punkte || []).map((p) => (p.wert == null ? null : Number(p.wert)));
    const echte = werte.filter((w) => w != null && Number.isFinite(w));
    if (echte.length < 2) return null;

    // Die Skala muss BEIDE Reihen fassen, sonst laeuft die zweite oben oder
    // unten aus dem Bild.
    const werte2 = (zweite?.punkte || []).map((p) => (p.wert == null ? null : Number(p.wert)));
    const echte2 = werte2.filter((w) => w != null && Number.isFinite(w));
    const alleEchten = [...echte, ...echte2];

    const max = Math.max(...alleEchten);
    const min = nullBasiert ? Math.min(0, ...alleEchten) : Math.min(...alleEchten);
    // Eine flache Linie (alle Werte gleich) haette Spanne 0 und wuerde durch
    // Null geteilt. Dann liegt sie mittig statt am oberen Rand.
    const spanne = max - min || 1;

    const B = 100;
    const nutzB = B - PAD.links - PAD.rechts;
    const nutzH = hoehe - PAD.oben - PAD.unten;
    const x = (i) => PAD.links + (werte.length === 1 ? nutzB / 2 : (i / (werte.length - 1)) * nutzB);
    const y = (w) => PAD.oben + nutzH - ((w - min) / spanne) * nutzH;

    // Luecken unterbrechen die Linie: aus den Werten werden Abschnitte, und
    // jeder wird als eigener Pfad gezeichnet.
    const abschnitte = [];
    let laufend = [];
    werte.forEach((w, i) => {
      if (w == null || !Number.isFinite(w)) {
        if (laufend.length) abschnitte.push(laufend);
        laufend = [];
      } else {
        laufend.push({ i, x: x(i), y: y(w), wert: w });
      }
    });
    if (laufend.length) abschnitte.push(laufend);

    const linien = abschnitte
      .filter((a) => a.length > 1)
      .map((a) => a.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));

    // Die Flaeche nur unter dem laengsten zusammenhaengenden Abschnitt —
    // sonst schwebten Flaechenstuecke ohne Zusammenhang im Bild.
    const laengster = abschnitte.reduce((a, b) => (b.length > a.length ? b : a), []);
    const flaeche = laengster.length > 1
      ? `M${laengster[0].x.toFixed(2)},${(hoehe - PAD.unten).toFixed(2)} `
        + laengster.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
        + ` L${laengster.at(-1).x.toFixed(2)},${(hoehe - PAD.unten).toFixed(2)} Z`
      : null;

    // Die zweite Reihe: nur Linie, keine Flaeche. Zwei gefuellte Flaechen
    // uebereinander verdecken sich gegenseitig und keiner sieht mehr, welche
    // oben liegt.
    const linien2 = [];
    if (echte2.length > 1) {
      let lauf2 = [];
      werte2.forEach((w, i) => {
        if (w == null || !Number.isFinite(w)) {
          if (lauf2.length > 1) linien2.push(lauf2);
          lauf2 = [];
        } else lauf2.push({ x: x(i), y: y(w) });
      });
      if (lauf2.length > 1) linien2.push(lauf2);
    }

    return {
      linien, flaeche, max, min,
      linien2: linien2.map((a) => a.map((q, k) => `${k ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')),
      alle: abschnitte.flat(),
      nullLinie: min < 0 && max > 0 ? y(0) : null,
    };
  }, [punkte, hoehe, nullBasiert, zweite]);

  if (!daten) {
    return (
      <p className="text-caption2 text-text-tertiary py-3 text-center">
        Zu wenige Werte für einen Verlauf — es braucht mindestens zwei.
      </p>
    );
  }

  const gewaehlt = aktiv != null ? punkte[aktiv] : null;
  const letzter = punkte[punkte.length - 1];

  /**
   * Welche Punkte eine Beschriftung bekommen.
   *
   * Bei acht Punkten passen alle nebeneinander. Bei dreissig ueberlagern sie
   * sich zu einem Streifen, in dem nichts mehr zu lesen ist — dann wird
   * ausgeduennt. Erster und letzter bleiben immer stehen: sie sind Anfang
   * und Stand, also die zwei, die man wirklich sucht. Der gerade angetippte
   * ebenso, sonst verschwaende die Beschriftung genau beim Hinsehen.
   */
  const beschriftet = (() => {
    const n = daten.alle.length;
    const platzFuer = 8;
    if (n <= platzFuer) return new Set(daten.alle.map((p) => p.i));
    const schritt = Math.ceil(n / platzFuer);
    const raus = new Set(daten.alle.filter((_, k) => k % schritt === 0).map((p) => p.i));
    raus.add(daten.alle[0].i);
    raus.add(daten.alle[n - 1].i);
    if (aktiv != null) raus.add(aktiv);
    return raus;
  })();

  return (
    <div>
      {/* Die Beschriftungen liegen als HTML UEBER dem SVG, nicht darin.
          Grund: preserveAspectRatio="none" streckt die x-Achse auf die
          Containerbreite, und <text> im selben Koordinatensystem wuerde
          genauso mitgestreckt — bei einer schmalen Grafik zu unlesbar
          breitgezogenen Ziffern. Als HTML bleibt die Schrift normal.
          Die Umrechnung ist exakt: x laeuft im viewBox von 0 bis 100 und
          entspricht damit direkt Prozent der Breite, y laeuft von 0 bis
          hoehe und entspricht Pixeln, weil das SVG genau diese Hoehe hat. */}
      <div className="relative">
      <svg viewBox={`0 0 100 ${hoehe}`} preserveAspectRatio="none"
           className="w-full block" style={{ height: hoehe }}
           role="img"
           aria-label={`Verlauf über ${punkte.length} Punkte, zuletzt ${formatWert(letzter?.wert)}`}>
        <defs>
          <linearGradient id={`v${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={farbe} stopOpacity="0.30" />
            <stop offset="100%" stopColor={farbe} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {daten.nullLinie != null && (
          <line x1={PAD.links} x2={100 - PAD.rechts} y1={daten.nullLinie} y2={daten.nullLinie}
                stroke="var(--border-light)" strokeWidth="0.4" />
        )}

        {daten.flaeche && <path d={daten.flaeche} fill={`url(#v${id})`} />}

        {daten.linien.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={farbe} strokeWidth="1.6"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {(daten.linien2 || []).map((d, i) => (
          <path key={`z${i}`} d={d} fill="none" stroke={zweite.farbe} strokeWidth="1.6"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {daten.alle.map((p) => (
          <circle key={p.i} cx={p.x} cy={p.y}
                  r={aktiv === p.i ? 2.6 : 1.6}
                  fill={aktiv === p.i ? farbe : 'var(--bg-secondary)'}
                  stroke={farbe} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        ))}

        {/* Unsichtbare Trefferflächen: die Punkte selbst sind für einen
            Finger viel zu klein. */}
        {daten.alle.map((p) => (
          <rect key={`t${p.i}`} x={p.x - 4} y={0} width={8} height={hoehe}
                fill="transparent" style={{ cursor: 'pointer' }}
                onClick={() => setAktiv(aktiv === p.i ? null : p.i)} />
        ))}
      </svg>

        {!zweite && daten.alle.filter((p) => beschriftet.has(p.i)).map((p) => {
          // Am Rand nach innen ausrichten, sonst wird die erste bzw. letzte
          // Beschriftung vom Containerrand abgeschnitten.
          const amAnfang = p.x < 12;
          const amEnde = p.x > 88;
          return (
            <span key={`b${p.i}`}
                  className={`absolute pointer-events-none num-tabular text-[10px] leading-none
                              whitespace-nowrap px-1 py-0.5 rounded ${
                    aktiv === p.i
                      ? 'font-bold text-text-primary bg-bg-secondary shadow-sm'
                      : 'font-semibold text-text-secondary'}`}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y - 7}px`,
                    transform: `translate(${amAnfang ? '0' : amEnde ? '-100%' : '-50%'}, -100%)`,
                  }}>
              {(formatKurz || formatWert)(p.wert)}
            </span>
          );
        })}
      </div>

      {zweite && (
        <div className="flex items-center gap-3 mt-1 text-caption2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded-full" style={{ background: farbe }} />
            <span className="text-text-secondary">{zweite.nameErste || 'Reihe 1'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded-full" style={{ background: zweite.farbe }} />
            <span className="text-text-secondary">{zweite.name}</span>
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-2 mt-1 text-caption2">
        <span className="text-text-tertiary truncate">{punkte[0]?.label}</span>
        {gewaehlt ? (
          <span className="text-text-primary font-semibold truncate">
            {gewaehlt.label}: {formatWert(gewaehlt.wert)}
            {gewaehlt.zusatz ? ` · ${gewaehlt.zusatz}` : ''}
          </span>
        ) : (
          <span className="text-text-tertiary">
            {punkte.some((x) => x.zusatz) ? 'antippen für Details' : `${punkte.length} Punkte`}
          </span>
        )}
        <span className="text-text-tertiary truncate text-right">{letzter?.label}</span>
      </div>
    </div>
  );
}
