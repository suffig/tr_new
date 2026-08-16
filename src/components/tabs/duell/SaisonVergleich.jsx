import { useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import LoadingSpinner from '../../LoadingSpinner';

/**
 * Zwei Saisons nebeneinander.
 *
 * "War FC25 besser als FC24" beantwortet keine Gesamtzahl: die längere
 * Saison gewinnt jeden Zählwert automatisch. Deshalb stehen hier neben den
 * Summen auch die Werte JE SPIEL — und die sagen etwas anderes.
 *
 * DER BALKEN IST DAS VERHÄLTNIS, NICHT DIE MENGE
 * Wie im Spieler-Vergleich: er teilt die Breite zwischen beiden auf. Eine
 * feste Skala würde zwei kleine Zahlen nebeneinander unsichtbar machen.
 *
 * KEIN SIEGER
 * Mehr Tore sind nicht automatisch die bessere Saison, und wer das gewichten
 * will, hat eine Meinung. Die Zeilen stehen nebeneinander; das Urteil bleibt
 * beim Leser.
 */

const dez = (n, s = 1) =>
  n == null ? '—' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: s });

export default function SaisonVergleich({ matches, players, loading }) {
  const saisons = useMemo(() => {
    const gefunden = new Set();
    for (const m of matches || []) if (m.fifa_version) gefunden.add(m.fifa_version);
    for (const p of players || []) if (p.fifa_version) gefunden.add(p.fifa_version);
    // Neueste zuerst — danach sucht man am häufigsten.
    return [...gefunden].sort((a, b) => String(b).localeCompare(String(a), 'de', { numeric: true }));
  }, [matches, players]);

  const [links, setLinks] = useState(null);
  const [rechts, setRechts] = useState(null);
  const a = links && saisons.includes(links) ? links : saisons[0];
  const b = rechts && saisons.includes(rechts) ? rechts : saisons[1];

  const zahlen = useMemo(() => {
    const je = {};
    for (const v of [a, b]) {
      if (!v) continue;
      const spiele = (matches || []).filter((m) => m.fifa_version === v);
      const kader = (players || []).filter((p) => p.fifa_version === v);
      let toreAek = 0, toreReal = 0, siegeAek = 0, siegeReal = 0, remis = 0;
      for (const m of spiele) {
        const ta = Number(m.goalsa) || 0, tr = Number(m.goalsb) || 0;
        toreAek += ta; toreReal += tr;
        if (ta > tr) siegeAek++; else if (tr > ta) siegeReal++; else remis++;
      }
      je[v] = {
        spiele: spiele.length,
        tore: toreAek + toreReal,
        toreAek, toreReal, siegeAek, siegeReal, remis,
        spieler: kader.length,
        // Je Spiel — der Wert, der zwei ungleich lange Saisons vergleichbar
        // macht. Ohne ihn gewinnt immer die laengere.
        toreJeSpiel: spiele.length ? (toreAek + toreReal) / spiele.length : null,
      };
    }
    return je;
  }, [a, b, matches, players]);

  if (loading) return <LoadingSpinner message="Lade Saisons…" />;

  if (saisons.length < 2) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="calendar" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Es braucht zwei Saisons zum Vergleichen.</p>
        <p className="text-footnote text-text-tertiary mt-1">
          Erfasst {saisons.length === 1 ? `ist bisher nur ${saisons[0]}` : 'ist bisher keine'}.
        </p>
      </div>
    );
  }

  const A = zahlen[a] || {}, Bz = zahlen[b] || {};

  const zeilen = [
    { id: 'spiele', label: 'Spiele', zeige: (x) => x.spiele ?? 0 },
    { id: 'tore', label: 'Tore gesamt', zeige: (x) => x.tore ?? 0 },
    { id: 'toreJeSpiel', label: 'Tore je Spiel', zeige: (x) => dez(x.toreJeSpiel, 2) },
    { id: 'toreAek', label: 'Tore Alexander', zeige: (x) => x.toreAek ?? 0 },
    { id: 'toreReal', label: 'Tore Philip', zeige: (x) => x.toreReal ?? 0 },
    { id: 'spieler', label: 'Spieler im Kader', zeige: (x) => x.spieler ?? 0 },
  ];

  const Wahl = ({ wert, setzen, gegen }) => (
    <select value={wert || ''} onChange={(e) => setzen(e.target.value)}
            className="form-input text-sm flex-1 min-w-0">
      {saisons.map((v) => (
        // Dieselbe Saison auf beiden Seiten ergaebe lauter Gleichstaende.
        <option key={v} value={v} disabled={v === gegen}>{v}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-3">
      <div className="modern-card p-3">
        <div className="flex items-center gap-2">
          <Wahl wert={a} setzen={setLinks} gegen={b} />
          <span className="text-caption2 font-bold text-text-tertiary flex-shrink-0">gegen</span>
          <Wahl wert={b} setzen={setRechts} gegen={a} />
        </div>
      </div>

      <div className="modern-card p-4 space-y-3">
        {zeilen.map((z) => {
          const av = Number(A[z.id]) || 0;
          const bv = Number(Bz[z.id]) || 0;
          const summe = av + bv;
          const anteil = summe ? (av / summe) * 100 : 50;
          return (
            <div key={z.id}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="num-tabular text-sm w-14 text-text-primary">{z.zeige(A)}</span>
                <span className="flex-1 text-center text-caption2 text-text-tertiary">{z.label}</span>
                <span className="num-tabular text-sm w-14 text-right text-text-primary">{z.zeige(Bz)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex bg-bg-tertiary">
                <div className="h-full bg-system-teal/70" style={{ width: `${anteil}%` }} />
                <div className="h-full bg-system-purple/70" style={{ width: `${100 - anteil}%` }} />
              </div>
            </div>
          );
        })}

        <div className="pt-2 border-t border-border-light text-caption2 text-text-tertiary">
          Bilanz {a}: {A.siegeAek || 0}–{A.remis || 0}–{A.siegeReal || 0} ·
          {' '}Bilanz {b}: {Bz.siegeAek || 0}–{Bz.remis || 0}–{Bz.siegeReal || 0}
          {' '}(Alexander–Remis–Philip). Die längere Saison gewinnt jede Summe
          {' '}von allein — deshalb steht {'„Tore je Spiel“'} mit dabei.
        </div>
      </div>
    </div>
  );
}
