import type { CSSProperties, ReactNode } from 'react'

/**
 * Gallery art for the six families that draw a reading.
 *
 * **Split out of `content.tsx` because the taxonomy split first.** `content`
 * held 27 of the 88 families and meant none of the other seven, and its art
 * file was 1,136 lines for exactly that reason: a drawer in the catalog is a
 * drawer in the gallery. `charts` is a category now, so this is the file that
 * matches it.
 *
 * The system every drawing obeys is documented at the top of `core.tsx`, and
 * the vocabulary these inherit is the one `content.tsx` fixes: a bar is a line,
 * weight is emphasis, a rule is a filled rect rather than a stroke.
 *
 * **These are the drawings whose subject is a line**, which is why `artDraw`
 * lives on three of them: a chart that translates upward is a picture being
 * nudged, where a stroke written from its first point to its last is the one
 * gesture a series actually performs.
 */
export const chartsArt: Record<string, ReactNode> = {
  'bar-chart': (
    <>
      <rect className="artInk" fillOpacity="0.55" height="32" rx="2" width="28" x="64" y="112" />
      <rect className="artInk" fillOpacity="0.28" height="16" rx="2" width="28" x="108" y="128" />
      <rect className="artInk" fillOpacity="0.55" height="56" rx="2" width="28" x="152" y="88" />
      <rect className="artInk" fillOpacity="0.28" height="40" rx="2" width="28" x="196" y="104" />
      <rect className="artRule" height="1" width="224" x="48" y="144" />
    </>
  ),

  'donut-chart': (
    <>
      <circle
        className="artStroke"
        cx="160"
        cy="112"
        fill="none"
        r="44"
        strokeDasharray="97 179"
        strokeOpacity="0.55"
        strokeWidth="14"
        transform="rotate(-90 160 112)"
      />
      <circle
        className="artStroke"
        cx="160"
        cy="112"
        fill="none"
        r="44"
        strokeDasharray="83 193"
        strokeDashoffset="-97"
        strokeOpacity="0.28"
        strokeWidth="14"
        transform="rotate(-90 160 112)"
      />
      <circle
        className="artStroke"
        cx="160"
        cy="112"
        fill="none"
        r="44"
        strokeDasharray="56 220"
        strokeDashoffset="-180"
        strokeOpacity="0.16"
        strokeWidth="14"
        transform="rotate(-90 160 112)"
      />
    </>
  ),

  /**
   * Nothing here, and what to do about it. The space is the subject, which is
   * why there is no plane: an empty state drawn inside a box is a box.
   */
  legend: (
    <>
      <rect className="artInk" fillOpacity="0.55" height="12" rx="4" width="12" x="100" y="62" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="88" x="120" y="64" />

      <rect className="artInk" fillOpacity="0.28" height="12" rx="4" width="12" x="100" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="104" x="120" y="98" />

      <rect className="artInk" fillOpacity="0.12" height="12" rx="4" width="12" x="100" y="130" />
      <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="72" x="120" y="132" />
    </>
  ),

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
  'line-chart': (
    <>
      {/* Both series plot themselves, back one first, and the baseline holds.
       *
       * The leading line used to lift on a pointer, which is the whole chart
       * translating upward: a reading does not move, and a chart that slides is
       * a picture being nudged rather than a series being drawn. `artDraw`
       * writes each path from its first point to its last, which is the one
       * gesture a line chart actually performs.
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
  ),

  sparkline: (
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
       * The line used to hold still while the dot pressed, on the argument that
       * a sparkline is one line and swelling it swells the only thing on the
       * card. That is an argument against a swell, not against motion: `artDraw`
       * moves the line's *end* rather than its size, which is the one thing a
       * series does.
       *
       * `artMark` on the dot rather than `artOn`, for the fade. The dot marks
       * where the series ended, so it cannot sit out in the field at full
       * strength while the line that ended there has withdrawn. Both are lowest
       * around a third of the way in and both come back together. */}
      <circle className="artSolid artMotion artMark" cx="240" cy="72" r="5" />
    </>
  ),

  trend: (
    <>
      {/* One reading rather than two. Two of them said "here are two trends";
          the component says which way a number went, and an arrow that turns
          says that. */}
      {/* One path, head and shaft together, because two shapes left a notch
       *
       * The head was a chevron whose inner apex sat at y 63 and the shaft was a
       * rect starting at y 64, so along the shaft's own two units the head fell
       * away to a point one unit above where the shaft began: a triangular gap
       * at the top of the arrow, widest exactly on its center line. Meeting them
       * by dropping the apex would put the inner edges off 45 degrees against
       * outer edges that are on it, and overlapping them would darken the
       * overlap, both shapes being ink at the same alpha.
       *
       * The outline is the union of the two and is otherwise the same arrow.
       * Everything a reader could measure is unchanged: the apex at 58,60, the
       * 45 degree edges, the 2 unit shaft, and the foot still ends in the same
       * semicircle, which is now an arc of radius 1 rather than the rect's `rx`.
       * Only the top of the shaft had to change, and it had to change into the
       * head. */}
      <g className="artMotion artTurn">
        <path
          className="artInk"
          d="M58 60l7.5 7.5L64 69l-5-5v13a1 1 0 0 1-2 0V64l-5 5-1.5-1.5z"
          fillOpacity="0.55"
        />
      </g>
      <rect className="artInk" fillOpacity="0.55" height="12" rx="6" width="64" x="76" y="64" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="88" x="76" y="84" />
    </>
  ),
}
