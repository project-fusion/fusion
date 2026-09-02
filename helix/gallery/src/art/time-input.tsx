import type { CSSProperties, ReactNode } from 'react'

/**
 * A field with a clock mark, and the column it opens.
 *
 * The same shape as Date Input's card, because they are the same control over
 * a different set: a reader who recognizes one should read the other without
 * being told.
 */
export const timeInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="40" />
    <rect className="artSunken" height="40" rx="4" width="224" x="48" y="60" />
    <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="60.5" />
    <rect className="artInk" fillOpacity="0.4" height="8" rx="4" width="56" x="64" y="76" />
    {/* The clock: a ring with two hands, at the size the calendar mark takes on
        its own card. */}
    <circle className="artEdge" cx="247" cy="80" fill="none" r="7" strokeWidth="1.5" />
    <rect className="artInk" fillOpacity="0.55" height="4" width="1" x="247" y="76" />
    <rect className="artInk" fillOpacity="0.55" height="1" width="4" x="247" y="79" />
    {/* The list, and the row that is landed on. */}
    <rect className="artSunken" height="72" rx="4" width="224" x="48" y="112" />
    {[0, 1, 2].map((row) => (
      <rect
        className="artInk"
        fillOpacity="0.28"
        height="8"
        key={row}
        rx="4"
        width="48"
        x="64"
        y={126 + row * 22}
      />
    ))}
    <g className="artMotion artTravel" style={{ '--art-to': '22px' } as CSSProperties}>
      <rect className="artSolid" height="16" rx="4" width="192" x="64" y="122" />
    </g>
  </>
)
