-- FUSTA · Wappen fuer die Altsaisons FC15 bis FC24.
-- In Supabase (SQL-Editor) ausfuehren. Setzt voraus, dass db/23_wappen.sql
-- schon gelaufen ist (das hat FC25 und FC26 gesetzt).
--
-- NICHT-DESTRUKTIV: setzt nur den Schluessel "wappen" in das vorhandene
-- JSONB-Feld public.fifa_versions.teams. Kein DROP, kein DELETE, kein
-- TRUNCATE, keine Spalte faellt weg. label, short, color, icon und customIcon
-- bleiben unveraendert stehen.
--
-- ZWEIERLEI WAPPEN
-- FC15 und FC16 wurden mit echten Vereinen gespielt — dort steht das Wappen
-- des Vereins. Ab FC19 heissen die Seiten schlicht "Alexander" und "Philip";
-- ein Vereinswappen waere dort falsch. Sie bekommen einen selbst gezeichneten
-- Platzhalter: eine Silhouette auf farbiger Scheibe, blau fuer die eine und
-- rot fuer die andere Seite, wie ueberall sonst in der App. Beide liegen als
-- public/logos/spieler-*.svg im Repo und stammen NICHT von footylogos.
--
-- Zeigt ein Slug auf eine Datei, die es nicht gibt, faellt die App auf die
-- mitgelieferten PNGs und danach auf ein Emoji zurueck — leer bleibt nichts.

with zuordnung(saison, aek_slug, real_slug) as (
  values
    ('FC15', 'ac-milan',          'manchester-city'),
    ('FC16', 'ac-milan',          'hertha-bsc'),
    ('FC19', 'spieler-alexander', 'spieler-philip'),
    ('FC20', 'spieler-alexander', 'spieler-philip'),
    ('FC21', 'spieler-alexander', 'spieler-philip'),
    ('FC23', 'spieler-alexander', 'spieler-philip'),
    ('FC24', 'spieler-alexander', 'spieler-philip')
)
update public.fifa_versions v
   set teams = jsonb_set(
                 jsonb_set(v.teams, '{AEK,wappen}',  to_jsonb(z.aek_slug),  true),
                 '{Real,wappen}', to_jsonb(z.real_slug), true)
  from zuordnung z
 where v.id = z.saison
   and v.teams ? 'AEK' and v.teams ? 'Real';

-- Kontrolle: steht jetzt ueberall ein Wappen?
select id,
       teams -> 'AEK'  ->> 'label'  as aek,
       teams -> 'AEK'  ->> 'wappen' as aek_wappen,
       teams -> 'Real' ->> 'label'  as real,
       teams -> 'Real' ->> 'wappen' as real_wappen,
       case when teams -> 'AEK' ->> 'wappen' is null
              or teams -> 'Real' ->> 'wappen' is null
            then 'FEHLT NOCH' else 'ok' end as status
  from public.fifa_versions
 order by id;
