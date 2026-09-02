import type { CSSProperties, ReactNode } from 'react'

export const megamenuArt: ReactNode = (
  <>
    {/* A nav row with one section open, and the panel it drops: columns of
        destinations rather than a single list, which is the whole idea. */}
    {[
      { on: false, w: 40, x: 40 },
      { on: true, w: 48, x: 96 },
      { on: false, w: 36, x: 160 },
    ].map((label) => (
      <rect
        className="artInk"
        fillOpacity={label.on ? 0.55 : 0.28}
        height="8"
        key={label.x}
        rx="4"
        width={label.w}
        x={label.x}
        y="40"
      />
    ))}
    <rect className="artInk" fillOpacity="0.12" height="96" rx="6" width="216" x="60" y="64" />
    {[0, 1, 2].map((column) => (
      <g key={column}>
        <rect
          className="artInk"
          fillOpacity="0.4"
          height="6"
          rx="3"
          width="32"
          x={76 + column * 64}
          y="80"
        />
        {[0, 1, 2].map((row) => (
          <rect
            className="artInk"
            fillOpacity="0.24"
            height="5"
            key={row}
            rx="2.5"
            width={44 - row * 6}
            x={76 + column * 64}
            y={98 + row * 14}
          />
        ))}
      </g>
    ))}
    <rect
      className="artSolid artMotion artFill"
      height="8"
      rx="4"
      style={{ '--art-grow': 3 } as CSSProperties}
      width="48"
      x="96"
      y="40"
    />
  </>
)
