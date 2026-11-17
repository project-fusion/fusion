import type { ReactNode } from 'react'

/**
 * Three cards down a page, the first in place, the second lower and fainter,
 * and the third lower and fainter still: sections rising in as they arrive.
 */
export const revealArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.22" height="28" rx="6" width="176" x="72" y="44" />
    <rect className="artInk" fillOpacity="0.12" height="28" rx="6" width="176" x="72" y="90" />
    <rect className="artInk" fillOpacity="0.05" height="28" rx="6" width="176" x="72" y="140" />
  </>
)
