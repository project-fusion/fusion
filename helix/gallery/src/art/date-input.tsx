import type { CSSProperties, ReactNode } from 'react'

/**
 * A field with a calendar mark at its trailing end, and the grid it opens
 * below. Three rows of dots rather than a real month: at card scale the
 * shapes are all a reader can see anyway, and drawing seven columns of
 * numbers would be a picture of text.
 */
export const dateInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="40" />
    <rect className="artSunken" height="40" rx="4" width="224" x="48" y="60" />
    <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="60.5" />
    <rect className="artInk" fillOpacity="0.4" height="8" rx="4" width="72" x="64" y="76" />
    {/* The calendar mark: a box with a torn-off top and two rings. */}
    <rect className="artRule" height="14" width="14" x="240" y="73" />
    <rect className="artInk" fillOpacity="0.55" height="1" width="14" x="240" y="77" />
    <rect className="artInk" fillOpacity="0.55" height="4" width="1" x="244" y="70" />
    <rect className="artInk" fillOpacity="0.55" height="4" width="1" x="251" y="70" />
    {/* The panel, and the one date that is chosen. */}
    <rect className="artSunken" height="72" rx="4" width="224" x="48" y="112" />
    {[0, 1, 2].map((row) =>
      [0, 1, 2, 3, 4, 5, 6].map((column) => (
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="6"
          key={`${row}-${column}`}
          rx="3"
          width="6"
          x={62 + column * 28}
          y={128 + row * 20}
        />
      )),
    )}
    {/* The selection moves to the next day, so `artTravel` and not `artFill`:
        that one scales, so picking a date would grow the circle rather than
        put it somewhere else, and it pivots at `left center`, so the growth
        runs sideways off its own column. Twenty eight units is the column
        pitch, which is what makes the destination land on a day rather than
        between two. */}
    <circle
      className="artSolid artMotion artTravel"
      cx="121"
      cy="151"
      r="9"
      style={{ '--art-to': '28px' } as CSSProperties}
    />
  </>
)
