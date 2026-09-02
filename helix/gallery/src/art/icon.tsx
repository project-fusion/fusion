import type { ReactNode } from 'react'

/**
 * Three glyphs from the set, all at the twenty pixel icon size.
 *
 * They have to read as one set, which is the only thing the card has to say,
 * so it is one 20 unit box each, one 2 unit weight each, one alpha, and every
 * one an outline rather than a solid, because that is what the icons in
 * `@fusion.dev/helix-icons` are. The disc is a ring for the same reason, and
 * the ring is `artPage` through the middle rather than a lighter ink, so it
 * is a hole and not a paler circle.
 */
export const iconArt: ReactNode = (
  <>
    <path className="artInk" d="M102 90l10 10-10 10h2.8l10-10-10-10z" fillOpacity="0.55" />
    <rect className="artInk" fillOpacity="0.55" height="2" rx="1" width="20" x="150" y="99" />
    <rect className="artInk" fillOpacity="0.55" height="20" rx="1" width="2" x="159" y="90" />
    <circle className="artInk" cx="212" cy="100" fillOpacity="0.55" r="10" />
    <circle className="artPage" cx="212" cy="100" r="8" />
  </>
)
