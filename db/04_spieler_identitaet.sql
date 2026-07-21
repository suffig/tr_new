-- ============================================================================
--  MIGRATION 04 — SPIELER-IDENTITAET UEBER SAISONS (OPTIONAL)
-- ============================================================================
--  VORHER: Backup. Dieses Skript ist idempotent und enthaelt kein "drop".
--
--  WOZU
--  players hat pro Saison eine eigene Zeile mit eigener id. Derselbe Mensch
--  taucht dadurch mehrfach auf — teils unter einem anderen Team (Benzema
--  AEK -> Ehemalige, Kante AEK -> Real) und teils in anderer Schreibweise
--  ("St Juste" / "St. Juste"). Karrierewerte entstehen erst durch
--  Zusammenfassen dieser Zeilen.
--
--  Die App macht das bereits OHNE diese Migration, ueber einen normalisierten
--  Namen (src/utils/playerIdentity.js). Fuer den heutigen Bestand reicht das
--  vollstaendig — geprueft an allen 82 Zeilen: 63 Personen, alle Teamwechsel
--  und die abweichende Schreibweise korrekt zusammengefasst.
--
--  Diese Migration macht die Zuordnung EXPLIZIT statt abgeleitet. Das lohnt
--  sich in genau zwei Faellen, die ueber den Namen nicht loesbar sind:
--    1. Ein Spieler wird wirklich umbenannt (nicht nur Zeichensetzung).
--    2. Zwei VERSCHIEDENE Spieler heissen gleich — ueber den Namen wuerden
--       ihre Tore faelschlich zusammengezaehlt.
--  Solange beides nicht auftritt, ist die Migration reine Vorsorge.
--
--  Die App bevorzugt person_id automatisch, sobald die Spalte gefuellt ist,
--  und faellt sonst auf den Namen zurueck. Es gibt also keinen Zwischenzustand,
--  in dem etwas kaputt waere.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Namens-Normalisierung — muss zu nameKey() in playerIdentity.js passen:
--    Kleinschreibung, Akzente aufgeloest, alles ausser a-z0-9 entfernt.
--    Bewusst mit translate() statt unaccent: die Erweiterung ist nicht
--    ueberall aktiv, und so bleibt das Ergebnis deterministisch.
-- ---------------------------------------------------------------------------
create or replace function public.fusta_name_key(n text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(translate(
      coalesce(n, ''),
      'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÑñÇçÝýŠšŽž',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuNnCcYySsZz'
    )),
    '[^a-z0-9]', '', 'g'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) Personen-Tabelle + Verweis auf players
-- ---------------------------------------------------------------------------
create table if not exists public.people (
  id            bigint generated always as identity primary key,
  display_name  text        not null,
  name_key      text        not null unique,
  created_at    timestamptz not null default now()
);

alter table public.players
  add column if not exists person_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_person_id_fkey'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_person_id_fkey
      foreign key (person_id) references public.people(id)
      on update cascade on delete set null;
  end if;
end $$;

create index if not exists idx_players_person on public.players (person_id);

-- ---------------------------------------------------------------------------
-- 3) Personen anlegen — eine je normalisiertem Namen.
--    Anzeigename ist die Schreibweise der NEUESTEN Saison.
-- ---------------------------------------------------------------------------
insert into public.people (display_name, name_key)
select distinct on (public.fusta_name_key(p.name))
       p.name,
       public.fusta_name_key(p.name)
from public.players p
where public.fusta_name_key(p.name) <> ''
order by public.fusta_name_key(p.name),
         nullif(regexp_replace(coalesce(p.fifa_version,''), '\D', '', 'g'), '')::int desc nulls last,
         p.id desc
on conflict (name_key) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Spielerzeilen verknuepfen
-- ---------------------------------------------------------------------------
update public.players p
set person_id = pe.id
from public.people pe
where pe.name_key = public.fusta_name_key(p.name)
  and p.person_id is distinct from pe.id;

commit;


-- ============================================================================
--  KONTROLLE (reines SELECT — bitte nach der Migration einmal ansehen)
-- ============================================================================

-- K1: Personen, die in mehreren Saisons vorkommen — mit Karrieresumme.
--     Hier muessen Teamwechsel und Schreibweisen korrekt zusammengefasst sein.
select
  pe.display_name,
  count(*)                                as saisons,
  sum(p.goals)                            as tore_gesamt,
  string_agg(distinct p.team, ' + ')      as teams,
  string_agg(distinct p.name, ' / ')      as schreibweisen,
  string_agg(p.fifa_version || ':' || p.goals, '  ' order by p.fifa_version) as aufschluesselung
from public.players p
join public.people pe on pe.id = p.person_id
group by pe.id, pe.display_name
having count(*) > 1
order by sum(p.goals) desc;

-- K2: VERDACHTSFAELLE — dieselbe Person zweimal in DERSELBEN Saison.
--     Das waeren zwei verschiedene Menschen mit gleichem Namen, die zu Unrecht
--     zusammengefasst wurden. Erwartetes Ergebnis: keine Zeilen.
select pe.display_name, p.fifa_version, count(*) as zeilen,
       string_agg(p.team || ' (' || p.goals || ')', ', ') as vorkommen
from public.players p
join public.people pe on pe.id = p.person_id
group by pe.id, pe.display_name, p.fifa_version
having count(*) > 1;

-- K3: Spielerzeilen ohne Person — sollte leer sein.
select id, name, team, fifa_version from public.players where person_id is null;
