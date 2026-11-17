import type { ReactNode } from 'react'

/**
 * A line of text whose last word is leaving upward, faded, as the next rises
 * into its place.
 */
export const rotatingTextArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.6" height="12" rx="6" width="64" x="64" y="94" />
    <rect className="artInk" fillOpacity="0.15" height="12" rx="6" width="96" x="140" y="74" />
    <rect className="artInk" fillOpacity="0.6" height="12" rx="6" width="112" x="140" y="100" />
  </>
)
