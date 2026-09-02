import type { ReactNode } from 'react'

/**
 * One card, and what a card holds: media, a heading, a line about it, and
 * something to do.
 *
 * Not two overlapping surfaces: that drawing is Drilldown's, and "a stack"
 * describes Drilldown far better than it describes Card. Card's own claim is
 * what it *contains*, so that is what it shows.
 *
 * Everything sits on one 16 unit inset: the media runs full bleed to the
 * card's own edge, and the heading, the line and the action all start at 72
 * and end 16 above the bottom.
 */
export const cardArt: ReactNode = (
  <>
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSurface" height="160" rx="4" width="208" x="56" y="20" />
      </g>
      <rect className="artSurface" height="160" rx="4" width="208" x="56" y="20" />
      <rect className="artSunken" height="64" width="208" x="56" y="20" />
      <rect className="artEdge" height="159" rx="4" width="207" x="56.5" y="20.5" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="112" x="72" y="100" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="160" x="72" y="122" />
      <rect className="artSolid" height="24" rx="4" width="56" x="72" y="140" />
    </g>
  </>
)
