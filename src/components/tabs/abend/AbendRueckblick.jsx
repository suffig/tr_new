import { useMemo } from 'react';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import LoadingSpinner from '../../LoadingSpinner';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { getTeamDisplay } from '../../../constants/teams';
import { ladeLokal, standFuer, logischesDatum } from '../../../utils/abende';
import { loadPulls } from '../../../utils/teamCollection';
import { boersenStatistik } from '../../../utils/bierboerse';

// Der Abend als Einheit.
//
// Spiele, Ziehungen, Sterne und Getraenke lagen in vier getrennten Ansichten;
// die Frage "wie lief der letzte Abend?" liess sich nur durch Herumspringen
// beantworten. Hier steht jeder Abend als eine Karte.
//
// Alles ist abgeleitet — es gibt keine eigene Speicherung. Die Zuordnung zum
// Abend macht logischesDatum() mit dem Tageswechsel um 06:00, damit ein Spiel
// um 00:30 noch zum Vorabend zaehlt.

const WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function datumLabel(iso) {
  const heute = logischesDatum();
  if (iso === heute) return 'Heute';
  const gestern = new Date(heute); gestern.setDate(gestern.getDate() - 1);
  const p = (n) => String(n).padStart(2, '0');
  const gesternIso = `${gestern.getFullYear()}-${p(gestern.getMonth() + 1)}-${p(gestern.getDate())}`;
  if (iso === gesternIso) return 'Gestern';
  const d = new Date(iso + 'T12:00:00');
  return `${WOCHENTAG[d.getDay()]}, ${p(d.getDate())}.${p(d.getMonth() + 1)}.`;
}

const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(1).replace('.', ','));

/** Eine Kennzahl in der Kachelreihe. */
function Wert({ icon, farbe, zahl, label }) {
  return (
    <div className="bg-bg-tertiary rounded-xl p-2.5 text-center min-w-0">
      <div className={`flex justify-center mb-1 ${farbe}`}>
        <Icon name={icon} size={15} strokeWidth={2.2} />
      </div>
      <div className="stat-display text-[15px] text-text-primary truncate">{zahl}</div>
      <div className="text-caption2 text-text-tertiary truncate">{label}</div>
    </div>
  );
}

