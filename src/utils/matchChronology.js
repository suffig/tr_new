// Chronological ordering for matches.
//
// IMPORTANT: match IDs are NOT chronological in this app — editing a match
// deletes and re-inserts it with a new (much higher) id. Sorting by id
// therefore breaks every time-based stat (Formkurve, Serie, Elo, Rekorde)
// as soon as one old match has been edited. Always order by DATE first;
// the id only breaks ties within the same day (evening order).

export const chronoAsc = (a, b) =>
  String(a.date || '').localeCompare(String(b.date || '')) || (a.id || 0) - (b.id || 0);

export const chronoDesc = (a, b) => chronoAsc(b, a);
