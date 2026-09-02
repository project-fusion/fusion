import type { ReactNode } from 'react'

export const trendArt: ReactNode = (
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
)
