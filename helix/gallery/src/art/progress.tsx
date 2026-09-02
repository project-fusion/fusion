import type { ReactNode } from 'react'

/**
 * A track and how far along it something is, at the eight pixel progress
 * height. Two shapes, and the second is the point: `progress` is `slider`
 * with the thumb taken off. One reports, the other takes a value.
 */
export const progressArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="64" x="48" y="76" />
    <rect className="artRule" height="8" rx="4" width="224" x="48" y="96" />
    <rect className="artSolid artMotion artFill" height="8" rx="4" width="136" x="48" y="96" />
  </>
)
