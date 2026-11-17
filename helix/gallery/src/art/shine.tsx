import type { ReactNode } from 'react'

/**
 * A filled button with a slanted band of light crossing it: a glint passing
 * over the one action that matters.
 */
export const shineArt: ReactNode = (
  <>
    <defs>
      <clipPath id="helixArtShineClip">
        <rect height="40" rx="6" width="144" x="88" y="80" />
      </clipPath>
    </defs>
    <rect className="artInk" fillOpacity="0.6" height="40" rx="6" width="144" x="88" y="80" />
    <g clipPath="url(#helixArtShineClip)">
      <path className="artOverlay" d="M156 80 L176 80 L160 120 L140 120 Z" fillOpacity="0.5" />
    </g>
    <rect className="artOverlay" height="6" rx="3" width="64" x="128" y="97" />
  </>
)
