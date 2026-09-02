import type { CSSProperties, ReactNode } from 'react'

/**
 * A strip of cells at three weights, which is the whole reading: color *is*
 * the value here, so the card has to show a range of them rather than one.
 *
 * Fourteen of ninety, because ninety cells at this size is a texture rather than a
 * strip and the card is trying to say what the component is. The pattern is
 * deliberate rather than random: a run of full cells, two low ones together,
 * and a single low one, which is what an incident looks like and is why anybody
 * draws one of these.
 */
export const heatmapArt: ReactNode = (
  <>
    {[
      { opacity: 0.55, x: 48 },
      { opacity: 0.55, x: 65 },
      { opacity: 0.55, x: 82 },
      { opacity: 0.16, x: 99 },
      { opacity: 0.55, x: 116 },
      { opacity: 0.55, x: 133 },
      { opacity: 0.28, x: 150 },
      { opacity: 0.28, x: 167 },
      { opacity: 0.55, x: 184 },
      { opacity: 0.55, x: 201 },
      { opacity: 0.55, x: 218 },
      { opacity: 0.55, x: 235 },
      { opacity: 0.16, x: 252 },
      { opacity: 0.55, x: 269 },
    ].map((cell, index) => (
      <g
        className="artMotion artRow"
        key={cell.x}
        style={{ '--art-i': index % 4 } as CSSProperties}
      >
        <rect
          className="artInk"
          fillOpacity={cell.opacity}
          height="18"
          rx="3"
          width="14"
          x={cell.x}
          y="72"
        />
      </g>
    ))}
    {/* The footer's two ends, which is `meter`'s arrangement and what tells a
        reader the strip covers a range rather than being a set of buttons. */}
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="28" x="48" y="104" />
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="24" x="248" y="104" />
  </>
)
