-- ============================================================================
--  MIGRATION 02 — FREMDSCHLUESSEL AUF fifa_version
-- ============================================================================
--  ERST AUSFUEHREN, WENN BEIDE PUNKTE ERFUELLT SIND:
--
--   1. Die App-Version mit der gehaerteten Saison-Anlage ist auf BEIDEN
--      Geraeten aktiv (PWA einmal neu laden). Vorher legte die App eine neue
--      Saison lokal an und schob sie nur "best effort" in die Datenbank —
--      schlug das fehl, blieb die Saison lokal aktiv, aber unregistriert.
--      MIT diesem Fremdschluessel waere in so einer Saison KEIN EINZIGER
--      Insert mehr moeglich (Spiele, Spieler, Transaktionen — alles abgewiesen).
--      Die neue App-Version aktiviert eine Saison erst, wenn die Registrierung
--      in der Datenbank bestaetigt ist.
--
--   2. db/00_pruefung.sql, Abschnitt A1 meldet fuer JEDE vorkommende Version
--      "ja" — also keine unregistrierte Saison in den Daten.
--
--  Das Skript prueft Punkt 2 selbst und bricht sauber ab, wenn etwas fehlt.
--  Rueckweg: db/03_rollback.sql
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Vorbedingung: alle vorkommenden Versionen muessen registriert sein
-- ---------------------------------------------------------------------------
do $$
declare fehlend text;
begin
  select string_agg(distinct v.version, ', ') into fehlend
  from (
    select fifa_version as version from public.matches
    union select fifa_version from public.players
    union select fifa_version from public.bans
    union select fifa_version from public.transactions
    union select fifa_version from public.finances
    union select fifa_version from public.spieler_des_spiels
  ) v
  left join public.fifa_versions fv on fv.id = v.version
  where fv.id is null;

  if fehlend is not null then
    raise exception
      'ABBRUCH: Diese Saison(en) kommen in den Daten vor, sind aber nicht in '
      'fifa_versions registriert: %. Bitte dort anlegen (oder die Daten '
      'korrigieren), dann erneut ausfuehren.', fehlend;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 1) Fremdschluessel je Tabelle
--    ON UPDATE CASCADE: wird eine Versions-ID mal umbenannt, wandert die
--    Aenderung automatisch mit. KEIN ON DELETE CASCADE — eine Saison zu
--    loeschen soll NICHT stillschweigend alle Spiele mitnehmen; das muss
--    bewusst passieren (RESTRICT verhindert den Unfall).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tabellen text[] := array[
    'matches','players','bans','transactions','finances','spieler_des_spiels'
  ];
  cname text;
begin
  foreach t in array tabellen loop
    cname := t || '_fifa_version_fkey';
    if not exists (
      select 1 from pg_constraint
      where conname = cname and conrelid = ('public.'||t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I
           foreign key (fifa_version) references public.fifa_versions(id)
           on update cascade on delete restrict',
        t, cname
      );
      raise notice 'Fremdschluessel angelegt: %', cname;
    end if;
  end loop;
end $$;

commit;

-- Danach in der App pruefen: neue Saison anlegen (muss funktionieren und in
-- fifa_versions auftauchen), Spiel in der neuen Saison eintragen, Saison
-- wechseln. Und den Fehlerfall: Saison anlegen ohne Netz -> die App darf sie
-- NICHT aktivieren, sondern muss eine klare Meldung zeigen.
