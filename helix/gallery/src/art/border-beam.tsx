import type { ReactNode } from 'react'

/**
 * A card with a short bright run on its top edge, falling off both ways: a
 * light on its way round the border of something at work.
 *
 * **Contours, not a gradient**, for the reason Aura's drawing gives: the run
 * is drawn in the three ink steps, brightest at its center, so it reads as
 * light and the ink stays countable.
 */
export const borderBeamArt: ReactNode = (
  <>
    <g filter="url(#helixArtShadow)">
      <rect className="artOverlay" height="96" rx="8" width="160" x="80" y="52" />
    </g>
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="72" x="96" y="72" />
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="120" x="96" y="92" />
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="96" x="96" y="106" />
    <rect className="artInk" fillOpacity="0.12" height="2" width="96" x="128" y="51" />
    <rect className="artInk" fillOpacity="0.28" height="2" width="56" x="148" y="51" />
    <rect className="artInk" fillOpacity="0.55" height="2" width="24" x="164" y="51" />
  </>
)
