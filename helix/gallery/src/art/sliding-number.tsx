import type { ReactNode } from 'react'

/**
 * Four digit columns, the last caught mid-roll between two figures: a count
 * turning its units over.
 */
export const slidingNumberArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.6" height="40" rx="6" width="28" x="100" y="80" />
    <rect className="artInk" fillOpacity="0.6" height="40" rx="6" width="28" x="134" y="80" />
    <rect className="artInk" fillOpacity="0.6" height="40" rx="6" width="28" x="168" y="80" />
    <rect className="artInk" fillOpacity="0.22" height="40" rx="6" width="28" x="202" y="56" />
    <rect className="artInk" fillOpacity="0.6" height="40" rx="6" width="28" x="202" y="104" />
  </>
)
