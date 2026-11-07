import type { CSSProperties, ReactNode } from 'react'

/**
 * A panel of column names, each behind a grip and a box, with the first
 * pinned and the last unticked: a table's columns as a list to arrange.
 */
export const columnManagerArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="112" rx="6" width="152" x="84" y="44" />
    {[0, 1, 2, 3, 4].map((row) => (
      <g className="artMotion artRow" key={row} style={{ '--art-i': row } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="8"
          rx="1"
          width="4"
          x="96"
          y={58 + row * 20}
        />
        <rect
          className={row === 4 ? 'artEdge' : 'artSolid'}
          fill={row === 4 ? 'none' : undefined}
          height="9"
          rx="2"
          width="9"
          x="106"
          y={57.5 + row * 20}
        />
        <rect
          className="artInk"
          fillOpacity={row === 4 ? '0.22' : '0.45'}
          height="4"
          rx="2"
          width={[46, 58, 38, 50, 34][row]}
          x="124"
          y={60 + row * 20}
        />
        <circle
          className={row === 0 ? 'artSolid' : 'artInk'}
          cx="220"
          cy={62 + row * 20}
          fillOpacity={row === 0 ? undefined : '0.22'}
          r="3"
        />
      </g>
    ))}
  </>
)
