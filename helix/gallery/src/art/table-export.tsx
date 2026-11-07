import type { ReactNode } from 'react'

/**
 * A panel of choices, one picked in each segmented row, over a solid button:
 * which rows, which columns, and the format a file is saved in.
 */
export const tableExportArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="116" rx="6" width="152" x="84" y="42" />
    {[0, 1, 2].map((row) => (
      <g key={row}>
        <rect
          className="artInk"
          fillOpacity="0.1"
          height="14"
          rx="4"
          width="128"
          x="96"
          y={54 + row * 24}
        />
        <rect
          className="artSolid"
          height="10"
          rx="3"
          width={row === 2 ? 30 : 62}
          x="98"
          y={56 + row * 24}
        />
      </g>
    ))}
    <rect className="artSolid" height="14" rx="4" width="56" x="168" y="132" />
    <rect className="artStrokeOnSolid" height="4" rx="2" width="32" x="180" y="137" />
  </>
)
