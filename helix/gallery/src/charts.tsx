import type { CSSProperties, ReactNode } from 'react'

/**
 * Gallery art for the seven families in the `charts` category.
 *
 * A drawer in the catalog is a drawer in the gallery, so this file exists
 * because `charts` is a category.
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
   * A strip of cells at three weights, which is the whole reading: color *is*
   * the value here, so the card has to show a range of them rather than one.
   *
   * Fourteen of ninety, because ninety cells at this size is a texture rather than a
   * strip and the card is trying to say what the component is. The pattern is
   * deliberate rather than random: a run of full cells, two low ones together,
   * and a single low one, which is what an incident looks like and is why anybody
   * draws one of these.
   */
  heatmap: (
    <>
      {[
        { opacity: 0.55, x: 48 },
        { opacity: 0.55, x: 65 },
        { opacity: 0.55, x: 82 },
        { opacity: 0.16, x: 99 },
        { opacity: 0.55, x: 116 },
        { opacity: 0.55, x: 133 },
        { opacity: 0.28, x: 150 },
        { opacity: 0.28, x: 167 },
        { opacity: 0.55, x: 184 },
        { opacity: 0.55, x: 201 },
        { opacity: 0.55, x: 218 },
        { opacity: 0.55, x: 235 },
        { opacity: 0.16, x: 252 },
        { opacity: 0.55, x: 269 },
      ].map((cell, index) => (
        <g
          className="artMotion artRow"
          key={cell.x}
          style={{ '--art-i': index % 4 } as CSSProperties}
        >
          <rect
            className="artInk"
            fillOpacity={cell.opacity}
            height="18"
            rx="3"
            width="14"
            x={cell.x}
            y="72"
          />
        </g>
      ))}
      {/* The footer's two ends, which is `meter`'s arrangement and what tells a
          reader the strip covers a range rather than being a set of buttons. */}
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="28" x="48" y="104" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="24" x="248" y="104" />
    </>
  ),

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
  ),

  trend: (
    <>
      {/* One reading rather than two. Two of them say "here are two trends";
          the component says which way a number went, and an arrow that turns
          says that. */}
      {/* One path, head and shaft together, because two shapes leave a notch.
       *
       * A chevron head whose inner apex sits at y 63 over a shaft rect starting
       * at y 64 falls away, along the shaft's own two units, to a point one
       * unit above where the shaft begins: a triangular gap at the top of the
       * arrow, widest exactly on its center line. Meeting them by dropping the
       * apex puts the inner edges off 45 degrees against outer edges that are
       * on it, and overlapping them darkens the overlap, both shapes being ink
       * at the same alpha.
       *
       * So the outline is the union of the two: apex at 58,60, 45 degree edges,
       * a 2 unit shaft, and a foot ending in a semicircle drawn as an arc of
       * radius 1 rather than a rect's `rx`. */}
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
