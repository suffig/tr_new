-- ============================================================================
--  ABEND PRUEFEN — nur lesen, aendert nichts
-- ============================================================================
--  Im Supabase-SQL-Editor ausfuehren. Zeigt, was seit dem 24.11.2026, 12 Uhr
--  angekommen ist: Schnaps, Sterne, Biere, Ziehungen, Spiele und ob und wann
--  ein Abend abgeschlossen wurde. Fuer einen anderen Abend das Datum in der
--  ersten Zeile aendern.
--
--  LESEN:
--    "Saison" ungleich FC27   -> das Telefon stand auf einer alten Saison.
--    "nach Abschluss" = ja    -> war gespeichert, aber in der App unsichtbar.
--    keine Zeile "Eintrag"    -> in der Datenbank ist nichts angekommen; dann
--                                steht es hoechstens noch auf dem Telefon.
-- ============================================================================
with ab as (select timestamptz '2026-11-24 12:00 Europe/Berlin' as t)
select 'Eintrag' as was, a.datum::text as abend, e.fifa_version as saison,
       to_char(e.created_at at time zone 'Europe/Berlin', 'DD.MM. HH24:MI:SS') as zeit,
       e.person, e.art || ' ' || e.menge::text as inhalt,
       case when a.abgeschlossen_am is null then 'offen'
            when e.created_at > a.abgeschlossen_am then 'ja' else 'nein' end as nach_abschluss
  from public.abend_ereignisse e join public.abende a on a.id = e.abend_id, ab
 where e.created_at >= ab.t
union all
select 'Abend', a.datum::text, a.fifa_version,
       to_char(a.created_at at time zone 'Europe/Berlin', 'DD.MM. HH24:MI:SS'), null,
       'abgeschlossen: ' || coalesce(to_char(a.abgeschlossen_am at time zone 'Europe/Berlin', 'DD.MM. HH24:MI:SS'), 'nein'),
       null
  from public.abende a, ab
 where a.datum >= (ab.t at time zone 'Europe/Berlin')::date or a.abgeschlossen_am >= ab.t
union all
select 'Ziehung', null, p.fifa_version,
       to_char(p.created_at at time zone 'Europe/Berlin', 'DD.MM. HH24:MI:SS'), p.person, p.team_name, null
  from public.team_pull_events p, ab
 where p.created_at >= ab.t
union all
select 'Spiel', m.date::text, m.fifa_version, null, null,
       coalesce(m.goalsa, 0)::text || ':' || coalesce(m.goalsb, 0)::text, null
  from public.matches m, ab
 where m.date::date >= (ab.t at time zone 'Europe/Berlin')::date
union all
select 'Letzter Eintrag ueberhaupt', null, e.fifa_version,
       to_char(max(e.created_at) at time zone 'Europe/Berlin', 'DD.MM.YYYY HH24:MI'), null,
       count(*)::text || ' Eintraege in der Saison', null
  from public.abend_ereignisse e
 group by e.fifa_version
order by 1, 4;
