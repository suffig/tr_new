-- ============================================================================
--  SCHRITT 0 — PRUEFUNG (reines SELECT, aendert NICHTS)
-- ============================================================================
--  Im Supabase SQL Editor ausfuehren. Das Skript schreibt nicht, loescht nicht
--  und legt nichts an. Es beantwortet zwei Fragen:
--
--   TEIL A — Kann die Integritaets-Migration (01) sauber durchlaufen, oder
--            gibt es Daten, die die neuen Regeln verletzen wuerden?
--   TEIL B — Stimmen die vier handgepflegten Zaehler noch mit dem ueberein,
--            was sich aus den Rohdaten ableiten laesst?
--
--  Bitte das komplette Ergebnis zurueckmelden. Erst danach Migration 01.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- TEIL A — Vorbedingungen der Migration
-- ---------------------------------------------------------------------------

-- A1: Welche fifa_version-Werte kommen in den Daten vor, und sind sie alle in
--     fifa_versions registriert? Ein "NEIN" hier heisst: der Fremdschluessel
--     (Migration 02) wuerde fehlschlagen.
select
  'A1 fifa_version registriert?' as pruefung,
  v.version,
  v.zeilen,
  case when fv.id is null then 'NEIN — nicht in fifa_versions' else 'ja' end as status
from (
  select fifa_version as version, count(*) as zeilen from public.matches            group by 1
  union all select fifa_version, count(*) from public.players            group by 1
  union all select fifa_version, count(*) from public.bans               group by 1
  union all select fifa_version, count(*) from public.transactions       group by 1
  union all select fifa_version, count(*) from public.finances           group by 1
  union all select fifa_version, count(*) from public.spieler_des_spiels group by 1
) v
left join public.fifa_versions fv on fv.id = v.version
order by status desc, v.version;

-- A2: Verwaiste Transaktionen — match_id zeigt auf ein Spiel, das es nicht
--     (mehr) gibt. Diese Zeilen wuerden den Fremdschluessel auf matches
--     blockieren und muessten vorher bereinigt werden.
select
  'A2 verwaiste Transaktionen' as pruefung,
  count(*) as anzahl
from public.transactions t
where t.match_id is not null
  and not exists (select 1 from public.matches m where m.id = t.match_id);

-- A2b: … und welche das konkret waeren (max. 50 zur Sichtung).
select 'A2b Details' as pruefung, t.id, t.date, t.team, t.type, t.amount, t.match_id
from public.transactions t
where t.match_id is not null
  and not exists (select 1 from public.matches m where m.id = t.match_id)
order by t.id
limit 50;

-- A3: Team-Werte ausserhalb von 'AEK'/'Real' — wuerden die geplante
--     CHECK-Regel auf matches verletzen.
select 'A3 unerwartete Team-Werte (matches)' as pruefung, teama as wert, count(*) as anzahl
from public.matches where teama not in ('AEK','Real') group by 1,2
union all
select 'A3 unerwartete Team-Werte (matches)', teamb, count(*)
from public.matches where teamb not in ('AEK','Real') group by 1,2;

-- A4: NULL-Werte in Feldern, die kuenftig NOT NULL DEFAULT 0 sein sollen.
--     Migration 01 setzt sie auf 0 — die App behandelt sie ohnehin schon so.
select
  'A4 NULLs die auf 0 gesetzt wuerden' as pruefung,
  count(*) filter (where yellowa   is null) as yellowa,
  count(*) filter (where reda      is null) as reda,
  count(*) filter (where yellowb   is null) as yellowb,
  count(*) filter (where redb      is null) as redb,
  count(*) filter (where prizeaek  is null) as prizeaek,
  count(*) filter (where prizereal is null) as prizereal
from public.matches;

-- A5: Sperren, deren player_id ins Leere zeigt.
select 'A5 Sperren ohne gueltigen Spieler' as pruefung, count(*) as anzahl
from public.bans b
where b.player_id is not null
  and not exists (select 1 from public.players p where p.id = b.player_id);


