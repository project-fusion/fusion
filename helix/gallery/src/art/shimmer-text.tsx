import type { ReactNode } from 'react'

/**
 * A line of words in the quiet ink with a band of the full ink crossing its
 * middle, which is the whole of the component: the light passing over words
 * while the work they name runs.
 */
export const shimmerTextArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.22" height="12" rx="6" width="56" x="48" y="94" />
    <rect className="artInk" fillOpacity="0.22" height="12" rx="6" width="40" x="112" y="94" />
    <rect className="artInk" fillOpacity="0.7" height="12" rx="6" width="44" x="160" y="94" />
    <rect className="artInk" fillOpacity="0.22" height="12" rx="6" width="52" x="212" y="94" />
  </>
)
