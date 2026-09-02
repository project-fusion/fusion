import type { CSSProperties, ReactNode } from 'react'

/**
 * The one component whose picture is the component. A code is a square of
 * squares, so the card draws a fragment of one: three finders at the corners
 * and a scatter between them, at the scale a real code would sit at rather
 * than as a decorative grid.
 *
 * Not a scannable code, and deliberately not. A card is 320 wide at full
 * size and a quarter of that in a gallery, where a real code would be too
 * small to read and would invite a reader to try.
 */
export const qrCodeArt: ReactNode = (
  <>
    <g className="artMotion artOpen">
      <rect className="artRaised" height="128" rx="4" width="128" x="96" y="36" />
      {(
        [
          [112, 52],
          [176, 52],
          [112, 116],
        ] as const
      ).map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect className="artInk" fillOpacity="0.55" height="32" rx="2" width="32" x={x} y={y} />
          <rect className="artRaised" height="20" rx="1" width="20" x={x + 6} y={y + 6} />
          <rect
            className="artInk"
            fillOpacity="0.55"
            height="12"
            rx="1"
            width="12"
            x={x + 10}
            y={y + 10}
          />
        </g>
      ))}
      {(
        [
          [152, 92],
          [164, 92],
          [152, 104],
          [176, 104],
          [188, 92],
          [152, 128],
          [164, 140],
          [188, 128],
          [176, 140],
          [188, 152],
        ] as const
      ).map(([x, y], index) => (
        <rect
          className="artInk artMotion artRow"
          fillOpacity="0.28"
          height="8"
          key={`${x}-${y}`}
          rx="1"
          style={{ '--art-i': index % 3 } as CSSProperties}
          width="8"
          x={x}
          y={y}
        />
      ))}
    </g>
  </>
)
