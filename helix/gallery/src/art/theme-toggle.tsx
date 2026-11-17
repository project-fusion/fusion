import type { ReactNode } from 'react'

/**
 * A page split by a circle spreading from a square button, light outside it
 * and dark within, with the moon on the button: the other mode arriving from
 * the press.
 */
export const themeToggleArt: ReactNode = (
  <>
    <rect className="artSurface" height="120" rx="8" width="224" x="48" y="40" />
    <circle className="artInk" cx="232" cy="72" fillOpacity="0.85" r="72" />
    <g filter="url(#helixArtShadow)">
      <rect className="artOverlay" height="40" rx="8" width="40" x="212" y="52" />
    </g>
    <path
      className="artInk"
      d="M238 66 A 10 10 0 1 0 238 82 A 8 8 0 1 1 238 66 Z"
      fillOpacity="0.7"
    />
  </>
)
