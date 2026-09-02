import type { CSSProperties, ReactNode } from 'react'

export const speedDialArt: ReactNode = (
  <>
    {/* Three actions climbing away from the control, each a mark and the
        name beside it. Drawn small to large towards the button, which is the
        order they arrive in and the only way the picture says which one
        opened the others. */}
    {[
      { o: 0.28, w: 44, y: 52 },
      { o: 0.4, w: 56, y: 84 },
      { o: 0.55, w: 40, y: 116 },
    ].map((action) => (
      <g key={action.y}>
        <rect
          className="artInk"
          fillOpacity={action.o * 0.5}
          height="10"
          rx="5"
          width={action.w}
          x={188 - action.w}
          y={action.y + 3}
        />
        <circle className="artInk" cx="212" cy={action.y + 8} fillOpacity={action.o} r="10" />
      </g>
    ))}
    {/* The control itself, filled and larger: the one thing on the card that
     * is not a shadow of the others.
     *
     * **`artSolid`, never `artOn`.** `artOn` is a motion name and paints
     * nothing, so a disc carrying it falls through to the SVG default fill
     * and draws in literal black. In light mode that is within a hair of
     * `surface-inverse` and nobody can see it; in dark mode `surface-inverse`
     * is near white, so the card's one filled control becomes a black disc on
     * a black page with a white plus hanging in the middle of it.
     *
     * **And it holds still.** The one thing a dial's button does is stay
     * exactly where a thumb left it, and anchoring it is what makes the fan
     * above it read as a fan. */}
    <circle className="artSolid" cx="212" cy="152" r="16" />
    {/* The plus turns into its own close, which is the whole of what pressing
        this control does to the glyph on it. 45 degrees rather than the
        archetype's 180, because a plus at a half turn is a plus. */}
    <path
      className="artStrokeOnSolid artMotion artTurn"
      d="M212 145v14M205 152h14"
      fill="none"
      strokeLinecap="round"
      strokeWidth="2.5"
      style={{ '--art-turn': '45deg' } as CSSProperties}
    />
  </>
)
