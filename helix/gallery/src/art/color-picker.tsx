import type { CSSProperties, ReactNode } from 'react'

/**
 * The square, and the ramp under it.
 *
 * Tonal rather than colored, like every card here. A hue ramp is the one
 * thing this component has that a picture could show literally, and showing it
 * would make this the only card in the gallery painted in something other than
 * the ink: the row would read as one card lit up and the rest switched off.
 * The square's gradient carries the idea on its own.
 */
export const colorPickerArt: ReactNode = (
  <>
    {/* Light at the top left, dark along the bottom, which is the shape of a
        saturation and brightness square whatever color it is drawn in. */}
    <rect className="artSunken" height="96" rx="4" width="224" x="48" y="48" />
    <rect className="artInk" fillOpacity="0.28" height="96" rx="4" width="224" x="48" y="48" />
    <rect className="artEdge" height="95" rx="4" width="223" x="48.5" y="48.5" />
    {/* The handle, moving across the square rather than growing on it: a
        picker's mark travels, and `artFill` would have drawn it swelling in
        place, which is what a loading state looks like. */}
    <g className="artMotion artTravel" style={{ '--art-to': '48px' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <circle className="artOverlay" cx="132" cy="80" r="9" />
      </g>
    </g>
    {/* The ramp, and the chip beside it that says what was chosen. */}
    <rect className="artSolid" height="20" rx="4" width="20" x="48" y="160" />
    <rect className="artRule" height="8" rx="4" width="188" x="84" y="166" />
    <g filter="url(#helixArtShadow)">
      <circle className="artOverlay" cx="200" cy="170" r="8" />
    </g>
  </>
)
