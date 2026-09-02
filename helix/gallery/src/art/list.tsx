import type { CSSProperties, ReactNode } from 'react'

export const listArt: ReactNode = (
  <>
    {[
      { w: 140, y: 64 },
      { w: 104, y: 100 },
      { w: 164, y: 136 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="8"
          rx="4"
          width={row.w}
          x="56"
          y={row.y}
        />
        {index < 2 && <rect className="artRule" height="1" width="224" x="48" y={row.y + 20} />}
      </g>
    ))}
  </>
)
