import type { CSSProperties, ReactNode } from 'react'

/**
 * A fan of strands bending through one point, with its arms opening to the
 * right.
 *
 * **Lines, not a glow.** The component's light is additive, and the hot bend
 * is where the strands overlap; drawn as seven strokes at the three ink steps,
 * the overlap is what makes the bend read as the brightest place, with no
 * gradient the system does not allow.
 *
 * The strands converge to within a few units at the bend and part toward the
 * edges, the way a ribbon seen at an angle does. The outer ones are the
 * faintest, so the bundle reads as having depth rather than as a stack of
 * equal lines.
 *
 * `artOpen` on the bundle: the bend is the part that is always there, and the
 * arms open around it.
 */
export const strandsArt: ReactNode = (
  <>
    <defs>
      {/* The arms run past the plane on both sides, so the bundle is clipped
          to the plane's own radius. */}
      <clipPath id="helixArtStrandsPlane">
        <rect height="112" rx="8" width="224" x="48" y="44" />
      </clipPath>
    </defs>

    <rect className="artSunken" height="112" rx="8" width="224" x="48" y="44" />

    <g clipPath="url(#helixArtStrandsPlane)">
      <g
        className="artMotion artOpen"
        strokeLinecap="round"
        strokeWidth="1.5"
        style={{ transformOrigin: '128px 100px' } as CSSProperties}
      >
        <path
          className="artStroke"
          d="M280 12C180 25 134 64 134 95.5S180 175 280 188"
          strokeOpacity="0.12"
        />
        <path
          className="artStroke"
          d="M280 18C180 30 132 66 132 97S180 170 280 182"
          strokeOpacity="0.12"
        />
        <path
          className="artStroke"
          d="M280 24C180 35 130 68 130 98.5S180 165 280 176"
          strokeOpacity="0.28"
        />
        <path
          className="artStroke"
          d="M280 36C180 45 130 72 130 101.5S180 155 280 164"
          strokeOpacity="0.28"
        />
        <path
          className="artStroke"
          d="M280 42C180 50 132 74 132 103S180 150 280 158"
          strokeOpacity="0.12"
        />
        <path
          className="artStroke"
          d="M280 48C180 55 134 76 134 104.5S180 145 280 152"
          strokeOpacity="0.12"
        />
      </g>
      <path
        className="artStroke"
        d="M280 30C180 40 128 70 128 100S180 160 280 170"
        strokeLinecap="round"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
    </g>
  </>
)
