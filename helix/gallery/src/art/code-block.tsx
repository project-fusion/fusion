import type { ReactNode } from 'react'

/**
 * Bars rather than glyphs. A block of code drawn as real glyphs would be
 * unreadable at this size and would be a different language per card.
 */
export const codeBlockArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="72" rx="5" width="112" x="104" y="64" />
    <path className="artEdge" d="M104 84h112" />
    <g className="artMotion artLift">
      <rect className="artSolid" height="3" rx="1.5" width="30" x="118" y="98" />
      <rect className="artInk" height="3" rx="1.5" width="52" x="118" y="110" />
      <rect className="artInk" height="3" rx="1.5" width="38" x="118" y="122" />
    </g>
    <circle className="artOn artInk" cx="204" cy="74" r="3" />
  </>
)
