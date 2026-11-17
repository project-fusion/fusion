import type { ReactNode } from 'react'

/**
 * A band of pills running out of one edge and in at the other, faded where it
 * meets them, which is the whole of the component: a row going round.
 */
export const marqueeArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.1" height="24" rx="12" width="48" x="28" y="88" />
    <rect className="artInk" fillOpacity="0.22" height="24" rx="12" width="64" x="84" y="88" />
    <rect className="artInk" fillOpacity="0.22" height="24" rx="12" width="56" x="156" y="88" />
    <rect className="artInk" fillOpacity="0.22" height="24" rx="12" width="60" x="220" y="88" />
    <rect className="artInk" fillOpacity="0.1" height="24" rx="12" width="20" x="288" y="88" />
  </>
)