export default function AbendRueckblick() {
  const { data: matches, loading } = useSupabaseQuery('matches', '*');
  // DIE BIERBOERSE GEHOERT HIERHER.

  // Die Kachel "Bier" zaehlte bisher nur den lokalen Saufen-Zaehler. Wer

  // seine Biere in der Bierboerse eintraegt — also im genaueren der

  // beiden Wege —, sah hier trotzdem einen Strich. Genau an diesem Abend

  // liegt aber die Frage, um die es bei 90Proof geht: wie lief das Spiel,

  // und wie viel stand daneben.

  const opt = { skipFifaFilter: true };

  const { data: boersen } = useSupabaseQuery('bierboersen', '*', opt);

  const { data: verkostungen } = useSupabaseQuery('bier_verkostungen', '*', opt);

  const { data: bierKatalog } = useSupabaseQuery('bier_katalog', '*', opt);

  const abende = useMemo(() => {
    const ereignisse = ladeLokal();
    const pulls = loadPulls();

    // Alle Tage einsammeln, an denen irgendetwas passiert ist.
    const tage = new Set();
    ereignisse.forEach((e) => e.datum && tage.add(e.datum));
    (matches || []).forEach((m) => m.date && tage.add(String(m.date).slice(0, 10)));
    pulls.forEach((p) => tage.add(logischesDatum(new Date(p.ts))));
    // Ein Abend, an dem nur getrunken wurde, ist auch ein Abend.
    (boersen || []).forEach((b) => b.datum && tage.add(String(b.datum).slice(0, 10)));

    return [...tage].sort((a, b) => (a < b ? 1 : -1)).map((datum) => {
      const spiele = (matches || []).filter((m) => String(m.date).slice(0, 10) === datum);
      const ziehungen = pulls.filter((p) => logischesDatum(new Date(p.ts)) === datum);
      const stand = standFuer(ereignisse, datum);

      let aek = 0, real = 0, toreA = 0, toreB = 0;
      for (const m of spiele) {
        const a = m.goalsa || 0, b = m.goalsb || 0;
        toreA += a; toreB += b;
        if (a > b) aek++; else if (b > a) real++;
      }

      // Die Boerse dieses Abends — falls es eine gibt.
      const boerse = (boersen || []).find((b) => String(b.datum || '').slice(0, 10) === datum) || null;
      const boersenBiere = boerse
        ? (verkostungen || []).filter((v) => v.boerse_id === boerse.id)
        : [];
      const bStat = boersenBiere.length ? boersenStatistik(boersenBiere, bierKatalog) : null;

      return {
        datum, spiele, ziehungen, stand, boerse, bStat,
        bilanz: { aek, real, unentschieden: spiele.length - aek - real, toreA, toreB },
        getraenke: stand.bier.gesamt + stand.shot20.gesamt + stand.shot40.gesamt + stand.schnaps.gesamt,
      };
    }).filter((a) => a.spiele.length || a.ziehungen.length || a.stand.anzahl || a.bStat);
  }, [matches, boersen, verkostungen, bierKatalog]);

  if (loading) return <LoadingSpinner message="Lade Abende…" />;

  if (abende.length === 0) {
    return (
      <div className="modern-card text-center py-10">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
          <Icon name="calendar" size={28} strokeWidth={1.6} />
        </div>
        <h4 className="karten-titel mb-1">Noch kein Abend erfasst</h4>
        <p className="text-sm text-text-muted">
          Sobald ihr Spiele eintragt, Teams zieht oder etwas trinkt, erscheint der Abend hier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {abende.map((a) => {
        const fuehrend = a.bilanz.aek === a.bilanz.real ? null : (a.bilanz.aek > a.bilanz.real ? 'AEK' : 'Real');
        // Kurze je Person: die drei Arten zusammengezaehlt. Siehe Kommentar
        // weiter unten bei den Chips, warum zusammen und nicht getrennt.
        const kurze = {
          alexander: a.stand.shot20.alexander + a.stand.shot40.alexander + a.stand.schnaps.alexander,
          philip: a.stand.shot20.philip + a.stand.shot40.philip + a.stand.schnaps.philip,
        };

        /**
         * Wer hat an diesem Abend mehr? Gibt den Namen zurueck — oder null
         * bei Gleichstand und wenn es nichts gab.
         *
         * KEIN SIEGER BEI GLEICHSTAND. Wer bei 3:3 einen von beiden nennt,
         * erfindet ein Ergebnis. Dann steht "unentschieden" da, und das ist
         * auch eine Aussage.
         */
        const sieger = (ax, ph) => {
          if (!(ax > 0 || ph > 0)) return undefined;   // gab es nicht
          if (ax === ph) return null;                   // Gleichstand
          return ax > ph ? 'Alexander' : 'Philip';
        };
        const sterneSieger = sieger(a.stand.sterne.alexander, a.stand.sterne.philip);
        const kurzeSieger = sieger(kurze.alexander, kurze.philip);
        return (
          <div key={a.datum} className="modern-card">
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <h3 className="karten-titel truncate">{datumLabel(a.datum)}</h3>
              {/* Ohne Spiele stand hier "0 Spiele" — eine Null, die nichts sagt.
                  "kein Spiel" statt einer Vermutung, was sonst passiert ist:
                  was es war, steht in den Kacheln darunter. */}
              <span className="text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                {a.spiele.length > 0
                  ? `${a.spiele.length} ${a.spiele.length === 1 ? 'Spiel' : 'Spiele'}`
                  : 'kein Spiel'}
              </span>
            </div>

            {/* Wie die Spiele ausgingen */}
            {a.spiele.length > 0 && (
              <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-bg-tertiary">
                <TeamLogo team="aek" size="xs" />
                <span className="stat-display text-lg text-system-blue num-tabular">{a.bilanz.aek}</span>
                <span className="text-text-tertiary text-sm">:</span>
                <span className="stat-display text-lg text-system-red num-tabular">{a.bilanz.real}</span>
                <TeamLogo team="real" size="xs" />
                <span className="ml-auto text-caption2 text-text-tertiary num-tabular text-right flex-shrink-0 whitespace-nowrap">
                  {a.bilanz.toreA}:{a.bilanz.toreB} Tore
                  {fuehrend && (
                    <span className={`block font-semibold ${fuehrend === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                      {getTeamDisplay(fuehrend)} vorn
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Der Rest des Abends. Vier Kacheln, auf dem Handy zwei mal zwei
                — je rund 165px breit, und darin passt „Alexander vorn".
                Drei Spalten nebeneinander hätten je 105px gelassen, zu wenig
                für einen Namen. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <Wert icon="trophy" farbe="text-system-orange" zahl={a.ziehungen.length} label="Ziehungen" />
              {/* DER SIEGER, NICHT DIE SUMME.
                  Hier stand die Gesamtzahl der Sterne des Abends. Die sagt,
                  dass getrunken wurde, aber nicht das, worum es geht: wer
                  vorn war. Die Einzelzahlen beider stehen weiter unten als
                  Chips, die Summe braucht niemand — sie ist deren Addition.

                  Bei Gleichstand steht „unentschieden": einen von beiden zu
                  nennen hiesse, ein Ergebnis zu erfinden. */}
              {/* DER SIEGER, NICHT DIE SUMME — als Vorsprung plus Name.
                  Der Name als ZAHL wäre in der 15px-Schrift der Kachel
                  abgeschnitten („Alexand…"); die Kachel ist auf 375px rund
                  105px breit. Also die Zahl ist der Vorsprung und der Name
                  steht im Label darunter, wo die kleine Schrift hinpasst. */}
              <Wert icon="starFilled" farbe="text-system-yellow"
                zahl={sterneSieger === undefined ? '—'
                  : sterneSieger === null ? '='
                    : `+${fmt(Math.abs(a.stand.sterne.alexander - a.stand.sterne.philip))}`}
                label={sterneSieger === undefined ? 'Sterne'
                  : sterneSieger === null ? 'Sterne gleich'
                    : `${sterneSieger} vorn`} />
              {/* Die Boerse ist der genauere Wert und hat deshalb Vorrang;
                  der Saufen-Zaehler bleibt der Rueckfall. */}
              {/* Kurze genauso: wer vorn war, nicht wie viele es zusammen
                  waren. Die Einzelzahlen stehen als Chips darunter. */}
              <Wert icon="glass" farbe="text-system-purple"
                zahl={kurzeSieger === undefined ? '—'
                  : kurzeSieger === null ? '='
                    : `+${Math.abs(kurze.alexander - kurze.philip)}`}
                label={kurzeSieger === undefined ? 'Kurze'
                  : kurzeSieger === null ? 'Kurze gleich'
                    : `${kurzeSieger} vorn`} />
              {/* Die Gläser bleiben eine Summe: sie kommen aus der Bierbörse,
                  wo jede Flasche einzeln mit Zahler steht — das ist die
                  Menge des Abends und keine Frage von „wer mehr". Wer das je
                  Person braucht, findet es in der Börse selbst. */}
              <Wert icon="beer" farbe="text-system-orange"
                zahl={a.bStat ? a.bStat.glaeser : (a.stand.bier.gesamt || '—')}
                label={a.bStat ? 'Gläser' : 'Bier'} />
            </div>

            {/* SPIEL UND GLAS AN EINEM ORT.
                Das ist die Zeile, wegen der die Bierboerse hierher geholt
                wurde: das Ergebnis des Abends steht darueber, was daneben
                stand, hier. Eine Uhrzeit wird nirgends erfasst — die Zeile
                behauptet deshalb keine Reihenfolge und kein "deshalb". */}
            {a.bStat && (
              <div className="mt-2.5 pt-2.5 border-t border-border-light">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-caption2 font-semibold text-text-muted truncate min-w-0 flex-1">
                    {a.boerse?.name || 'Bierbörse'}
                  </span>
                  <span className="text-caption2 text-text-tertiary flex-shrink-0">
                    {a.bStat.biere} {a.bStat.biere === 1 ? 'Bier' : 'Biere'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip chip-sm chip-gray">
                    {fmt(a.bStat.liter)} l
                  </span>
                  <span className="chip chip-sm chip-gray">
                    {fmt(a.bStat.standardglaeser ?? 0)} Std.-Gläser
                  </span>
                  <span className="chip chip-sm chip-gray">
                    {(a.bStat.ausgaben || 0).toLocaleString('de-DE',
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>
            )}

            {/* Wer wie viel — nur, wenn es etwas zu unterscheiden gibt */}
            {(a.stand.sterne.gesamt > 0 || a.getraenke > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-border-light">
                {a.stand.sterne.alexander > 0 && (
                  <span className="chip chip-sm chip-blue">Alexander +{fmt(a.stand.sterne.alexander)} Sterne</span>
                )}
                {a.stand.sterne.philip > 0 && (
                  <span className="chip chip-sm chip-red">Philip +{fmt(a.stand.sterne.philip)} Sterne</span>
                )}
                {/* KURZE JE PERSON, KEINE BIERZAHL.
                    Hier standen „Alexander N Bier" und „Philip N Bier". Die
                    Biere sagt die Bierbörse genauer — Gläser, Liter und
                    Ausgaben stehen zwei Zeilen darüber, und zwar aus den
                    einzeln eingetragenen Flaschen statt aus einem Zähler.
                    Die Kurzen dagegen gab es nur als Tagessumme, und die
                    beantwortet nicht die Frage, die man sich an einem Abend
                    stellt: wer hatte wie viele.

                    Drei Arten zusammen (20 %, 40 %, Schnaps): in diesem
                    Rückblick zählt die Anzahl, nicht die Stärke. Wer das
                    einzeln braucht, findet es im Alkohol-Bereich. */}
                {kurze.alexander > 0 && (
                  <span className="chip chip-sm chip-blue">Alexander {kurze.alexander} Kurze</span>
                )}
                {kurze.philip > 0 && (
                  <span className="chip chip-sm chip-red">Philip {kurze.philip} Kurze</span>
                )}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-caption2 text-text-tertiary text-center px-4">
        Ein Abend läuft bis 6 Uhr morgens — was danach passiert, zählt zum nächsten.
      </p>
    </div>
  );
}
