import type { CSSProperties, ReactNode } from 'react'

/**
 * A bounded box with rows running past its bottom edge, and the edge saying so.
 *
 * The subject is the fade rather than the scrolling. What this component adds
 * over `overflow: auto` is the one fact CSS cannot work out, which is that
 * there is more below, so the drawing is a stack of rows cut off by a band
 * that dissolves into the ground.
 *
 * `artTravel` on the rows, downward, because the reader scrolls and the
 * content is what moves. The clip is on a group outside the one that travels,
 * for the reason `image` records: a clip on the moving group resolves in the
 * space the transform just changed and grows along with it.
 */
export const scrollAreaArt: ReactNode = (
  <>
    <defs>
      <clipPath id="helixArtScrollFrame">
        <rect height="112" rx="8" width="224" x="48" y="44" />
      </clipPath>
      {/* Stops carry the token directly, the way `skeleton`'s sweep does:
          a class cannot reach a `<stop>`, which takes `stop-color` rather
          than `fill`. Fading to the sunken surface the frame is painted in,
          because that is the ground the rows are disappearing into. */}
      <linearGradient id="helixArtScrollFade" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="var(--helix-color-surface-sunken)" stopOpacity="0" />
        <stop offset="1" stopColor="var(--helix-color-surface-sunken)" stopOpacity="1" />
      </linearGradient>
    </defs>
    <rect className="artSunken" height="112" rx="8" width="224" x="48" y="44" />
    <g clipPath="url(#helixArtScrollFrame)">
      <g
        className="artMotion artTravel"
        style={{ '--art-to': '0px', '--art-to-block': '-14px' } as CSSProperties}
      >
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="152" x="64" y="60" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="184" x="64" y="80" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="168" x="64" y="100" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="192" x="64" y="120" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="144" x="64" y="140" />
      </g>
      {/* The band at the bottom edge, which is the whole point of the card. */}
      <rect fill="url(#helixArtScrollFade)" height="36" width="224" x="48" y="120" />
    </g>
    <rect className="artEdge" height="111" rx="8" width="223" x="48.5" y="44.5" />
  </>
)
