-- ============================================================================
--  RUECKWEG fuer Migration 01 und 02
-- ============================================================================
--  Nur ausfuehren, wenn nach einer Migration etwas nicht stimmt.
--
--  Wichtig zur Einordnung: dieses Skript nimmt REGELN zurueck, keine Daten.
--  Die einzige Datenaenderung aus 01 war "NULL -> 0" bei Karten und
--  Preisgeldern; das laesst sich nicht sinnvoll rueckgaengig machen und ist
--  auch nicht noetig — die App hat NULL dort ohnehin immer als 0 gelesen.
--
--  Fuer echten Datenverlust gibt es nur einen Weg zurueck: das Backup.
--
--  Supabase markiert dieses Skript als "destruktiv" — das ist korrekt und
--  erwartet: es entfernt Constraints und Indizes. Es loescht KEINE Zeilen.
-- ============================================================================

begin;

-- --- 02 zurueck: Fremdschluessel auf fifa_version ---------------------------
alter table public.matches            drop constraint if exists matches_fifa_version_fkey;
alter table public.players            drop constraint if exists players_fifa_version_fkey;
alter table public.bans               drop constraint if exists bans_fifa_version_fkey;
alter table public.transactions       drop constraint if exists transactions_fifa_version_fkey;
alter table public.finances           drop constraint if exists finances_fifa_version_fkey;
alter table public.spieler_des_spiels drop constraint if exists spieler_des_spiels_fifa_version_fkey;

-- --- 01 zurueck: Team-Check, Untergrenzen, Finanz-Eindeutigkeit, FK --------
alter table public.matches      drop constraint if exists matches_teams_check;
alter table public.finances     drop constraint if exists finances_nonnegative_check;
drop index  if exists public.uq_finances_version_team;
alter table public.transactions drop constraint if exists transactions_match_id_fkey;

-- --- 01 zurueck: NOT NULL bei Karten/Preisgeldern ---------------------------
--  (DEFAULT 0 bleibt bewusst stehen — das ist harmlos und sinnvoll.)
alter table public.matches
  alter column yellowa   drop not null,
  alter column reda      drop not null,
  alter column yellowb   drop not null,
  alter column redb      drop not null,
  alter column prizeaek  drop not null,
  alter column prizereal drop not null;

-- --- 01 zurueck: Indizes ----------------------------------------------------
drop index if exists public.idx_matches_version;
drop index if exists public.idx_matches_date;
drop index if exists public.idx_players_version_team;
drop index if exists public.idx_bans_version;
drop index if exists public.idx_bans_player;
drop index if exists public.idx_transactions_version;
drop index if exists public.idx_transactions_match;
drop index if exists public.idx_finances_version_team;
drop index if exists public.idx_sds_version;

commit;
