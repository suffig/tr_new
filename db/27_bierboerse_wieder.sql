-- ============================================================================
--  BIERBÖRSE — "nochmal kaufen?" je Person
-- ============================================================================
--  NICHT-DESTRUKTIV: fuegt nur zwei Spalten hinzu. Kein DROP, kein DELETE,
--  bestehende Verkostungen bleiben unveraendert (beide Spalten werden null).
--
--  WARUM NEBEN DER NOTE
--  Eine 7,5 sagt, wie gut es war. Sie sagt nicht, ob ihr es wieder holt —
--  und das ist die Frage, die im Laden zaehlt. Beides faellt oft
--  auseinander: ein interessantes Sauerbier kann eine gute Note bekommen
--  und trotzdem nie wieder im Korb landen, ein solides Helles andersherum.
--
--  WARUM JE PERSON UND NICHT EINMAL
--  Weil es genau darum geht, wo ihr euch uneinig seid. Wenn beide "ja"
--  sagen, ist es ein Fall fuer die Einkaufsliste; wenn nur einer, ist es
--  eine Geschmacksfrage — und die ist in dieser App der Stoff, aus dem die
--  Auswertungen sind.
--
--  DREI ZUSTAENDE, NICHT ZWEI
--  true  = wuerde ich wieder kaufen
--  false = wuerde ich nicht wieder kaufen
--  null  = nicht beantwortet
--
--  Deshalb boolean und NICHT "not null default false": ein nicht gestellter
--  Daumen ist kein Daumen nach unten. Ohne den dritten Zustand haetten alle
--  Altbestaende schlagartig ein "nein" von beiden — eine Aussage, die nie
--  jemand getroffen hat.
-- ============================================================================

alter table public.bier_verkostungen
  add column if not exists wieder_aek  boolean,
  add column if not exists wieder_real boolean;

-- Kontrolle
select
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_verkostungen'
     and column_name in ('wieder_aek', 'wieder_real')) as spalten_da,   -- erwartet: 2
  (select count(*) from public.bier_verkostungen)      as verkostungen,
  (select count(*) from public.bier_verkostungen
   where wieder_aek is not null or wieder_real is not null) as schon_beantwortet;
