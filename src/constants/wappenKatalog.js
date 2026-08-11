/**
 * Welche Vereinswappen als Datei vorliegen.
 *
 * NICHT VON HAND PFLEGEN — diese Datei schreibt scripts/wappen-holen.mjs aus
 * dem Inhalt von public/logos/. Der Katalog wird aus dem Ordner abgeleitet und
 * nicht danebengeführt, damit die Auswahl in der Verwaltung nichts anbieten
 * kann, was nicht wirklich daliegt.
 *
 * Vereinswappen von footylogos.com, Quellenangabe steht im Profil. Eintraege
 * mit `eigen: true` sind selbst gezeichnete Platzhalter und stammen nicht
 * von dort.
 */

export const WAPPEN = [
  {
    slug: "ac-milan",
    name: "AC Milan"
  },
  {
    slug: "aek-athens",
    name: "AEK Athen"
  },
  {
    slug: "spieler-alexander",
    name: "Alexander (Platzhalter)",
    eigen: true
  },
  {
    slug: "dynamo-dresden",
    name: "Dynamo Dresden"
  },
  {
    slug: "hertha-bsc",
    name: "Hertha BSC"
  },
  {
    slug: "manchester-city",
    name: "Manchester City"
  },
  {
    slug: "spieler-philip",
    name: "Philip (Platzhalter)",
    eigen: true
  },
  {
    slug: "real-madrid",
    name: "Real Madrid"
  },
  {
    slug: "schalke-04",
    name: "Schalke 04"
  }
];

/** Pfad zur Wappendatei, oder null wenn der Slug nichts Bekanntes meint. */
export function wappenPfad(slug) {
  if (!slug) return null;
  return WAPPEN.some((w) => w.slug === slug)
    ? `${import.meta.env.BASE_URL}logos/${slug}.svg`
    : null;
}
