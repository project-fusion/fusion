import type { CSSProperties, ReactNode } from 'react'

/**
 * A frame with a bar across the bottom of it, which is the whole of what this
 * component replaces: the picture is the platform's and the controls are
 * ours. So the card draws the bar, and leaves the picture as a field.
 *
 * The played part of the scrubber grows on hover. It is the one thing on the
 * card that is about time passing, and a still card of a video player says
 * nothing that a still card of a card does not.
 */
export const videoArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.12" height="128" rx="4" width="208" x="56" y="36" />
    <path className="artInk" d="M148 84l24 14-24 14z" fillOpacity="0.4" />
    <rect className="artInk" fillOpacity="0.28" height="28" rx="0" width="208" x="56" y="136" />
    <path className="artInk" d="M72 146l8 5-8 5z" fillOpacity="0.55" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="136" x="90" y="149" />
    <rect
      className="artSolid artMotion artFill"
      height="4"
      rx="2"
      style={{ '--art-grow': 3 } as CSSProperties}
      width="36"
      x="90"
      y="149"
    />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="1" width="8" x="238" y="147" />
  </>
)
