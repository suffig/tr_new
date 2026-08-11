/**
 * Welche Vereinswappen als Datei vorliegen.
 *
 * NICHT VON HAND PFLEGEN — diese Datei schreibt scripts/wappen-holen.mjs aus
 * dem Inhalt von public/logos/. Der Katalog wird aus dem Ordner abgeleitet und
 * nicht danebengeführt, damit die Auswahl in der Verwaltung nichts anbieten
 * kann, was nicht wirklich daliegt.
 *
 * Wappen von footylogos.com. Quellenangabe steht im Profil.
 */

export const WAPPEN = [
  {
    slug: "aek-athens",
    name: "AEK Athen"
  },
  {
    slug: "dynamo-dresden",
    name: "Dynamo Dresden"
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
