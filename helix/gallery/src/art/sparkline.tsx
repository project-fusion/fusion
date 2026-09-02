import type { ReactNode } from 'react'

export const sparklineArt: ReactNode = (
  <>
    <path
      className="artStroke artMotion artDraw"
      d="M80 120L107 96L133 132L160 100L187 112L213 88L240 72"
      pathLength="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.55"
      strokeWidth="2.5"
    />
    {/* The line writes itself and the terminus goes with it.
     *
     * A swell is wrong here, a sparkline being one line and swelling it
     * swelling the only thing on the card. That is an argument against a
     * swell rather than against motion: `artDraw` moves the line's *end*
     * rather than its size, which is the one thing a series does.
     *
     * `artMark` on the dot rather than `artOn`, for the fade. The dot marks
     * where the series ended, so it cannot sit out in the field at full
     * strength while the line that ended there has withdrawn. Both are lowest
     * around a third of the way in and both come back together. */}
    <circle className="artSolid artMotion artMark" cx="240" cy="72" r="5" />
  </>
)