-- ---------------------------------------------------------------------------
-- TEIL B — Stimmen die handgepflegten Zaehler?
-- ---------------------------------------------------------------------------
--  Wichtig: Abweichungen hier sind KEIN Fehler der Migration, sondern zeigen
--  Altbestand. Sie muessen nur bekannt sein, bevor irgendwann auf abgeleitete
--  Werte umgestellt wird.

-- B1: players.goals gegen die Summe aus den Torlisten.
--     Eigentore (Eigentore_*) zaehlen nicht als Spielertore.
with tore as (
  select
    m.fifa_version,
    coalesce(g->>'player', g#>>'{}') as spieler,
    sum(coalesce((g->>'count')::int, 1)) as tore
  from public.matches m
  cross join lateral (
    select jsonb_array_elements(coalesce(m.goalslista,'[]'::jsonb)) as g
    union all
    select jsonb_array_elements(coalesce(m.goalslistb,'[]'::jsonb))
  ) x
  where coalesce(g->>'player', g#>>'{}') is not null
    and coalesce(g->>'player', g#>>'{}') not like 'Eigentore%'
  group by 1,2
)
select
  'B1 players.goals' as pruefung,
  p.fifa_version, p.name, p.team,
  p.goals            as gespeichert,
  coalesce(t.tore,0) as abgeleitet,
  p.goals - coalesce(t.tore,0) as differenz
from public.players p
left join tore t on t.spieler = p.name and t.fifa_version = p.fifa_version
where p.goals is distinct from coalesce(t.tore,0)
order by abs(p.goals - coalesce(t.tore,0)) desc;

-- B2: spieler_des_spiels.count gegen matches.manofthematch.
with sds as (
  select fifa_version, manofthematch as name, count(*) as anzahl
  from public.matches
  where manofthematch is not null and manofthematch <> ''
  group by 1,2
)
select
  'B2 spieler_des_spiels' as pruefung,
  coalesce(s.fifa_version, x.fifa_version) as fifa_version,
  coalesce(s.name, x.name)                 as name,
  s.count            as gespeichert,
  coalesce(x.anzahl,0) as abgeleitet,
  coalesce(s.count,0) - coalesce(x.anzahl,0) as differenz
from public.spieler_des_spiels s
full outer join sds x
  on x.name = s.name and x.fifa_version = s.fifa_version
where coalesce(s.count,0) is distinct from coalesce(x.anzahl,0)
order by abs(coalesce(s.count,0) - coalesce(x.anzahl,0)) desc;

-- B3: finances.balance gegen die Summe der Transaktionen.
--     ACHTUNG: balance ist Spielgeld, debt ist ECHTES Geld in Euro — die
--     Echtgeld-Typen duerfen deshalb nicht in die balance-Summe einfliessen.
with bewegung as (
  select fifa_version, team, sum(amount) as summe
  from public.transactions
  where type not in ('Echtgeld-Ausgleich', 'Echtgeld-Ausgleich (getilgt)')
  group by 1,2
)
select
  'B3 finances.balance' as pruefung,
  f.fifa_version, f.team,
  f.balance                as gespeichert,
  coalesce(b.summe,0)      as summe_transaktionen,
  f.balance - coalesce(b.summe,0) as differenz_ohne_startkapital
from public.finances f
left join bewegung b on b.team = f.team and b.fifa_version = f.fifa_version
order by f.fifa_version, f.team;
-- Hinweis zu B3: eine konstante Differenz ueber beide Teams ist normal und
-- entspricht dem Startkapital. Auffaellig waere, wenn die Differenz je Team
-- UNTERSCHIEDLICH ist — dann ist irgendwo eine Buchung verlorengegangen.

-- B4: Sperren, die mehr Spiele abgesessen haben als verhaengt wurden.
select 'B4 bans matchesserved > totalgames' as pruefung,
       id, fifa_version, team, type, totalgames, matchesserved
from public.bans
where matchesserved > totalgames;
