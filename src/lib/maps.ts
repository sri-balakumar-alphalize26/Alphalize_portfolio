import type { Office } from '@/config/site';

/**
 * Google Maps deep links for an office.
 *
 * `dir/` rather than `search/`: this is what a "scan for directions" code is
 * for, and it saves the visitor a tap once Maps opens.
 *
 * The destination is the **address string**, not the lat/lon we hold for the
 * map pin. Coordinates would be exact but Maps labels them as numbers rather
 * than a place. The full string is known to resolve — see the note in
 * src/config/site.ts, which records that "Chinnakada" and "Rd" both fail to
 * geocode and only the complete "Vadayattukotta Road, Kollam, Kerala 691001,
 * India" works. Do not "tidy" this back to the display wording.
 */
export function mapsQuery(office: Office): string {
  return [
    office.street.split(',')[0]?.trim(),
    office.locality,
    `${office.region} ${office.postalCode}`,
    office.country,
  ]
    .filter(Boolean)
    .join(', ');
}

export function directionsUrl(office: Office): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery(office))}`;
}
