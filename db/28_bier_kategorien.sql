-- ============================================================================
--  BIERBÖRSE — eigene Bewertungskategorien
-- ============================================================================
--  NICHT-DESTRUKTIV: legt eine neue Tabelle an. Kein DROP, kein DELETE, an
--  bestehenden Verkostungen und Einstellungen wird nichts geändert.
--
--  WARUM EINE TABELLE UND NICHT NUR CODE
--  Die 17 mitgelieferten Kategorien stehen in bierboerse.js. Die AUSWAHL
--  liegt längst in der Datenbank (bierboerse_einstellungen.kategorien), und
--  die vergebenen Noten stehen als jsonb unter dem Kategorie-Schlüssel. Nur
--  der Katalog selbst war fest verdrahtet — eine eigene Kategorie wurde
--  gespeichert und beim nächsten Laden still weggefiltert, weil der Code sie
--  nicht kannte.
--
--  DIE MITGELIEFERTEN BLEIBEN IM CODE
--  Sie wandern bewusst NICHT in diese Tabelle. Sonst müsste die Migration
--  sie einspielen, und wer eine davon versehentlich löscht, verlöre sie
--  überall. Die Tabelle enthält nur, was ihr selbst dazugeschrieben habt;
--  die App legt beide Listen übereinander.
--
--  id IST DER SCHLÜSSEL IN DEN NOTEN
--  noten_aek/noten_real sind jsonb-Objekte, deren Schlüssel diese id ist.
--  Deshalb text und nicht bigserial, deshalb unveränderlich: würde man die
--  id nachträglich ändern, zeigten alle bisherigen Noten ins Leere.
--
--  AKTIV STATT LÖSCHEN
--  aktiv = false blendet die Kategorie im Formular aus, lässt die bereits
--  vergebenen Noten aber unangetastet — sie stecken in den Verkostungen und
--  gehören zur Geschichte des Abends. Ein echtes Löschen müsste sie aus
--  jeder Verkostungszeile einzeln entfernen; das ist unwiderruflich und
--  deshalb nicht vorgesehen.
-- ============================================================================

create table if not exists public.bier_kategorien (
  id         text primary key,
  label      text not null,
  hilfe      text,
  gruppe     text not null default 'Eigene',
  aktiv      boolean not null default true,
  sortierung int not null default 0,
  created_at timestamptz not null default now(),

  -- Nur Kleinbuchstaben und Ziffern: die id landet als jsonb-Schlüssel in
  -- den Noten und wird in der App aus der Bezeichnung gebildet. Ein Punkt
  -- oder Leerzeichen darin macht das Nachschlagen unnötig fehleranfällig.
  constraint bier_kategorien_id_form check (id ~ '^[a-z0-9]{2,32}$'),
  constraint bier_kategorien_label_da check (length(trim(label)) > 0)
);

alter table public.bier_kategorien enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bier_kategorien' and policyname = 'bier_kategorien_all'
  ) then
    -- Beide dürfen: ihr bewertet gemeinsam, also darf auch jeder eine
    -- Kategorie ergänzen. Dieselbe Regel wie beim Rest der Bierbörse.
    create policy bier_kategorien_all on public.bier_kategorien
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Kontrolle
select
  (select count(*) from information_schema.tables
   where table_schema = 'public' and table_name = 'bier_kategorien') as tabelle_da,
  (select count(*) from pg_policies
   where tablename = 'bier_kategorien')                              as regel_da,
  (select count(*) from public.bier_kategorien)                      as eigene_kategorien;
