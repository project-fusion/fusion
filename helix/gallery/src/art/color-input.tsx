import type { CSSProperties, ReactNode } from 'react'

/**
 * A field with a chip of the color at its trailing end, and the three tracks
 * it opens below.
 *
 * Tonal rather than colored, like every card here. A hue ramp is the one
 * thing this component has that a picture could show literally, and showing it
 * would make this the only card on the page painted in something other than
 * the ink: the row would read as one card lit up and the rest switched off.
 * Three tracks with their handles at three different places says "channels"
 * without borrowing the attention.
 */
export const colorInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="40" />
    <rect className="artSunken" height="40" rx="4" width="224" x="48" y="60" />
    <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="60.5" />
    {/* The hex, drawn as one run rather than as seven marks: it is a single
        code, and a field showing a word here would be the wrong picture. */}
    <rect className="artInk" fillOpacity="0.4" height="8" rx="4" width="64" x="64" y="76" />
    {/* The chip. `artSolid`, because it is the one mark on this card standing
        for a color that was chosen rather than for furniture. */}
    <rect className="artSolid" height="14" rx="3" width="14" x="240" y="73" />
    {/* The panel: three tracks, each with its handle somewhere different, and
        the top one moving. The pitch is 26, which is what puts the three in
        the panel with the same gap above and below them. */}
    <rect className="artSunken" height="90" rx="4" width="224" x="48" y="112" />
    {[0, 1, 2].map((row) => (
      <rect className="artRule" height="4" key={row} rx="2" width="192" x="64" y={134 + row * 26} />
    ))}
    {[
      { at: 104, row: 1 },
      { at: 176, row: 2 },
    ].map(({ at, row }) => (
      <g filter="url(#helixArtShadow)" key={row}>
        <circle className="artOverlay" cx={at} cy={136 + row * 26} r="8" />
      </g>
    ))}
    {/* `artTravel` rather than `artFill`: a handle moves along its track,
        where a growing bar is what a progress reading looks like and not what
        a channel does. */}
    <g className="artMotion artTravel" style={{ '--art-to': '64px' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <circle className="artOverlay" cx="128" cy="136" r="8" />
      </g>
    </g>
  </>
)
