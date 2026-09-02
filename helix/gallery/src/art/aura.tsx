import type { CSSProperties, ReactNode } from 'react'

/**
 * Shafts of light fanning from a source above the frame.
 *
 * **Contours, not a gradient.** A `linearGradient` is the better picture and
 * an illegal one: ink here is a percentage of foreground at `0.12`, `0.28` or
 * `0.55`, and a ramp is every step there is. Drawn as a bloom, three shafts
 * and a core at exactly those three, the fan survives and the ink is
 * countable. Flat bands obey the same rule and stop looking like light, which
 * is the other way to get this wrong: a card has to be legible as its
 * component first.
 *
 * The apex sits far above and to the right, well outside the clip. Distance
 * is what stops it reading as a road: brought close, the shafts converge hard
 * on a vanishing point and the card becomes a highway at night. Pushed out to
 * nearly three times the plane's height, they rake across it almost parallel,
 * which is what light through an opening actually does.
 *
 * **The widths are uneven on purpose.** Three shafts at one width and one
 * spacing read as paint: a fan is legible as light because the gaps between
 * its members are not equal, which is what an opening actually casts. And the
 * bloom stops short of the plane's edges, so there is dark on both sides to
 * be lit against.
 *
 * `artOpen` on the bloom and the shafts. The core is the part that is always
 * there; the fan is what arrives around it.
 */
export const auraArt: ReactNode = (
  <>
    <defs>
      {/* The fan is drawn from a point outside the plane and `artOpen` scales
          it further, so it is clipped to the plane's own radius. */}
      <clipPath id="helixArtAuraPlane">
        <rect height="112" rx="8" width="224" x="48" y="44" />
      </clipPath>
    </defs>

    <rect className="artSunken" height="112" rx="8" width="224" x="48" y="44" />

    <g clipPath="url(#helixArtAuraPlane)">
      <g className="artMotion artOpen" style={{ transformOrigin: 'center' } as CSSProperties}>
        <path className="artInk" d="M244-132 52 156h184z" fillOpacity="0.12" />
        <path className="artInk" d="M244-132 84 156h34z" fillOpacity="0.28" />
        <path className="artInk" d="M244-132 140 156h18z" fillOpacity="0.28" />
        <path className="artInk" d="M244-132 186 156h28z" fillOpacity="0.28" />
      </g>
      <path className="artInk" d="M244-132 122 156h10z" fillOpacity="0.55" />
    </g>

    <rect className="artEdge" height="111" rx="8" width="223" x="48.5" y="44.5" />
  </>
)
