-- ============================================================================
--  ZUSATZ-PRUEFUNG — Finanzen im Detail (reines SELECT, aendert NICHTS)
-- ============================================================================
--  Anlass: B3 aus 00_pruefung.sql zeigt, dass finances.balance nicht zur Summe
--  der Transaktionen passt, und zwar je Team unterschiedlich. AEK steht in
--  BEIDEN Saisons auf exakt 0 bei stark negativer Transaktionssumme.
--
--  Verdacht: der Kontostand wird im Code an beiden Schreibstellen bei 0
--  abgeschnitten (AddTransactionTab: "if (newBalance < 0) newBalance = 0",
--  matchService: "Math.max(0, ...)"), waehrend die Transaktion in voller Hoehe
--  gespeichert wird. Sobald ein Konto einmal unter null laeuft, koennen Buchung
--  und Kontostand nicht mehr uebereinstimmen.
--
--  Diese Abfragen sollen den Verdacht bestaetigen ODER widerlegen.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- C1: Woraus besteht die Summe? Aufschluesselung nach Transaktionsart.
--     Zeigt, ob z. B. Spielerkaeufe die negativen Summen treiben.
-- ---------------------------------------------------------------------------
select
  'C1 nach Art' as pruefung,
  fifa_version, team, type,
  count(*)    as buchungen,
  sum(amount) as summe
from public.transactions
group by 1,2,3,4
order by fifa_version, team, summe;


-- ---------------------------------------------------------------------------
-- C2: DIE ENTSCHEIDENDE ABFRAGE — laufender Kontostand in zeitlicher Folge.
--     Wenn "laufende_summe" irgendwo unter 0 geht, hat der 0-Deckel gegriffen
--     und ab da ist der gespeicherte Kontostand systematisch zu hoch.
--     Ausgegeben werden nur die Zeilen, ab denen es negativ wird.
-- ---------------------------------------------------------------------------
with lauf as (
  select
    fifa_version, team, date, id, type, amount,
    sum(amount) over (
      partition by fifa_version, team
      order by date, id
      rows between unbounded preceding and current row
    ) as laufende_summe
  from public.transactions
  where type not in ('Echtgeld-Ausgleich', 'Echtgeld-Ausgleich (getilgt)')
)
select 'C2 erster Unterlauf' as pruefung, fifa_version, team, date, id, type, amount, laufende_summe
from lauf
where laufende_summe < 0
order by fifa_version, team, date, id
limit 30;


-- ---------------------------------------------------------------------------
-- C3: Wie tief ging es maximal ins Minus? Das ist die Groessenordnung des
--     Betrags, der durch den 0-Deckel verlorengegangen ist.
-- ---------------------------------------------------------------------------
with lauf as (
  select
    fifa_version, team,
    sum(amount) over (
      partition by fifa_version, team
      order by date, id
      rows between unbounded preceding and current row
    ) as laufende_summe
  from public.transactions
  where type not in ('Echtgeld-Ausgleich', 'Echtgeld-Ausgleich (getilgt)')
)
select
  'C3 tiefster Stand' as pruefung,
  fifa_version, team,
  min(laufende_summe) as tiefster_punkt,
  case when min(laufende_summe) < 0
       then 'Deckel hat gegriffen — Betrag ging verloren'
       else 'nie negativ — Deckel war nie im Spiel' end as bewertung
from lauf
group by 1,2,3
order by fifa_version, team;


-- ---------------------------------------------------------------------------
-- C4: Gibt es ueberhaupt eine Startkapital-Buchung? Wenn nein, ist die
--     Differenz aus B3 teilweise schlicht das nirgends verbuchte Startkapital.
-- ---------------------------------------------------------------------------
select 'C4 moegliche Startbuchungen' as pruefung, fifa_version, team, date, type, amount, info
from public.transactions
where info ilike '%start%' or info ilike '%anfang%' or type ilike '%start%'
order by fifa_version, team, date;


-- ---------------------------------------------------------------------------
-- C5: Die aeltesten Buchungen je Team/Saison — zeigt, womit es losging.
-- ---------------------------------------------------------------------------
select 'C5 erste Buchungen' as pruefung, fifa_version, team, date, id, type, amount, info
from (
  select t.*, row_number() over (partition by fifa_version, team order by date, id) as rn
  from public.transactions t
) x
where rn <= 3
order by fifa_version, team, date, id;
