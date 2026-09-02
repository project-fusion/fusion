import type { ReactNode } from 'react'

/**
 * Two marks in one place, which is the component.
 *
 * The clipboard is the resting state and the check is the confirmation, and
 * they sit on the same center because that is exactly how the element renders
 * them: one grid cell, one hidden. Drawn side by side the picture would
 * promise a button that grows on a press, which is the thing the stylesheet
 * exists to prevent.
 */
export const copyButtonArt: ReactNode = (
  <>
    {/* The button holds the center and everything it holds is inside it: 140
        to 180 is the card's own middle, and both marks sit on 160,100.
        Balancing the pair's bounding box instead centers the ink and reads
        left-heavy, the clipboard being the object and the tick a mark beside
        it, and it leaves the tick past the button's own right edge, which is
        a control with a check floating outside it. */}
    <rect className="artEdge" fill="none" height="40" rx="5" width="40" x="140" y="80" />
    <rect className="artEdge" fill="none" height="20" rx="3" width="16" x="152" y="90" />
    <path className="artStroke" d="M154 88h12" strokeLinecap="round" strokeWidth="2" />
    {/* Only the tick moves, and it moves visibly. `artOn` scales to 0.94 once,
        which on a two-unit stroke is nothing anybody sees; `artMark` is the
        gesture for a mark, at 0.72 with a fade under it. */}
    <path
      className="artStroke artMotion artMark"
      d="M153 99.5l5 5 9-9"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </>
)
