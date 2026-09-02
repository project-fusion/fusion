import type { ReactNode } from 'react'

/**
 * What element it is, and what it looks like: the scale in one picture.
 *
 * One line per step, which is the whole scale and the fewest marks that can
 * carry it. Extra body lines make a paragraph, and a paragraph is a picture
 * of prose rather than of a type scale.
 */
export const textArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.55" height="16" rx="4" width="144" x="48" y="72" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="224" x="48" y="100" />
    <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="96" x="48" y="122" />
  </>
)
