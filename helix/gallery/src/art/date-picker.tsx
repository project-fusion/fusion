import type { CSSProperties, ReactNode } from 'react'

/**
 * Seven columns, starting where the month starts, and one date taken.
 *
 * The offset first row is what separates this from `grid`, which is uniform
 * by definition. Rows arrive in order, because a month reads down.
 */
export const datePickerArt: ReactNode = (
  <>
    {[40, 72, 104, 136].map((y, row) => (
      <g className="artMotion artRow" key={y} style={{ '--art-i': row } as CSSProperties}>
        {[50, 82, 114, 146, 178, 210, 242].map((x, column) => {
          if ((row === 0 && column < 3) || (row === 3 && column > 4)) {
            return null
          }
          const selected = row === 1 && column === 3
          return (
            <rect
              className={selected ? 'artSolid' : 'artSunken'}
              height="28"
              key={x}
              rx="4"
              width="28"
              x={x}
              y={y}
            />
          )
        })}
      </g>
    ))}
  </>
)
