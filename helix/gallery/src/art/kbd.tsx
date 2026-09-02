import type { ReactNode } from 'react'

export const kbdArt: ReactNode = (
  <>
    {/* Both caps press together, because a chord is struck rather than typed.
        `artMark` carries no stagger, which is what makes it the right one. */}
    {[128, 168].map((x) => (
      <g className="artMotion artMark" key={x}>
        <rect className="artSunken" height="24" rx="4" width="24" x={x} y="88" />
        <rect className="artEdge" height="23" rx="4" width="23" x={x + 0.5} y="88.5" />
        <rect className="artRule" height="2" rx="1" width="22" x={x + 1} y="108" />
        <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="12" x={x + 6} y="97" />
      </g>
    ))}
  </>
)
