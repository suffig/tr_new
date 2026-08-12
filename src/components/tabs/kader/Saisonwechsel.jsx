import { useCallback, useEffect, useMemo, useState } from 'react';
import Kraefteverhaeltnis from '../../Kraefteverhaeltnis';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import LoadingSpinner from '../../LoadingSpinner';
import SaisonDraft from './SaisonDraft';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { supabaseDb } from '../../../utils/supabase';
import { getCurrentFifaVersion } from '../../../utils/fifaVersionManager';
import { getTeamDisplay } from '../../../constants/teams';
import { saisonAbschluss, verwerfeEntwurf, OFFEN_SCHULDEN, OFFEN_ENTWURF } from '../../../utils/saisonAbschluss';
import { legeSaisonAn, naechsteVersionsId, pruefeVersionsId } from '../../../utils/saisonAnlegen';
import { ladeOffenenDraft } from '../../../utils/saisonDraft';
import { useIchBin } from '../../../hooks/useIchBin';

const mio = (n) => `${((Number(n) || 0) / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio €`;
const euro = (n) => `${(Number(n) || 0).toLocaleString('de-DE')} €`;

const SCHRITTE = [
  { id: 'abschluss', label: 'Abschluss', icon: 'clipboard' },
  { id: 'anlegen', label: 'Neue Saison', icon: 'calendar' },
  { id: 'draft', label: 'Draft', icon: 'dice' },
];

/**
 * Saisonwechsel — alte Saison abschließen, neue anlegen, Kader draften.
 *
 * Der Draft war vorher ein Werkzeug für sich, obwohl er nur an einer Stelle
 * vorkommt: am Übergang zwischen zwei Saisons. Und dieser Übergang besteht
 * aus mehr als dem Draft — davor muss die alte Saison sauber zugemacht und
 * die neue registriert werden, sonst landen die gedrafteten Spieler in einer
 * Saison, die es in der Datenbank gar nicht gibt.
 *
 * Läuft bereits ein Draft, springt die Ansicht direkt dorthin: dann sind die
 * ersten beiden Schritte offensichtlich schon erledigt.
 */
export default function Saisonwechsel() {
  const { darfEintragen } = useIchBin();
  const version = getCurrentFifaVersion();
  const { data: matches } = useSupabaseQuery('matches', '*', { skipFifaFilter: true });
  const { data: players, refetch: playersNeu } = useSupabaseQuery('players', '*', { skipFifaFilter: true });
  const { data: finances, refetch: finanzenNeu } = useSupabaseQuery('finances', '*', { skipFifaFilter: true });
  const { data: bans } = useSupabaseQuery('bans', '*', { skipFifaFilter: true });

  const [schritt, setSchritt] = useState(null);
  const [neueSaison, setNeueSaison] = useState(null);
  const [pruefe, setPruefe] = useState(true);

  // Läuft schon ein Draft? Dann direkt dorthin.
  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      try {
        const offen = await ladeOffenenDraft();
        if (!abgebrochen) setSchritt(offen ? 'draft' : 'abschluss');
      } catch {
        if (!abgebrochen) setSchritt('abschluss');
      } finally {
        if (!abgebrochen) setPruefe(false);
      }
    })();
    return () => { abgebrochen = true; };
  }, []);

  const stand = useMemo(
    () => saisonAbschluss({ version, matches, players, finances, bans }),
    [version, matches, players, finances, bans]
  );

  const aktualisieren = useCallback(() => { playersNeu(); finanzenNeu(); }, [playersNeu, finanzenNeu]);

  if (pruefe || !schritt) return <LoadingSpinner message="Prüfe Saison…" />;

  // Nach allen Haken, nicht davor: ein Ausstieg oberhalb wuerde die Zahl der
  // aufgerufenen Hooks je nach Nutzer aendern, und React zaehlt sie mit.
  //
  // Der Saisonwechsel schliesst eine Saison ab, legt eine neue an und
  // draftet die Kader neu — das ist die weitreichendste Aktion der App und
  // laesst sich nicht mit einem Knopfdruck zuruecknehmen. Hier hilft kein
  // Ausblenden einzelner Knoepfe, die ganze Ansicht ist der Vorgang.
  if (!darfEintragen) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="lock" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-primary font-semibold">Saisonwechsel führt Philip durch</p>
        <p className="text-footnote text-text-tertiary mt-1">
          Dabei wird die laufende Saison abgeschlossen und der Kader neu
          verteilt — das passiert nur einmal im Jahr und an einer Stelle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fortschritt */}
      <div className="flex items-center gap-1">
        {SCHRITTE.map((s, i) => {
          const index = SCHRITTE.findIndex((x) => x.id === schritt);
          const erledigt = i < index;
          const aktiv = s.id === schritt;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl ${
                aktiv ? 'bg-system-purple/12 text-system-purple'
                : erledigt ? 'text-system-green' : 'text-text-tertiary'}`}>
                <Icon name={erledigt ? 'check' : s.icon} size={14} strokeWidth={2.4} />
                <span className="text-caption2 font-semibold whitespace-nowrap">{s.label}</span>
              </div>
              {i < SCHRITTE.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 rounded-full ${erledigt ? 'bg-system-green/40' : 'bg-bg-tertiary'}`} />
              )}
            </div>
          );
        })}
      </div>

      {schritt === 'abschluss' && (
        <Abschluss stand={stand} version={version}
                   onAktualisieren={aktualisieren}
                   onWeiter={() => setSchritt('anlegen')} />
      )}
      {schritt === 'anlegen' && (
        <Anlegen alteVersion={version}
                 onZurueck={() => setSchritt('abschluss')}
                 onFertig={(v) => { setNeueSaison(v); setSchritt('draft'); }} />
      )}
      {schritt === 'draft' && (
        <>
          {neueSaison && (
            <div className="modern-card p-3 flex items-center gap-2.5">
              <Icon name="check" size={16} strokeWidth={2.6} className="text-system-green flex-shrink-0" />
              <span className="text-caption1 text-text-secondary">
                Saison <span className="font-semibold text-text-primary">{neueSaison}</span> ist angelegt
                und aktiv. Jetzt den Kader ziehen.
              </span>
            </div>
          )}
          <SaisonDraft />
        </>
      )}
    </div>
  );
}

