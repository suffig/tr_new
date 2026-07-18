-- FUSTA · Finanz-Bestandsprüfung (NUR SELECT — ändert nichts).
-- In Supabase ausführen, um historische Drift durch den alten Edit/Delete-Bug
-- sichtbar zu machen. Abweichungen dann gezielt manuell korrigieren.

-- 1) Gespeicherte Bilanz vs. Summe aller Bilanz-Transaktionen je Team+Version.
--    Hinweis: Durch die Klammerung auf 0 € kann die gespeicherte Bilanz
--    historisch höher liegen als die Transaktionssumme — große/negative
--    Differenzen sind aber ein Zeichen für Drift.
select f.team, f.fifa_version,
       f.balance                                  as gespeicherte_bilanz,
       coalesce(t.summe, 0)                       as summe_transaktionen,
       f.balance - coalesce(t.summe, 0)           as differenz
from public.finances f
left join (
  select team, fifa_version, sum(amount) as summe
  from public.transactions
  where type not in ('Echtgeld-Ausgleich', 'Echtgeld-Ausgleich (getilgt)')
  group by team, fifa_version
) t on t.team = f.team and t.fifa_version = f.fifa_version
order by f.fifa_version, f.team;

-- 2) Echtgeld-Schulden vs. Summe der Echtgeld-Transaktionen.
select f.team, f.fifa_version,
       f.debt                                     as gespeicherte_schulden,
       coalesce(t.summe, 0)                       as summe_echtgeld_transaktionen,
       f.debt - coalesce(t.summe, 0)              as differenz
from public.finances f
left join (
  select team, fifa_version, sum(amount) as summe
  from public.transactions
  where type in ('Echtgeld-Ausgleich', 'Echtgeld-Ausgleich (getilgt)')
  group by team, fifa_version
) t on t.team = f.team and t.fifa_version = f.fifa_version
order by f.fifa_version, f.team;

-- 3) Verwaiste Transaktionen (match_id zeigt auf gelöschtes Match).
select t.id, t.date, t.type, t.team, t.amount, t.match_id, t.fifa_version
from public.transactions t
where t.match_id is not null
  and not exists (select 1 from public.matches m where m.id = t.match_id)
order by t.date desc;

-- 4) Matches mit Sieger, aber ohne einzige Transaktion (Buchung fehlgeschlagen?).
select m.id, m.date, m.goalsa, m.goalsb, m.prizeaek, m.prizereal, m.fifa_version
from public.matches m
where m.goalsa <> m.goalsb
  and not exists (select 1 from public.transactions t where t.match_id = m.id)
order by m.date desc;
