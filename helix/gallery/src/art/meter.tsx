import type { CSSProperties, ReactNode } from 'react'

/**
 * The bar `Progress` draws, with the two marks that make it a meter.
 *
 * Same track at the same height, because the two stand beside each other in a
 * panel and the component is deliberately the same shape. The ticks are the
 * entire silhouette: without them this card is `progress` exactly, and a card
 * that has to be read rather than recognized has already failed at thumbnail
 * size.
 *
 * The bands are color in the component and cannot be here, since the gallery
 * is monotone throughout and says so at the top of `core.tsx`. The marks are
 * what the component draws for the same reason: a reading that only says
 * "poor" in red says nothing to a reader who cannot see red.
 *
 * It fills past the first mark on hover, which is a meter's one story: a
 * reading crossing into the next band.
 */
export const meterArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="52" x="48" y="76" />
    <rect className="artRule" height="8" rx="4" width="224" x="48" y="96" />
    <rect
      className="artSolid artMotion artFill"
      height="8"
      rx="4"
      style={{ '--art-grow': 1.5 } as CSSProperties}
      width="88"
      x="48"
      y="96"
    />
    {/* Two units wide against an eight tall track, which is what the component
        uses: any wider and a threshold near the end reads as part of the fill.
        Drawn in the page's own color, so they cut the fill rather than sit on
        it, which is how the component draws them too. */}
    <rect className="artPage" height="8" width="2" x="152" y="96" />
    <rect className="artPage" height="8" width="2" x="216" y="96" />
  </>
)
