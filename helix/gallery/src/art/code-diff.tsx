import type { CSSProperties, ReactNode } from 'react'

/**
 * A block of code with one line taken out and two put in.
 *
 * **Monotone, so the change is carried by weight and mark, as the component
 * carries it for a reader who cannot tell the washes apart.** The removed line
 * sits on a sunken band and the added lines on a raised one, and each opens with
 * its mark: a short dash for the removal, a dash crossed for each addition. The
 * gutter's numbers are the faint ticks down the left.
 *
 * The two additions arrive in order, since they are the news; the line they
 * replaced stays where it was.
 */
export const codeDiffArt: ReactNode = (
  <>
    <rect className="artSurface" height="120" rx="8" width="232" x="44" y="40" />
    <rect className="artEdge" height="119" rx="8" width="231" x="44.5" y="40.5" />
    {[56, 76, 96, 116, 136].map((y) => (
      <rect
        className="artInk"
        fillOpacity="0.12"
        height="6"
        key={y}
        rx="3"
        width="12"
        x="56"
        y={y + 1}
      />
    ))}
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="96" x="92" y="56" />
    <rect className="artSunken" height="20" width="230" x="45" y="70" />
    <rect className="artInk" fillOpacity="0.55" height="2" rx="1" width="8" x="76" y="79" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="112" x="92" y="76" />
    {[
      { width: 128, y: 96 },
      { width: 88, y: 116 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        <rect className="artRaised" height="20" width="230" x="45" y={row.y - 6} />
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="2"
          rx="1"
          width="8"
          x="76"
          y={row.y + 3}
        />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="1" width="2" x="79" y={row.y} />
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="8"
          rx="4"
          width={row.width}
          x="92"
          y={row.y}
        />
      </g>
    ))}
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="92" y="136" />
  </>
)
