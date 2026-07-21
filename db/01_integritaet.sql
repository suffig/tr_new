-- ============================================================================
--  MIGRATION 01 — INTEGRITAET (Block 1)
-- ============================================================================
--  VORHER: Backup anlegen (Supabase Dashboard -> Database -> Backups).
--  VORHER: db/00_pruefung.sql laufen lassen. A2 (verwaiste Transaktionen) und
--          A3 (unerwartete Team-Werte) muessen 0 ergeben.
--
--  Das Skript ist idempotent (mehrfaches Ausfuehren ist gefahrlos) und enthaelt
--  KEIN "drop" — es legt nur Regeln und Indizes an und fuellt NULLs mit 0.
--  Es bricht mit einer verstaendlichen Meldung ab, wenn die Daten eine Regel
--  verletzen wuerden, statt auf halbem Weg zu scheitern.
--
--  Der Fremdschluessel auf fifa_version ist BEWUSST NICHT hier drin — der
--  braucht erst die App-Aenderung und steckt in 02_fifa_version_fk.sql.
--
--  Rueckweg: db/03_rollback.sql
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Vorbedingungen pruefen — lieber sauber abbrechen als halb migrieren
-- ---------------------------------------------------------------------------
do $$
declare
  verwaist   int;
  fremdteams int;
begin
  select count(*) into verwaist
  from public.transactions t
  where t.match_id is not null
    and not exists (select 1 from public.matches m where m.id = t.match_id);

  if verwaist > 0 then
    raise exception
      'ABBRUCH: % Transaktion(en) zeigen auf ein nicht mehr vorhandenes Spiel. '
      'Bitte zuerst bereinigen (siehe 00_pruefung.sql, Abschnitt A2b), dann erneut ausfuehren.',
      verwaist;
  end if;

  select count(*) into fremdteams
  from public.matches
  where teama not in ('AEK','Real') or teamb not in ('AEK','Real');

  if fremdteams > 0 then
    raise exception
      'ABBRUCH: % Spiel(e) haben andere Team-Werte als AEK/Real. '
      'Bitte pruefen (siehe 00_pruefung.sql, Abschnitt A3), dann erneut ausfuehren.',
      fremdteams;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 1) Karten & Preisgelder: NULL -> 0, danach NOT NULL DEFAULT 0
--    Die App rechnet ohnehin ueberall mit "|| 0"; damit faellt dieser
--    Verteidigungscode weg und die Daten sagen selbst, was sie meinen.
-- ---------------------------------------------------------------------------
update public.matches set yellowa   = 0 where yellowa   is null;
update public.matches set reda      = 0 where reda      is null;
update public.matches set yellowb   = 0 where yellowb   is null;
update public.matches set redb      = 0 where redb      is null;
update public.matches set prizeaek  = 0 where prizeaek  is null;
update public.matches set prizereal = 0 where prizereal is null;

alter table public.matches
  alter column yellowa   set default 0,
  alter column reda      set default 0,
  alter column yellowb   set default 0,
  alter column redb      set default 0,
  alter column prizeaek  set default 0,
  alter column prizereal set default 0;

alter table public.matches
  alter column yellowa   set not null,
  alter column reda      set not null,
  alter column yellowb   set not null,
  alter column redb      set not null,
  alter column prizeaek  set not null,
  alter column prizereal set not null;


-- ---------------------------------------------------------------------------
-- 2) transactions.match_id: integer -> bigint + Fremdschluessel mit CASCADE
--    Der Typ passte bisher nicht zu matches.id (bigint). Und ohne
--    Fremdschluessel muss die App die Transaktionen beim Loeschen eines Spiels
--    von Hand aufraeumen — genau dort lag der Finanzfehler, den wir gefunden
--    haben. CASCADE macht das strukturell unmoeglich.
-- ---------------------------------------------------------------------------
alter table public.transactions
  alter column match_id type bigint using match_id::bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_match_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_match_id_fkey
      foreign key (match_id) references public.matches(id)
      on delete cascade;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 3) Team-Werte absichern
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'matches_teams_check' and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_teams_check
      check (teama in ('AEK','Real') and teamb in ('AEK','Real'));
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 4) Indizes
--    Bei eurer Datenmenge heute nicht spuerbar — aber jede saison-gefilterte
--    Abfrage ist bisher ein Full Scan, und das waechst mit jeder Saison.
-- ---------------------------------------------------------------------------
create index if not exists idx_matches_version            on public.matches            (fifa_version);
create index if not exists idx_matches_date               on public.matches            (date desc);
create index if not exists idx_players_version_team       on public.players            (fifa_version, team);
create index if not exists idx_bans_version               on public.bans               (fifa_version);
create index if not exists idx_bans_player                on public.bans               (player_id);
create index if not exists idx_transactions_version       on public.transactions       (fifa_version);
create index if not exists idx_transactions_match         on public.transactions       (match_id);
create index if not exists idx_finances_version_team      on public.finances           (fifa_version, team);
create index if not exists idx_sds_version                on public.spieler_des_spiels (fifa_version);


-- ---------------------------------------------------------------------------
-- 5) Eine Finanz-Zeile je Team und Saison — schuetzt vor Doppelbuchung
--    Wird nur angelegt, wenn es aktuell keine Duplikate gibt.
-- ---------------------------------------------------------------------------
do $$
declare dupes int;
begin
  select count(*) into dupes from (
    select fifa_version, team from public.finances
    group by 1,2 having count(*) > 1
  ) d;

  if dupes = 0 then
    if not exists (
      select 1 from pg_indexes
      where schemaname='public' and indexname='uq_finances_version_team'
    ) then
      create unique index uq_finances_version_team
        on public.finances (fifa_version, team);
    end if;
  else
    raise notice
      'HINWEIS: % doppelte finances-Zeile(n) je Team/Saison gefunden — der '
      'Eindeutigkeits-Index wurde NICHT angelegt. Alles andere ist migriert.',
      dupes;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6) Untergrenze 0 fuer Kontostand und Schulden
--    Das ist die ausdrueckliche Regel der App: der Kontostand soll minimal 0
--    sein. Bisher lebt sie nur an zwei Stellen im JavaScript
--    (AddTransactionTab: "if (newBalance < 0) newBalance = 0" und
--    matchService: "Math.max(0, ...)"). Zwei Kopien einer Regel laufen
--    frueher oder spaeter auseinander — hier steht sie einmal verbindlich.
--    Es aendert NICHTS an bestehenden Daten und nichts am Verhalten der App,
--    es zieht nur einen Boden ein, durch den nichts mehr faellt.
-- ---------------------------------------------------------------------------
do $$
declare negativ int;
begin
  select count(*) into negativ
  from public.finances
  where coalesce(balance,0) < 0 or coalesce(debt,0) < 0;

  if negativ > 0 then
    raise notice
      'HINWEIS: % finances-Zeile(n) sind negativ — die Untergrenzen-Regel wurde '
      'NICHT angelegt. Bitte zuerst klaeren, alles andere ist migriert.', negativ;
  else
    if not exists (
      select 1 from pg_constraint
      where conname = 'finances_nonnegative_check'
        and conrelid = 'public.finances'::regclass
    ) then
      alter table public.finances
        add constraint finances_nonnegative_check
        check (balance >= 0 and debt >= 0);
    end if;
  end if;
end $$;

commit;

-- Fertig. Danach in der App pruefen: Spiel anlegen, Spiel bearbeiten,
-- Spiel loeschen (Transaktionen muessen mitverschwinden), Finanzen stimmen.
