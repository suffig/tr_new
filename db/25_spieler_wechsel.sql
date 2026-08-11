-- FUSTA · Spielerwechsel festhalten.
-- In Supabase (SQL-Editor) ausfuehren.
--
-- NICHT-DESTRUKTIV: legt nur die NEUE Tabelle public.spieler_wechsel an,
-- aktiviert RLS mit einer Policy und schreibt fuer jeden heutigen Spieler eine
-- Startzeile. Es wird KEINE bestehende Tabelle veraendert oder geloescht.
-- Kein DROP, kein DELETE, kein TRUNCATE, kein ALTER an players.
--
-- ============================================================================
-- WOZU
-- ============================================================================
-- Spieler wechseln zwischen Alexander (AEK), Philip (Real) und "Ehemalige" —
-- auch mitten in einer Saison. Bisher stand in players.team nur EIN Wert. Ein
-- Wechsel hat den alten ueberschrieben; ab wann jemand wo war, stand nirgends.
--
-- Was dadurch NICHT verloren ging: Tore. Die stehen je Spiel in zwei getrennten
-- Listen (matches.goalslista = Tore fuer AEK, goalslistb = fuer Real). Wer wann
-- fuer wen getroffen hat, ist damit bereits festgehalten und bleibt richtig,
-- auch wenn der Spieler spaeter wechselt.
--
-- Was fehlte und was diese Tabelle liefert:
--   * seit wann jemand bei wem ist
--   * wie viele Spiele jemand im Kader einer Seite verbracht hat
--   * die Laufbahn eines Spielers als Verlauf statt als Momentaufnahme
--
-- ============================================================================
-- RUECKWIRKEND GEHT DAS NICHT
-- ============================================================================
-- Fuer die Vergangenheit gibt es keine Wechseldaten — sie wurden nie erfasst.
-- Deshalb schreibt dieses Skript fuer jeden heutigen Spieler EINE Startzeile
-- mit dem heutigen Datum und `von = null` ("Stand bei Einfuehrung"). Ab da ist
-- der Verlauf lueckenlos. Die App beschriftet Zeitraeume vor dieser Zeile
-- ausdruecklich als unbekannt, statt sie stillschweigend der heutigen Seite
-- zuzuschlagen.
--
-- ============================================================================
-- IDENTITAET
-- ============================================================================
-- players hat eine Zeile JE SAISON. Derselbe Mensch ist also mehrere Zeilen.
-- Deshalb haengt der Wechsel an `person_key` — dem normalisierten Namen, wie
-- ihn nameKey() in src/utils/playerIdentity.js bildet (Kleinschreibung, ohne
-- Akzente, ohne Satz- und Leerzeichen). `spieler_id` zeigt zusaetzlich auf die
-- Zeile, aus der der Wechsel ausgeloest wurde — als Bequemlichkeit, nicht als
-- Schluessel: sie kann auf eine Saison zeigen, die spaeter nicht mehr die
-- aktuelle ist.

create table if not exists public.spieler_wechsel (
  id             bigint generated always as identity primary key,

  -- Wer. person_key ist der Schluessel, name nur zum Lesen.
  person_key     text not null,
  name           text not null,
  spieler_id     bigint,

  -- Wohin. `von` ist null bei der Startzeile und bei Zugaengen von aussen.
  von            text,
  nach           text not null,

  -- Wann. Datum reicht: die Spiele tragen ebenfalls nur ein Datum.
  datum          date not null,
  fifa_version   text not null,

  -- Optional der Kauf oder Verkauf, der den Wechsel ausgeloest hat.
  transaktion_id bigint,

  notiz          text,
  created_at     timestamptz not null default now(),

  constraint spieler_wechsel_nach_gueltig check (nach in ('AEK', 'Real', 'Ehemalige')),
  constraint spieler_wechsel_von_gueltig  check (von is null or von in ('AEK', 'Real', 'Ehemalige')),
  -- Ein Wechsel auf dieselbe Seite ist keiner.
  constraint spieler_wechsel_echt         check (von is null or von <> nach)
);

-- Die Abfrage, die die App staendig stellt: "alle Wechsel dieser Person,
-- aelteste zuerst".
create index if not exists spieler_wechsel_person_datum
  on public.spieler_wechsel (person_key, datum, id);

alter table public.spieler_wechsel enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'spieler_wechsel'
      and policyname = 'spieler_wechsel full access'
  ) then
    create policy "spieler_wechsel full access"
      on public.spieler_wechsel for all using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Startzeilen: der heutige Stand als Ausgangspunkt.
--
-- Nur fuer Spieler der AKTIVEN Saison und nur, wenn die Person noch keine
-- Zeile hat — dadurch ist das Skript wiederholbar, ohne Dubletten zu erzeugen.
-- Der normalisierte Name wird hier in SQL gebildet und muss zu nameKey() in
-- playerIdentity.js passen: Kleinschreibung, Akzente aufgeloest, alles ausser
-- a-z und 0-9 entfernt.
-- ---------------------------------------------------------------------------
insert into public.spieler_wechsel (person_key, name, spieler_id, von, nach, datum, fifa_version, notiz)
select
  regexp_replace(
    lower(translate(p.name,
      'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝÑÇ',
      'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYNC')),
    '[^a-z0-9]', '', 'g') as person_key,
  p.name,
  p.id,
  null,
  p.team,
  current_date,
  coalesce(p.fifa_version, 'FC26'),
  'Stand bei Einführung der Wechsel-Erfassung'
from public.players p
join public.fifa_versions v
  on v.id = coalesce(p.fifa_version, 'FC26') and v.is_active
where p.team in ('AEK', 'Real', 'Ehemalige')
  and not exists (
    select 1 from public.spieler_wechsel w
     where w.person_key = regexp_replace(
       lower(translate(p.name,
         'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝÑÇ',
         'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYNC')),
       '[^a-z0-9]', '', 'g')
  );

-- Kontrolle: wie viele Startzeilen gibt es, und stimmen sie mit dem Kader?
select w.fifa_version,
       w.nach as seite,
       count(*) as spieler,
       min(w.datum) as ab
  from public.spieler_wechsel w
 where w.von is null
 group by w.fifa_version, w.nach
 order by w.fifa_version, w.nach;
