import type { CSSProperties, ReactNode } from 'react'

/**
 * A document arriving a line at a time: a heading, a paragraph, a list, and a
 * code block, each row in on hover after the one above it, which is what a
 * streamed reply does and what nothing above a new row does is move.
 */
export const markdownArt: ReactNode = (
  <>
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <rect className="artSolid" height="8" rx="4" width="88" x="64" y="48" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="192" x="64" y="70" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="148" x="64" y="82" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 3 } as CSSProperties}>
      <circle className="artInk" cx="68" cy="103" fillOpacity="0.55" r="3" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="120" x="80" y="100" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 4 } as CSSProperties}>
      <circle className="artInk" cx="68" cy="115" fillOpacity="0.55" r="3" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="96" x="80" y="112" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 5 } as CSSProperties}>
      <rect className="artSunken" height="32" rx="4" width="192" x="64" y="128" />
      <rect className="artInk" fillOpacity="0.55" height="3" rx="1.5" width="64" x="76" y="139" />
      <rect className="artInk" fillOpacity="0.28" height="3" rx="1.5" width="104" x="76" y="147" />
    </g>
  </>
)
