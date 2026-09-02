import type { CSSProperties, ReactNode } from 'react'

/**
 * A table with a sort mark on one heading and a pager under it, which is the
 * whole of the difference from `table`: the same grid, and it owns the result
 * rather than being handed the rows.
 */
export const dataTableArt: ReactNode = (
  <>
    {[56, 152, 232].map((x, index) => (
      <rect
        className="artInk"
        fillOpacity="0.55"
        height="8"
        key={x}
        rx="4"
        width={[40, 36, 28][index]}
        x={x}
        y="44"
      />
    ))}
    {/* The sort mark, on the first heading, pointing the way an ascending
        column does. Small enough to read as an affordance rather than as a
        fourth column. */}
    <path
      className="artStroke"
      d="M102 48L106 43L110 48"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.55"
      strokeWidth="1.5"
    />
    <rect className="artRule" height="1" width="224" x="48" y="60" />
    {[
      { widths: [48, 30, 22], y: 76 },
      { widths: [36, 34, 26], y: 100 },
      { widths: [44, 28, 20], y: 124 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        {[56, 152, 232].map((x, column) => (
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            key={x}
            rx="4"
            width={row.widths[column]}
            x={x}
            y={row.y}
          />
        ))}
      </g>
    ))}
    <rect className="artRule" height="1" width="224" x="48" y="144" />
    {/* The pager, which is what says this table owns its result: three pages
        and the first one taken. */}
    {[0, 1, 2].map((index) => (
      <rect
        className={index === 0 ? 'artSolid' : 'artInk'}
        fillOpacity={index === 0 ? undefined : 0.28}
        height="10"
        key={index}
        rx="3"
        width="10"
        x={56 + index * 16}
        y="158"
      />
    ))}
  </>
)
