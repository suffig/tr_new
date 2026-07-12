-- FUSTA · FC-Versionen geraeteuebergreifend teilen.
-- In Supabase (SQL-Editor) ausfuehren.
--
-- NICHT-DESTRUKTIV: legt nur die NEUE Tabelle public.fifa_versions an, aktiviert
-- darauf RLS + eine Policy und seedet zwei Zeilen. Es werden KEINE bestehenden
-- Tabellen/Daten (matches, players, ...) veraendert oder geloescht.
-- Kein DROP/DELETE/TRUNCATE -> die frueher gezeigte "destructive"-Warnung faellt weg.

create table if not exists public.fifa_versions (
  id         text primary key,                 -- 'FC25','FC26','FC27', ...
  name       text,                             -- optionaler Klartext-Name
  is_active  boolean not null default false,   -- genau eine Version aktiv
  teams      jsonb not null default '{}'::jsonb, -- { AEK:{label,short,color,icon,customIcon}, Real:{...}, Ehemalige:{...} }
  created_at timestamptz not null default now()
);

alter table public.fifa_versions enable row level security;

-- Policy nur anlegen, falls sie noch nicht existiert (idempotent, ohne DROP).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'fifa_versions'
      and policyname = 'fifa_versions full access'
  ) then
    create policy "fifa_versions full access"
      on public.fifa_versions for all using (true) with check (true);
  end if;
end $$;

-- Seed der beiden bestehenden Versionen mit den aktuellen Defaults (FC26 aktiv).
insert into public.fifa_versions (id, name, is_active, teams) values
  ('FC25', 'FC25', false,
   '{"AEK":{"label":"AEK Athen","short":"AEK","color":"blue","icon":"aek","customIcon":null},
     "Real":{"label":"Real Madrid","short":"Real","color":"red","icon":"real","customIcon":null},
     "Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb),
  ('FC26', 'FC26', true,
   '{"AEK":{"label":"Dynamo Dresden","short":"Dynamo","color":"blue","icon":"dynamo","customIcon":null},
     "Real":{"label":"Schalke 04","short":"S04","color":"red","icon":"real","customIcon":null},
     "Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do nothing;
