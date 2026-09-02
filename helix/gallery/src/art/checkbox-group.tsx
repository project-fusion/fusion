import type { ReactNode } from 'react'

export const checkboxGroupArt: ReactNode = (
  <>
    {[
      { on: true, w: 96, y: 62 },
      { on: false, w: 72, y: 94 },
      { on: true, w: 84, y: 126 },
    ].map((row) => (
      <g key={row.y}>
        <rect className="artSunken" height="20" rx="4" width="20" x="104" y={row.y} />
        {row.on && (
          <rect
            className="artSolid artMotion artOn"
            height="20"
            rx="4"
            width="20"
            x="104"
            y={row.y}
          />
        )}
        {!row.on && (
          <rect className="artEdge" height="19" rx="4" width="19" x="104.5" y={row.y + 0.5} />
        )}
        {row.on && (
          <path
            className="artOnSolid artMotion artMark"
            d={`M108 ${row.y + 10}l3.5 3.5 7-7.5 1.4 1.4-8.4 8.9-4.9-4.9z`}
          />
        )}
        {/* 0.55, matching Checkbox and Radio. A control's label is a
            control's label whether there is one of them or three, and nothing
            about being in a group makes a label secondary. */}
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="8"
          rx="4"
          width={row.w}
          x="136"
          y={row.y + 6}
        />
      </g>
    ))}
  </>
)
