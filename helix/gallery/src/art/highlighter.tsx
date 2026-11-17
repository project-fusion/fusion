import type { ReactNode } from 'react'

/**
 * Two lines of text, with a band of color behind words in the middle of the
 * first: a phrase marked as with a highlighter pen.
 */
export const highlighterArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.12" height="20" rx="3" width="104" x="120" y="78" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="48" x="64" y="84" />
    <rect className="artInk" fillOpacity="0.6" height="8" rx="4" width="92" x="126" y="84" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="40" x="228" y="84" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="168" x="64" y="108" />
  </>
)
