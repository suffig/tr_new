-- ============================================================================
--  MIGRATION 09 — Der Spieleabend als eigene Sache
-- ============================================================================
--  VORHER: Backup anlegen (Supabase Dashboard -> Database -> Backups).
--
--  WARUM:
--  Alkohol, Sterne und Schnaps liegen bisher ausschliesslich im localStorage
--  des jeweiligen Geraets — AlcoholTrackerTab, SpielersaufenTab und
--  sterneCounter.js enthalten kein einziges supabase. Folge: Alexander und
--  Philip sehen jeweils EIGENE Zahlen, und ein geleerter Browser loescht alles
--  unwiederbringlich.
--
--  AUFBAU (bewusst wie bei team_pull_events, das funktioniert dort gut):
--
--    abende             ein Abend = ein Datum in einer Saison
--    abend_ereignisse   ein Ereignis-Log; ALLES leitet sich daraus ab
--
--  Kein Aggregat, keine Trigger. Die Zahlen (Sterne-Stand, Bieranzahl,
--  Schnaps-Fortschritt) werden beim Lesen summiert. Bei zwei Personen und
--  ein paar Dutzend Ereignissen je Abend ist das billiger als eine zweite,
--  synchron zu haltende Wahrheit — genau die ist bei team_collection
--  auseinandergelaufen (siehe db/08).
--
--  Rueckweg: db/10_rollback_abende.sql
--  Pruefung: db/09_status_pruefen.sql
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Der Abend selbst
-- ---------------------------------------------------------------------------
create table if not exists public.abende (
  id           bigserial primary key,
  fifa_version text not null default 'FC26',
  datum        date not null default current_date,
  notiz        text,
  created_at   timestamptz not null default now(),
  -- Ein Abend je Datum und Saison. Wer zweimal am selben Tag spielt, fuellt
  -- denselben Abend weiter — das ist gewollt.
  constraint abende_version_datum_key unique (fifa_version, datum)
);

-- ---------------------------------------------------------------------------
-- 2) Das Ereignis-Log
--
--    art:    'stern'   Handicap-Gutschrift (menge = 6 - Sterne des Teams)
--            'bier'    ein Bier
--            'shot20'  ein Kurzer mit 20 %
--            'shot40'  ein Kurzer mit 40 %
--            'schnaps' ein Schnaps aus dem Zaehler
--            'bj'      Guthaben-Buchung (menge = Betrag in Euro)
--
--    menge:  Stueckzahl bzw. Gutschrift. numeric, weil Sterne halbe Schritte
--            haben (5,5) und BJ-Betraege Nachkommastellen.
--
--    info:   Zusatz je nach Art, z. B. beim Spielduell die beiden Teams samt
--            Rating. jsonb, damit spaetere Arten nichts am Schema aendern.
-- ---------------------------------------------------------------------------
create table if not exists public.abend_ereignisse (
  id           bigserial primary key,
  abend_id     bigint not null references public.abende(id) on delete cascade,
  fifa_version text not null default 'FC26',
  person       text not null,
  art          text not null,
  menge        numeric not null default 1,
  info         jsonb,
  created_at   timestamptz not null default now(),
  constraint abend_ereignisse_art_check
    check (art in ('stern', 'bier', 'shot20', 'shot40', 'schnaps', 'bj')),
  constraint abend_ereignisse_person_check
    check (person in ('Alexander', 'Philip'))
);

create index if not exists idx_abend_ereignisse_abend   on public.abend_ereignisse (abend_id);
create index if not exists idx_abend_ereignisse_version on public.abend_ereignisse (fifa_version);
create index if not exists idx_abende_version_datum     on public.abende (fifa_version, datum desc);

-- ---------------------------------------------------------------------------
-- 3) Fremdschluessel auf die Saison — nur, wenn jede benutzte Saison auch in
--    fifa_versions steht. Sonst schlaegt er fehl und nimmt den Rest mit.
-- ---------------------------------------------------------------------------
do $$
declare fehlend text;
begin
  select string_agg(distinct v.version, ', ') into fehlend
  from (
    select fifa_version as version from public.abende
    union select fifa_version from public.abend_ereignisse
  ) v
  left join public.fifa_versions fv on fv.id = v.version
  where fv.id is null;

  if fehlend is not null then
    raise notice
      'HINWEIS: Fremdschluessel NICHT angelegt — diese Saison(en) fehlen in '
      'fifa_versions: %. Alles andere ist angelegt.', fehlend;
  else
    if not exists (select 1 from pg_constraint where conname = 'abende_fifa_version_fkey') then
      alter table public.abende
        add constraint abende_fifa_version_fkey
        foreign key (fifa_version) references public.fifa_versions(id)
        on update cascade on delete restrict;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'abend_ereignisse_fifa_version_fkey') then
      alter table public.abend_ereignisse
        add constraint abend_ereignisse_fifa_version_fkey
        foreign key (fifa_version) references public.fifa_versions(id)
        on update cascade on delete restrict;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Zugriffsschutz wie bei den uebrigen Tabellen: angemeldet = darf alles.
-- ---------------------------------------------------------------------------
alter table public.abende           enable row level security;
alter table public.abend_ereignisse enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'abende' and policyname = 'abende_all') then
    create policy abende_all on public.abende
      for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'abend_ereignisse' and policyname = 'abend_ereignisse_all') then
    create policy abend_ereignisse_all on public.abend_ereignisse
      for all to authenticated using (true) with check (true);
  end if;
end $$;

commit;


-- ---------------------------------------------------------------------------
-- Kontrolle (reines SELECT). Direkt nach der Migration sind beide leer —
-- die vorhandenen Zahlen uebertraegt die App beim naechsten Start.
-- ---------------------------------------------------------------------------
select 'Abende' as tabelle, count(*) as zeilen from public.abende
union all
select 'Ereignisse', count(*) from public.abend_ereignisse;
