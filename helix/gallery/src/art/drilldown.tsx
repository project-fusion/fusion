import type { ReactNode } from 'react'

/**
 * A page, the one that came from it, and the way back.
 *
 * Two layers, not three. The idea is *the level you are on and the level
 * behind it*, and two is what that takes: a third only proves the stack can
 * keep going, which is a claim about the API rather than about the component.
 */
export const drilldownArt: ReactNode = (
  <>
    <rect className="artSurface" height="108" rx="4" width="176" x="56" y="36" />
    <rect className="artEdge" height="107" rx="4" width="175" x="56.5" y="36.5" />
    <g className="artMotion artOpen">
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="108" rx="4" width="176" x="88" y="56" />
      </g>
      <path className="artInk" d="M113 72.5l-5.5 5.5 5.5 5.5 1.5-1.5-4-4 4-4z" fillOpacity="0.55" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="128" y="74" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="128" x="104" y="104" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="96" x="104" y="122" />
    </g>
  </>
)
