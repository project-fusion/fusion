import type { CSSProperties, ReactNode } from 'react'

/**
 * Boxes with real air between them, which is the whole silhouette.
 *
 * Four rather than six, because the card is 320 wide and six at the control
 * step would leave no margin either side. What has to survive at thumbnail
 * size is "separate boxes", not the count.
 *
 * Two are filled and two are not, so the row reads as a code part way in
 * rather than as four empty fields, and the third carries the focus edge: a
 * pin's ring is on the box the reader is in and never around the row, which is
 * the one thing its stylesheet is most careful about.
 *
 * **The ring moves to the next box on hover**, which is what a pin actually
 * does: a character lands and the focus steps along. Growing the character
 * instead takes `--art-grow: 1`, which is `scaleX(1)` and is nothing at all,
 * and a still card looks correct either way.
 *
 * The four sides of the ring travel as a group, so they arrive together.
 */
export const pinInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="60" />
    {[48, 100, 152, 204].map((x) => (
      <rect className="artSunken" height="40" key={x} rx="4" width="40" x={x} y="80" />
    ))}
    {[48, 100, 204].map((x) => (
      <rect className="artEdge" height="39" key={x} rx="4" width="39" x={x + 0.5} y="80.5" />
    ))}
    {/* The two already entered. A bar rather than a glyph, at the width a
        single character takes in the vocabulary the rest of the gallery uses. */}
    <rect className="artInk" fillOpacity="0.55" height="12" rx="2" width="8" x="64" y="94" />
    <rect className="artInk" fillOpacity="0.55" height="12" rx="2" width="8" x="116" y="94" />
    {/* The box the reader is in, ringed rather than filled, and stepping to the
        next one on hover. 52 is the pitch: a 40 box and a 12 gap. */}
    <g className="artSolid artMotion artTravel" style={{ '--art-to': '52px' } as CSSProperties}>
      <rect height="40" rx="4" width="2" x="152" y="80" />
      <rect height="40" rx="4" width="2" x="190" y="80" />
      <rect height="2" rx="1" width="40" x="152" y="80" />
      <rect height="2" rx="1" width="40" x="152" y="118" />
    </g>
  </>
)