/** Schritt 1: Endstand zeigen, offene Punkte klären. */
function Abschluss({ stand, version, onAktualisieren, onWeiter }) {
  const [arbeitet, setArbeitet] = useState(false);
  const [erledigt, setErledigt] = useState([]);

  const offen = stand.offen.filter((o) => !erledigt.includes(o.art));

  const begleichen = async () => {
    const schuldner = stand.aek.schulden > 0 ? 'AEK' : 'Real';
    const betrag = Math.max(stand.aek.schulden, stand.real.schulden);
    if (!window.confirm(
      `${getTeamDisplay(schuldner, version)} hat ${euro(betrag)} gezahlt?\n\n` +
      'Beide Schuldenstände werden auf 0 gesetzt.'
    )) return;
    setArbeitet(true);
    try {
      // Beide Seiten nullen, nicht nur die offene — ein Restbetrag auf der
      // anderen Seite waere sonst gleich die naechste offene Rechnung.
      const konten = ['AEK', 'Real'];
      for (const team of konten) {
        const { data } = await supabaseDb.select('finances', '*', {
          eq: { team, fifa_version: version }, skipFifaFilter: true,
        });
        const f = (data || [])[0];
        if (f?.id != null && (f.debt || 0) !== 0) {
          await supabaseDb.update('finances', { debt: 0 }, f.id);
        }
      }
      toast.success('Rechnung beglichen.');
      setErledigt((e) => [...e, OFFEN_SCHULDEN]);
      onAktualisieren();
    } catch {
      toast.error('Konnte nicht gespeichert werden.');
    } finally {
      setArbeitet(false);
    }
  };

  const entwurfWeg = () => {
    if (!window.confirm('Den liegengebliebenen Spielentwurf verwerfen?')) return;
    verwerfeEntwurf();
    setErledigt((e) => [...e, OFFEN_ENTWURF]);
    toast.success('Entwurf verworfen.');
  };

  return (
    <div className="space-y-4">
      {/* Endstand */}
      <div className="modern-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="trophy" size={15} strokeWidth={2.2} className="text-system-yellow" />
          <span className="text-footnote font-semibold text-text-muted">Endstand {version}</span>
          <span className="ml-auto text-caption2 text-text-tertiary num-tabular">
            {stand.spiele} {stand.spiele === 1 ? 'Spiel' : 'Spiele'}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 mb-3">
          {['AEK', 'Real'].map((team, i) => (
            <div key={team} className="flex items-center gap-2">
              {i === 1 && <span className="text-text-tertiary text-lg">:</span>}
              <div className="text-center">
                <TeamLogo team={team === 'AEK' ? 'aek' : 'real'} size="sm" version={version} />
                <div className={`stat-display text-2xl num-tabular mt-1 ${
                  team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                  {team === 'AEK' ? stand.siegeAek : stand.siegeReal}
                </div>
              </div>
            </div>
          ))}
        </div>
        {stand.sieger && (
          <p className="text-center text-footnote font-semibold text-text-primary mb-3">
            {getTeamDisplay(stand.sieger, version)} gewinnt die Saison
          </p>
        )}

        <div className="divide-y divide-border-light">
          <Kraefteverhaeltnis
            label="Konto" klein
            aek={stand.aek.konto} real={stand.real.konto}
            anzeige={(n) => mio(n)}
            aekName={getTeamDisplay('AEK', version)} realName={getTeamDisplay('Real', version)} />
          <Kraefteverhaeltnis
            label="Kaderwert" klein
            aek={stand.aek.kaderwert} real={stand.real.kaderwert}
            anzeige={(n) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio`}
            aekName={getTeamDisplay('AEK', version)} realName={getTeamDisplay('Real', version)} />
          <Kraefteverhaeltnis
            label="Spieler" klein
            aek={stand.aek.spieler} real={stand.real.spieler}
            aekName={getTeamDisplay('AEK', version)} realName={getTeamDisplay('Real', version)} />
        </div>

        {stand.torschuetzenkoenig && (
          <p className="text-caption2 text-text-tertiary mt-2">
            Torschützenkönig: {stand.torschuetzenkoenig.name} ({stand.torschuetzenkoenig.goals})
          </p>
        )}
      </div>

      {/* Offene Punkte */}
      {offen.length > 0 ? (
        <div className="space-y-2">
          <div className="text-footnote font-semibold text-text-muted px-1">
            Vorher klären ({offen.length})
          </div>
          {offen.map((o) => (
            <div key={o.art} className="panel-yellow rounded-2xl p-3.5">
              <div className="flex items-start gap-2.5">
                <Icon name="warning" size={16} strokeWidth={2.2} className="text-system-yellow mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-footnote font-semibold text-text-primary">{o.titel}</p>
                  <p className="text-caption1 text-text-secondary mt-0.5">{o.text}</p>
                  <p className="text-caption2 text-text-tertiary mt-0.5">{o.hinweis}</p>
                  {o.art === OFFEN_SCHULDEN && (
                    <button onClick={begleichen} disabled={arbeitet}
                            className="btn-secondary mt-2 text-caption1 py-1.5 px-3">
                      Als beglichen verbuchen
                    </button>
                  )}
                  {o.art === OFFEN_ENTWURF && (
                    <button onClick={entwurfWeg} className="btn-secondary mt-2 text-caption1 py-1.5 px-3">
                      Entwurf verwerfen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="modern-card p-4 flex items-center gap-2.5">
          <Icon name="check" size={18} strokeWidth={2.6} className="text-system-green flex-shrink-0" />
          <span className="text-footnote text-text-secondary">
            Nichts offen — die Saison kann abgeschlossen werden.
          </span>
        </div>
      )}

      {/* Was passiert als Nächstes */}
      <div className="modern-card p-4">
        <div className="text-footnote font-semibold text-text-muted mb-2">Danach</div>
        <ul className="space-y-1.5 text-caption1 text-text-secondary">
          <li className="flex gap-2">
            <span className="text-text-tertiary">1.</span>
            Neue Saison anlegen — Kennung, Vereine, Wappen.
          </li>
          <li className="flex gap-2">
            <span className="text-text-tertiary">2.</span>
            Kader draften. Budget aus Konto + Kaderwert:{' '}
            <span className="num-tabular text-text-primary whitespace-nowrap">
              {mio(stand.budget.AEK)} / {mio(stand.budget.Real)}
            </span>
          </li>
        </ul>
        <p className="text-caption2 text-text-tertiary mt-2">
          {version} bleibt vollständig erhalten und ist danach im Archiv erreichbar.
        </p>
      </div>

      <button onClick={onWeiter} className="btn-primary w-full">
        {offen.length > 0 ? 'Trotzdem weiter' : 'Weiter zur neuen Saison'}
      </button>
    </div>
  );
}

/** Schritt 2: Saison registrieren. */
function Anlegen({ alteVersion, onZurueck, onFertig }) {
  const [id, setId] = useState(() => naechsteVersionsId(alteVersion));
  const [name, setName] = useState('');
  const [teams, setTeams] = useState({
    AEK: { label: '', short: '', logo: null },
    Real: { label: '', short: '', logo: null },
  });
  const [uebernehmen, setUebernehmen] = useState(false);
  const [arbeitet, setArbeitet] = useState(false);

  const setTeam = (key, patch) => setTeams((t) => ({ ...t, [key]: { ...t[key], ...patch } }));

  const logo = (key, datei) => {
    if (!datei) return;
    if (!datei.type.startsWith('image/')) { toast.error('Bitte ein Bild wählen.'); return; }
    if (datei.size > 1024 * 1024) { toast.error('Logo zu groß (max. 1 MB).'); return; }
    const leser = new FileReader();
    leser.onload = () => setTeam(key, { logo: leser.result });
    leser.readAsDataURL(datei);
  };

  const anlegen = async (e) => {
    e.preventDefault();
    const geprueft = pruefeVersionsId(id);
    if (!geprueft.ok) { toast.error(geprueft.fehler); return; }
    setArbeitet(true);
    try {
      const { version } = await legeSaisonAn({
        id, name, teams,
        basisVon: uebernehmen ? alteVersion : null,
        aktivieren: true,
      });
      toast.success(`Saison ${version} angelegt und aktiv.`);
      onFertig(version);
    } catch (err) {
      toast.error(err?.message || 'Die Saison konnte nicht angelegt werden.');
    } finally {
      setArbeitet(false);
    }
  };

  return (
    <form onSubmit={anlegen} className="space-y-4">
      <div className="modern-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-caption2 text-text-tertiary">Kennung *</span>
            <input value={id} onChange={(e) => setId(e.target.value.toUpperCase())}
                   className="form-input w-full mt-0.5" placeholder="FC27" autoFocus />
          </label>
          <label className="block">
            <span className="text-caption2 text-text-tertiary">Anzeigename</span>
            <input value={name} onChange={(e) => setName(e.target.value)}
                   className="form-input w-full mt-0.5" placeholder={`Saison ${id || 'FC27'}`} />
          </label>
        </div>
      </div>

      {['AEK', 'Real'].map((key) => (
        <div key={key} className="modern-card p-4">
          <div className={`text-footnote font-semibold mb-2.5 ${key === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
            {key === 'AEK' ? 'Alexander' : 'Philip'}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <label className="block">
                <span className="text-caption2 text-text-tertiary">Verein</span>
                <input value={teams[key].label} onChange={(e) => setTeam(key, { label: e.target.value })}
                       className="form-input w-full mt-0.5"
                       placeholder={key === 'AEK' ? 'z. B. Bayern München' : 'z. B. Dortmund'} />
              </label>
              <label className="block">
                <span className="text-caption2 text-text-tertiary">Kürzel</span>
                <input value={teams[key].short} onChange={(e) => setTeam(key, { short: e.target.value })}
                       className="form-input w-full mt-0.5" maxLength={6}
                       placeholder={key === 'AEK' ? 'FCB' : 'BVB'} />
              </label>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-xl bg-bg-tertiary flex items-center justify-center overflow-hidden border border-border-light">
                {teams[key].logo
                  ? <img src={teams[key].logo} alt="" className="w-full h-full object-contain" />
                  : <Icon name="users" size={22} className="text-text-tertiary" />}
              </div>
              <label className="text-caption2 font-medium text-system-blue cursor-pointer">
                Wappen
                <input type="file" accept="image/*" className="hidden"
                       onChange={(e) => logo(key, e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </div>
      ))}

      <label className="flex items-center gap-2 text-caption1 text-text-secondary px-1">
        <input type="checkbox" checked={uebernehmen} onChange={(e) => setUebernehmen(e.target.checked)} />
        Farben und Wappen aus {alteVersion} übernehmen
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={onZurueck} className="btn-secondary flex-1">Zurück</button>
        <button type="submit" disabled={arbeitet || !id.trim()} className="btn-primary flex-1">
          {arbeitet ? 'Legt an…' : 'Anlegen und weiter'}
        </button>
      </div>

      <p className="text-caption2 text-text-tertiary px-1">
        Die Saison wird zuerst in der Datenbank registriert und erst danach
        aktiviert — eine nur lokal angelegte Saison wäre für den anderen
        unsichtbar, und Einträge darin gingen verloren.
      </p>
    </form>
  );
}
