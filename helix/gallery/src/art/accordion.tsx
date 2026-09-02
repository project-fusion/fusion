import type { CSSProperties, ReactNode } from 'react'

/**
 * Items flush against each other, one hairline between neighbors, and a
 * disclosure indicator on every header.
 *
 * The indicators are what separates this from `list`, which is otherwise the
 * same vocabulary and the same construction. What makes an accordion an
 * accordion is that each row says whether it is open, so the chevrons are the
 * subject here rather than decoration: two point right, the open one points
 * down.
 *
 * The panel settles open from the header rather than sliding in from the
 * side, an accordion's entire motion being vertical.
 */
export const accordionArt: ReactNode = (
  <>
    <rect className="artRule" height="1" width="224" x="48" y="30" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="64" y="44" />
    <path className="artInk" d="M249 43l5 5-5 5 1.5 1.5 6.5-6.5-6.5-6.5z" fillOpacity="0.28" />

    <rect className="artRule" height="1" width="224" x="48" y="62" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="104" x="64" y="76" />
    <path className="artInk" d="M246.5 77.5l5.5 5.5 5.5-5.5-1.5-1.5-4 4-4-4z" fillOpacity="0.55" />
    <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="176" x="64" y="100" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="132" x="64" y="116" />
    </g>

    <rect className="artRule" height="1" width="224" x="48" y="138" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="64" y="152" />
    <path className="artInk" d="M249 151l5 5-5 5 1.5 1.5 6.5-6.5-6.5-6.5z" fillOpacity="0.28" />

    <rect className="artRule" height="1" width="224" x="48" y="170" />
  </>
)
