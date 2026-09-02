import type { ReactNode } from 'react'

/**
 * Set inline and carried by weight. The run wraps across two lines, which is
 * what stops it reading as a highlighted phrase: a quotation is part of the
 * sentence it sits in.
 */
export const quoteArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="88" x="48" y="68" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="112" x="144" y="68" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="72" x="48" y="90" />
    <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="128" x="128" y="90" />
    <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="140" x="48" y="112" />
  </>
)
