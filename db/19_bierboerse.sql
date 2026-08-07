-- ============================================================================
--  BIERBÖRSE — Verkostungen von Alexander und Philip
-- ============================================================================
--  NICHT-DESTRUKTIV: legt nur drei neue Tabellen an. Kein DROP, kein DELETE.
--
--  Drei Ebenen, weil dasselbe Bier auf mehreren Börsen vorkommen soll:
--
--    bier_katalog      das Bier an sich (Name, Brauerei, Art, Alkohol)
--    bierboersen       die Veranstaltung (Name, Ort, Datum)
--    bier_verkostungen was ihr dort davon getrunken und vergeben habt
--
--  Ohne den Katalog waere "wie oft hatten wir das schon?" und eine Bestenliste
--  ueber alle Boersen hinweg nicht moeglich — dasselbe Bier laege dann in
--  jeder Boerse als eigener Datensatz.
--
--  Bewusst KEINE fifa_version: Bierbörsen haengen nicht an einer FIFA-Saison.
-- ============================================================================

create table if not exists public.bier_katalog (
  id         bigserial primary key,
  name       text not null,
  brauerei   text,
  art        text,
  -- Alkoholgehalt in Prozent. Gehoert zum Bier, nicht zur Verkostung.
  alkohol    numeric(4,2),
  land       text,
  notiz      text,
  created_at timestamptz not null default now(),
  constraint bier_katalog_alkohol_check check (alkohol is null or (alkohol >= 0 and alkohol <= 80))
);

-- Name + Brauerei identifiziert ein Bier. Zwei Brauereien duerfen dasselbe
-- Bier heissen; dieselbe Brauerei nicht zweimal dasselbe.
create unique index if not exists uq_bier_katalog_name
  on public.bier_katalog (lower(name), lower(coalesce(brauerei, '')));

create table if not exists public.bierboersen (
  id         bigserial primary key,
  name       text not null,
  ort        text,
  datum      date not null default current_date,
  notiz      text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bierboersen_datum on public.bierboersen (datum desc);

create table if not exists public.bier_verkostungen (
  id         bigserial primary key,
  boerse_id  bigint not null references public.bierboersen(id) on delete cascade,
  bier_id    bigint not null references public.bier_katalog(id) on delete restrict,
  -- Preis je Glas in Euro, Groesse in ml — zusammen ergibt das den Literpreis.
  preis      numeric(6,2),
  groesse_ml int,
  -- Anzahl UND Note getrennt je Person: nur so stimmen Trinkmenge und
  -- Ausgaben pro Kopf, und jeder darf anders urteilen.
  anzahl_aek  int not null default 0,
  anzahl_real int not null default 0,
  note_aek    int,
  note_real   int,
  notiz      text,
  created_at timestamptz not null default now(),
  constraint bier_verkostungen_note_aek_check
    check (note_aek is null or (note_aek >= 0 and note_aek <= 10)),
  constraint bier_verkostungen_note_real_check
    check (note_real is null or (note_real >= 0 and note_real <= 10)),
  constraint bier_verkostungen_anzahl_check
    check (anzahl_aek >= 0 and anzahl_real >= 0),
  constraint bier_verkostungen_preis_check
    check (preis is null or preis >= 0),
  constraint bier_verkostungen_ml_check
    check (groesse_ml is null or groesse_ml > 0),
  -- Ein Bier je Boerse einmal. Zweites Glas erhoeht die Anzahl.
  constraint bier_verkostungen_key unique (boerse_id, bier_id)
);

create index if not exists idx_bier_verkostungen_boerse on public.bier_verkostungen (boerse_id);
create index if not exists idx_bier_verkostungen_bier   on public.bier_verkostungen (bier_id);

alter table public.bier_katalog      enable row level security;
alter table public.bierboersen       enable row level security;
alter table public.bier_verkostungen enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'bier_katalog' and policyname = 'bier_katalog_all') then
    create policy bier_katalog_all on public.bier_katalog
      for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bierboersen' and policyname = 'bierboersen_all') then
    create policy bierboersen_all on public.bierboersen
      for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bier_verkostungen' and policyname = 'bier_verkostungen_all') then
    create policy bier_verkostungen_all on public.bier_verkostungen
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Kontrolle
select t.tabelle,
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = t.tabelle) as spalten,
       (select count(*) from pg_policies where tablename = t.tabelle) as policies
from (values ('bier_katalog'), ('bierboersen'), ('bier_verkostungen')) as t(tabelle);
