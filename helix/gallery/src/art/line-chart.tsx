import type { CSSProperties, ReactNode } from 'react'

/**
 * Two lines over one baseline, which is what separates this card from the
 * sparkline's.
 *
 * A sparkline is one stroke and no ground; a line chart is several series on
 * one scale, so the card shows two that cross rather than two that run
 * parallel. Crossing is the fact a shared scale makes visible and two scales
 * would hide.
 *
 * Still, like the other charts. The readings do not move.
 */
export const lineChartArt: ReactNode = (
  <>
    {/* Both series plot themselves, back one first, and the baseline holds.
     *
     * Never a lift on the pointer, which translates the whole chart: a
     * reading does not move, and a chart that slides is a picture being
     * nudged rather than a series being drawn. `artDraw` writes each path
     * from its first point to its last, which is the one gesture a line
     * chart actually performs.
     *
     * Staggered so the emphasized series lands last. Drawn together they
     * cross in the same instant and the crossing is the fact this card exists
     * to show; one behind the other, the second one crosses something that is
     * already there. */}
    <path
      className="artStroke artMotion artDraw"
      d="M64 92L108 118L152 100L196 126L240 118"
      pathLength="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.28"
      strokeWidth="2.5"
      style={{ '--art-i': 0 } as CSSProperties}
    />
    <path
      className="artStroke artMotion artDraw"
      d="M64 128L108 104L152 116L196 76L240 88"
      pathLength="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.55"
      strokeWidth="2.5"
      style={{ '--art-i': 1 } as CSSProperties}
    />
    <rect className="artRule" height="1" width="224" x="48" y="144" />
  </>
)
