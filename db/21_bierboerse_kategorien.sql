-- ============================================================================
--  BIERBÖRSE — einfacher und ausführlicher Bewertungsmodus
-- ============================================================================
--  NICHT-DESTRUKTIV und WIEDERHOLBAR. Kein DROP, kein DELETE. Wer eine frühere
--  Fassung dieser Datei schon ausgeführt hat, kann sie gefahrlos erneut laufen
--  lassen — die alten Spalten werden dann übernommen statt weggeworfen.
--
--  Zwei Arten einzutragen:
--
--    einfach       eine Note von 0 bis 10 je Person. Zwei Taps, fertig.
--    ausführlich   beliebig viele Kategorien, je Person eine Note.
--
--  Warum JSONB und keine Spalte je Kategorie:
--  Die Kategorien sollen in den Einstellungen an- und abwählbar sein, auch
--  nachträglich. Mit festen Spalten hieße jede neue Kategorie eine Migration,
--  und eine abgewählte Kategorie ließe ihre Spalte als Leiche zurück. In
--  `noten_aek` / `noten_real` steht schlicht {"geschmack": 8, "antrunk": 7}.
--
--  Die Gesamtnote note_aek / note_real BLEIBT und ist weiterhin die Zahl, mit
--  der ALLE Auswertungen rechnen (Bestenliste, Sortenschnitt, Fundstücke,
--  Bier-Verlauf, Geschmacks-Duell). Im einfachen Modus wird sie direkt
--  eingetippt, im ausführlichen aus den vergebenen Kategorien gemittelt.
--  Deshalb muss keine einzige Auswertung angefasst werden.
-- ============================================================================

-- 1. Gesamtnoten als Kommazahl -----------------------------------------------
--    Das Mittel aus 8, 8 und 7 ist 7,7 — als int gerundet stünden drei
--    verschiedene Biere gleichauf in der Bestenliste. int -> numeric ist eine
--    erweiternde Umwandlung, vorhandene Werte bleiben (7 wird zu 7.0).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bier_verkostungen'
      and column_name = 'note_aek' and data_type = 'integer'
  ) then
    alter table public.bier_verkostungen
      alter column note_aek  type numeric(3,1),
      alter column note_real type numeric(3,1);
  end if;
end $$;

-- 2. Die Noten je Kategorie ---------------------------------------------------
alter table public.bier_verkostungen
  add column if not exists noten_aek  jsonb not null default '{}'::jsonb,
  add column if not exists noten_real jsonb not null default '{}'::jsonb;

-- 3. Einstellungen ------------------------------------------------------------
--    Genau eine Zeile. `kategorien` ist die geordnete Liste der Schlüssel, die
--    im ausführlichen Modus abgefragt werden; `modus` der Vorschlag beim
--    Öffnen des Formulars.
create table if not exists public.bierboerse_einstellungen (
  id          smallint primary key default 1,
  modus       text not null default 'einfach',
  kategorien  jsonb not null default '["geschmack","aussehen","preisleistung"]'::jsonb,
  geaendert   timestamptz not null default now(),
  constraint bierboerse_einstellungen_einzeln check (id = 1),
  constraint bierboerse_einstellungen_modus check (modus in ('einfach', 'ausfuehrlich'))
);

insert into public.bierboerse_einstellungen (id) values (1)
on conflict (id) do nothing;

alter table public.bierboerse_einstellungen enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bierboerse_einstellungen' and policyname = 'bierboerse_einstellungen_all'
  ) then
    create policy bierboerse_einstellungen_all on public.bierboerse_einstellungen
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- 4. Übernahme aus der früheren Fassung ---------------------------------------
--    Falls die Spalten geschmack_*/aussehen_*/pl_* existieren (frühere Version
--    dieser Datei), wandern ihre Werte ins JSONB. Die Spalten bleiben stehen —
--    Löschen wäre destruktiv und bringt nichts.
do $$
declare
  hat_alte boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bier_verkostungen'
      and column_name = 'geschmack_aek'
  ) into hat_alte;

  if hat_alte then
    execute $sql$
      update public.bier_verkostungen set
        noten_aek = noten_aek
          || case when geschmack_aek is null then '{}'::jsonb else jsonb_build_object('geschmack', geschmack_aek) end
          || case when aussehen_aek  is null then '{}'::jsonb else jsonb_build_object('aussehen',  aussehen_aek)  end
          || case when pl_aek        is null then '{}'::jsonb else jsonb_build_object('preisleistung', pl_aek)    end,
        noten_real = noten_real
          || case when geschmack_real is null then '{}'::jsonb else jsonb_build_object('geschmack', geschmack_real) end
          || case when aussehen_real  is null then '{}'::jsonb else jsonb_build_object('aussehen',  aussehen_real)  end
          || case when pl_real        is null then '{}'::jsonb else jsonb_build_object('preisleistung', pl_real)    end
      where geschmack_aek is not null or aussehen_aek is not null or pl_aek is not null
         or geschmack_real is not null or aussehen_real is not null or pl_real is not null
    $sql$;
  end if;
end $$;

-- Kontrolle
select
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_verkostungen'
     and column_name in ('noten_aek','noten_real')) as noten_spalten,
  (select data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_verkostungen'
     and column_name = 'note_aek') as note_typ,
  (select modus from public.bierboerse_einstellungen where id = 1) as modus,
  (select kategorien from public.bierboerse_einstellungen where id = 1) as kategorien,
  (select count(*) from public.bier_verkostungen
   where noten_aek <> '{}'::jsonb or noten_real <> '{}'::jsonb) as mit_kategorien,
  (select count(*) from public.bier_verkostungen) as verkostungen;
