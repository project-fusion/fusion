import type { ReactNode } from 'react'

export const gridArt: ReactNode = (
  <g className="artSunken">
    {[28, 80, 132].map((y) =>
      [48, 128, 208].map((x) => (
        <rect height="40" key={`${x}-${y}`} rx="4" width="64" x={x} y={y} />
      )),
    )}
  </g>
)
