-- ============================================================================
--  SAISON-DRAFT — Mannschaft für eine neue Saison zusammenstellen
-- ============================================================================
--  NICHT-DESTRUKTIV: legt nur zwei neue Tabellen an. Kein DROP, kein DELETE,
--  bestehende Daten werden nicht angefasst.
--
--  Ablauf: Zu Beginn einer Saison bekommt jeder ein Budget (Kontostand der
--  Vorsaison + Wert seines alten Kaders, vor dem Draft überschreibbar). Dann
--  wird abwechselnd gezogen, mindestens 14 Spieler je Person. Wer genug hat,
--  setzt aus; der andere darf weiterziehen.
--
--  Warum zwei Tabellen und nicht direkt nach players: waehrend des Drafts ist
--  nichts endgueltig. Zuege lassen sich zuruecknehmen, das Budget neu setzen,
--  der Draft abbrechen. Erst beim Abschluss werden die Spieler nach players
--  uebernommen — dann steht in draft_picks.player_id, welche Zeile daraus
--  wurde, und man kann spaeter nachvollziehen, wer wann fuer wie viel kam.
-- ============================================================================

create table if not exists public.draft_sessions (
  id            bigserial primary key,
  fifa_version  text not null,
  status        text not null default 'laufend',
  -- Budgets in EURO (wie finances.balance), nicht in Mio.
  budget_aek    bigint not null default 0,
  budget_real   bigint not null default 0,
  beginner      text not null default 'AEK',
  mindest_picks int  not null default 14,
  -- Wer bereits ausgestiegen ist. Der andere zieht dann allein weiter.
  fertig_aek    boolean not null default false,
  fertig_real   boolean not null default false,
  notiz         text,
  created_at    timestamptz not null default now(),
  beendet_at    timestamptz,
  constraint draft_sessions_status_check
    check (status in ('laufend', 'abgeschlossen', 'abgebrochen')),
  constraint draft_sessions_beginner_check
    check (beginner in ('AEK', 'Real')),
  -- Je Saison hoechstens ein Draft, der nicht abgebrochen wurde. Ohne das
  -- entstuenden bei einem Doppelklick zwei parallele Drafts derselben Saison.
  constraint draft_sessions_budget_check
    check (budget_aek >= 0 and budget_real >= 0)
);

create unique index if not exists uq_draft_offen_je_saison
  on public.draft_sessions (fifa_version)
  where status = 'laufend';

create table if not exists public.draft_picks (
  id           bigserial primary key,
  session_id   bigint not null references public.draft_sessions(id) on delete cascade,
  nummer       int    not null,
  team         text   not null,
  spieler_name text   not null,
  -- Preis in EURO, damit er direkt vom Budget abgezogen werden kann.
  preis        bigint not null default 0,
  position     text,
  -- Gesetzt, sobald der Draft abgeschlossen und der Spieler nach players
  -- uebernommen wurde. Vorher null.
  player_id    bigint,
  created_at   timestamptz not null default now(),
  constraint draft_picks_team_check check (team in ('AEK', 'Real')),
  constraint draft_picks_preis_check check (preis >= 0),
  constraint draft_picks_nummer_key unique (session_id, nummer)
);

create index if not exists idx_draft_picks_session on public.draft_picks (session_id, nummer);

alter table public.draft_sessions enable row level security;
alter table public.draft_picks    enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'draft_sessions' and policyname = 'draft_sessions_all') then
    create policy draft_sessions_all on public.draft_sessions
      for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'draft_picks' and policyname = 'draft_picks_all') then
    create policy draft_picks_all on public.draft_picks
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Kontrolle
select 'draft_sessions' as tabelle,
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'draft_sessions') as spalten,
       (select count(*) from pg_policies where tablename = 'draft_sessions') as policies
union all
select 'draft_picks',
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'draft_picks'),
       (select count(*) from pg_policies where tablename = 'draft_picks');
