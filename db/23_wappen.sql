-- FUSTA · Vereinswappen in die Saison-Konfiguration eintragen.
-- In Supabase (SQL-Editor) ausfuehren.
--
-- NICHT-DESTRUKTIV: setzt nur einen zusaetzlichen Schluessel "wappen" in das
-- vorhandene JSONB-Feld public.fifa_versions.teams. Kein DROP, kein DELETE,
-- kein TRUNCATE, keine Spalte faellt weg. Alles Bestehende (label, short,
-- color, icon, customIcon) bleibt unveraendert stehen.
--
-- WAS DAS BEWIRKT
-- "wappen" ist ein Slug, der auf eine Datei in public/logos/ zeigt — geholt
-- von footylogos.com mit scripts/wappen-holen.mjs. Weil die App die
-- teams-Konfiguration aus dieser Tabelle in beide Geraete spiegelt
-- (src/utils/fifaVersionsSync.js), sehen ab dann BEIDE dasselbe Wappen. Die
-- bisherige Upload-Moeglichkeit legte das Bild nur im localStorage des einen
-- Geraets ab.
--
-- Steht bei einer Saison kein "wappen" (oder zeigt der Slug auf eine Datei,
-- die es nicht gibt), faellt die App auf die vier mitgelieferten PNGs zurueck
-- und danach auf ein Emoji — es kann also nichts leer bleiben.

-- FC25: AEK Athen und Real Madrid
update public.fifa_versions
   set teams = jsonb_set(
                 jsonb_set(teams, '{AEK,wappen}',  '"aek-athens"'::jsonb, true),
                 '{Real,wappen}', '"real-madrid"'::jsonb, true)
 where id = 'FC25'
   and teams ? 'AEK' and teams ? 'Real';

-- FC26: Dynamo Dresden und Schalke 04
update public.fifa_versions
   set teams = jsonb_set(
                 jsonb_set(teams, '{AEK,wappen}',  '"dynamo-dresden"'::jsonb, true),
                 '{Real,wappen}', '"schalke-04"'::jsonb, true)
 where id = 'FC26'
   and teams ? 'AEK' and teams ? 'Real';

-- Kontrolle: was steht jetzt drin?
select id,
       teams -> 'AEK'  ->> 'label'  as aek,
       teams -> 'AEK'  ->> 'wappen' as aek_wappen,
       teams -> 'Real' ->> 'label'  as real,
       teams -> 'Real' ->> 'wappen' as real_wappen
  from public.fifa_versions
 order by id;
