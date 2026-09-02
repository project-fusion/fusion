import type { CSSProperties, ReactNode } from 'react'

/**
 * Three columns that line up across every row, which is both the difference
 * from `list` and literally what the component is: a grid, where every column
 * lines up while each row stays a real element.
 */
export const tableArt: ReactNode = (
  <>
    {[56, 144, 224].map((x, index) => (
      <rect
        className="artInk"
        fillOpacity="0.55"
        height="8"
        key={x}
        rx="4"
        width={[44, 40, 36][index]}
        x={x}
        y="52"
      />
    ))}
    <rect className="artRule" height="1" width="224" x="48" y="72" />
    {[
      { widths: [52, 32, 28], y: 92 },
      { widths: [40, 36, 24], y: 124 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        {[56, 144, 224].map((x, column) => (
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
  </>
)
