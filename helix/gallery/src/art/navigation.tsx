import type { CSSProperties, ReactNode } from 'react'

export const navigationArt: ReactNode = (
  <>
    {[
      { on: false, w: 40, x: 56 },
      { on: true, w: 48, x: 112 },
      { on: false, w: 36, x: 176 },
      { on: false, w: 44, x: 228 },
    ].map((label) => (
      <rect
        className="artInk"
        fillOpacity={label.on ? 0.55 : 0.28}
        height="8"
        key={label.x}
        rx="4"
        width={label.w}
        x={label.x}
        y="96"
      />
    ))}
    <rect
      className="artSolid artMotion artTravel"
      height="2"
      style={{ '--art-to': '64px' } as CSSProperties}
      width="48"
      x="112"
      y="116"
    />
  </>
)
