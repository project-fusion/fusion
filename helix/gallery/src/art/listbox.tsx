import type { CSSProperties, ReactNode } from 'react'

export const listboxArt: ReactNode = (
  <>
    {[
      { on: true, w: 104, y: 44 },
      { on: false, w: 80, y: 80 },
      { on: true, w: 120, y: 116 },
      { on: false, w: 88, y: 152 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        {row.on && <rect className="artRaised" height="28" rx="4" width="208" x="56" y={row.y} />}
        <rect
          className="artInk"
          fillOpacity={row.on ? 0.55 : 0.28}
          height="8"
          rx="4"
          width={row.w}
          x="72"
          y={row.y + 10}
        />
      </g>
    ))}
  </>
)
