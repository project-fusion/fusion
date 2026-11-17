import type { ReactNode } from 'react'

/**
 * A thin bar along the top of a page of lines, filled two fifths of the way,
 * which is the whole of the component: how far through the page the reader
 * has scrolled.
 */
export const scrollProgressArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.14" height="4" rx="2" width="216" x="52" y="48" />
    <rect className="artSolid" height="4" rx="2" width="88" x="52" y="48" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="196" x="52" y="76" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="176" x="52" y="96" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="200" x="52" y="116" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="140" x="52" y="136" />
  </>
)
