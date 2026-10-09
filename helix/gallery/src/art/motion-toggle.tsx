import type { ReactNode } from 'react'

/**
 * A floating square button with the pause mark in it, standing over three
 * waves that stop short of it, which is what the button does to the page:
 * every motion that starts by itself, held.
 */
export const motionToggleArt: ReactNode = (
  <>
    <path
      className="artStroke"
      d="M40 76 C 64 60, 88 92, 112 76 S 160 60, 184 76"
      fill="none"
      opacity="0.28"
      strokeWidth="2"
    />
    <path
      className="artStroke"
      d="M40 100 C 64 84, 88 116, 112 100 S 160 84, 184 100"
      fill="none"
      opacity="0.45"
      strokeWidth="2"
    />
    <path
      className="artStroke"
      d="M40 124 C 64 108, 88 140, 112 124 S 160 108, 184 124"
      fill="none"
      opacity="0.28"
      strokeWidth="2"
    />
    <g filter="url(#helixArtShadow)">
      <rect className="artOverlay" height="56" rx="8" width="56" x="208" y="72" />
    </g>
    <rect className="artInk" fillOpacity="0.55" height="24" rx="2" width="7" x="226" y="88" />
    <rect className="artInk" fillOpacity="0.55" height="24" rx="2" width="7" x="239" y="88" />
  </>
)
