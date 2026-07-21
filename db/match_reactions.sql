-- Reaktionen & Kommentare zu einzelnen Spielen
--
-- In Supabase ausfuehren (SQL Editor). Das Skript ist idempotent und enthaelt
-- bewusst KEIN "drop" — sonst markiert Supabase es als destruktiv und warnt.
-- Mehrfaches Ausfuehren ist gefahrlos.
--
-- Solange diese Tabelle fehlt, blendet die App das Feature einfach aus.

create table if not exists public.match_reactions (
  id          bigserial primary key,
  match_id    bigint      not null,
  user_email  text        not null,
  emoji       text,
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Pro Person genau eine Reaktion je Spiel (wird beim Aendern ueberschrieben).
create unique index if not exists match_reactions_match_user_idx
  on public.match_reactions (match_id, user_email);

-- Schnelles Nachladen aller Reaktionen einer Spieleliste.
create index if not exists match_reactions_match_idx
  on public.match_reactions (match_id);

alter table public.match_reactions enable row level security;

-- Policies nur anlegen, wenn sie noch nicht existieren (kein drop noetig).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'match_reactions'
      and policyname = 'match_reactions_select_all'
  ) then
    create policy match_reactions_select_all
      on public.match_reactions
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'match_reactions'
      and policyname = 'match_reactions_insert_own'
  ) then
    create policy match_reactions_insert_own
      on public.match_reactions
      for insert
      to authenticated
      with check (user_email = auth.jwt() ->> 'email');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'match_reactions'
      and policyname = 'match_reactions_update_own'
  ) then
    create policy match_reactions_update_own
      on public.match_reactions
      for update
      to authenticated
      using (user_email = auth.jwt() ->> 'email')
      with check (user_email = auth.jwt() ->> 'email');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'match_reactions'
      and policyname = 'match_reactions_delete_own'
  ) then
    create policy match_reactions_delete_own
      on public.match_reactions
      for delete
      to authenticated
      using (user_email = auth.jwt() ->> 'email');
  end if;
end $$;

-- Realtime, damit die Reaktion des anderen sofort auftaucht (optional).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_reactions'
  ) then
    alter publication supabase_realtime add table public.match_reactions;
  end if;
end $$;
