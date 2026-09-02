import type { ReactNode } from 'react'

/**
 * One measurement at `text-3xl`, and the `text-xs` word for what it measures.
 * The pair behind a rule is the group, which is what stops one bar over
 * another from reading as `text`.
 */
export const statArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="56" x="48" y="76" />
    <rect className="artInk" fillOpacity="0.55" height="24" rx="4" width="104" x="48" y="92" />
    <rect className="artRule" height="48" width="1" x="184" y="72" />
    <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="44" x="216" y="76" />
    <rect className="artInk" fillOpacity="0.28" height="24" rx="4" width="64" x="216" y="92" />
  </>
)
