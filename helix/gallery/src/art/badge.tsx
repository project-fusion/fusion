import type { ReactNode } from 'react'

/**
 * A 16 pixel mark pinned at 45 degrees, held off by a ring of the page.
 *
 * The thing it is pinned to is 56 across, not 80. At 80 it is the largest
 * object in the gallery and the drawing reads as "a big circle, with a dot",
 * which is the wrong subject: the mark is the component and the target is
 * only there to be marked. Smaller also keeps it clear of Avatar, the other
 * card in the set that is a plain circle.
 */
export const badgeArt: ReactNode = (
  <>
    <circle className="artSunken" cx="160" cy="100" r="28" />
    <circle className="artPage" cx="180" cy="80" r="12" />
    {/* The mark presses rather than fading up: `artMark` runs from full size
        back to full size, so it says "this one" without ever saying "this
        just arrived", which is a claim a badge must not make. */}
    <circle className="artSolid artMotion artMark" cx="180" cy="80" r="8" />
  </>
)
