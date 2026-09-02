import type { CSSProperties, ReactNode } from 'react'

/**
 * Two chips at the real 24 pixel tag height.
 *
 * Each is one color at two strengths, which is how Tag derives its own look:
 * the fill at 12%, the label at 55%. Both are the same color, because with
 * the palette monotone an accented chip and a neutral one are the same
 * drawing, and implying a distinction the picture cannot show is worse than
 * not implying one.
 *
 * Staggered, because a tag is almost never on its own: what the card is
 * showing is a set being applied, and a set arrives one at a time. Two is
 * already a set.
 */
export const tagArt: ReactNode = (
  <>
    {[80, 168].map((x, index) => (
      <g className="artMotion artRow" key={x} style={{ '--art-i': index } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="72" x={x} y="88" />
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="8"
          rx="4"
          width="36"
          x={x + 18}
          y="96"
        />
      </g>
    ))}
  </>
)
