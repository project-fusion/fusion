import type { CSSProperties, ReactNode } from 'react'

/**
 * The path to here, ending on where you are. Chevrons, never filled carets.
 *
 * Staggered along the path rather than still, because the order is the
 * content: a trail is read from the root outward, and `artRow` run left to
 * right says that without needing a second archetype.
 */
export const breadcrumbsArt: ReactNode = (
  <>
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="76" y="96" />
      <path className="artInk" d="M126 96l4 4-4 4 1.5 1.5 5.5-5.5-5.5-5.5z" fillOpacity="0.28" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="48" x="142" y="96" />
      <path className="artInk" d="M198 96l4 4-4 4 1.5 1.5 5.5-5.5-5.5-5.5z" fillOpacity="0.28" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="30" x="214" y="96" />
    </g>
  </>
)
