import type { CSSProperties, ReactNode } from 'react'

/**
 * Square where the rule is, rounded everywhere else.
 *
 * `callout-root.css` sets `border-inline-start` thick and then zeroes both
 * start corners, so the rule meets a flat edge rather than curving away from
 * it. That asymmetry is the silhouette, and it is why this is a path.
 */
export const calloutArt: ReactNode = (
  <>
    {/* A real surface rather than ink at some alpha below the ladder. The
        panel is a plane, and a plane large enough to sit text on wants a
        token, not a percentage picked to keep a big area from going heavy. */}
    <path className="artSunken" d="M48 64h204a4 4 0 0 1 4 4v64a4 4 0 0 1-4 4H48z" />
    <rect className="artInk" fillOpacity="0.55" height="72" width="2" x="48" y="64" />
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="20" rx="4" width="20" x="64" y="78" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="120" x="96" y="82" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="96" x="96" y="106" />
    </g>
  </>
)
