import type { CSSProperties, ReactNode } from 'react'

/**
 * A column of times with one of them taken.
 *
 * Rows rather than a clock face. A clock is what the component is *about* and
 * not what it looks like, and the rule this gallery keeps is that a card draws
 * the shape a reader will meet: a node graph is not a Tree, and a dial is not a
 * list of quarter hours.
 */
export const timePickerArt: ReactNode = (
  <>
    <rect className="artSunken" height="140" rx="4" width="180" x="70" y="42" />
    {[0, 1, 2, 3].map((row) => (
      <rect
        className="artInk"
        fillOpacity="0.28"
        height="8"
        key={row}
        rx="4"
        width="52"
        x="86"
        y={62 + row * 32}
      />
    ))}
    {/* The one that is taken, and it travels: a list is scrolled past and
        landed on, which is a move rather than a swell. Thirty two is the row
        pitch, so it lands on a row rather than between two. */}
    <g className="artMotion artTravel" style={{ '--art-to': '32px' } as CSSProperties}>
      <rect className="artSolid" height="20" rx="4" width="148" x="86" y="86" />
    </g>
  </>
)
