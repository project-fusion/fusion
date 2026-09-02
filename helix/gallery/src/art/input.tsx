import type { CSSProperties, ReactNode } from 'react'

export const inputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="56" x="48" y="52" />
    <rect className="artSunken" height="40" rx="4" width="224" x="48" y="72" />
    <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="72.5" />
    {/* The value grows with the caret rather than the caret leaving it behind.
        `--art-grow` is 22 units over the bar's own 88, which is the same 22
        the caret travels, so the gap between the last character and the caret
        holds for the whole run. */}
    <rect
      className="artInk artMotion artFill"
      fillOpacity="0.55"
      height="8"
      rx="4"
      style={{ '--art-grow': 1.25 } as CSSProperties}
      width="88"
      x="64"
      y="88"
    />
    <rect
      className="artSolid artMotion artTravel"
      height="20"
      style={{ '--art-to': '22px' } as CSSProperties}
      width="2"
      x="160"
      y="82"
    />
  </>
)
