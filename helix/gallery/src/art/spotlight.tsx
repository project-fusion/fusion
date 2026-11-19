import type { ReactNode } from 'react'

/**
 * A card with a soft round light near one corner and that corner's edge lit,
 * and a pointer inside the light: a glow following the hand across a card.
 */
export const spotlightArt: ReactNode = (
  <>
    <defs>
      <clipPath id="helixArtSpotlightClip">
        <rect height="96" rx="8" width="160" x="80" y="52" />
      </clipPath>
    </defs>
    <g filter="url(#helixArtShadow)">
      <rect className="artOverlay" height="96" rx="8" width="160" x="80" y="52" />
    </g>
    <g clipPath="url(#helixArtSpotlightClip)">
      <circle className="artInk" cx="128" cy="88" fillOpacity="0.12" r="52" />
      <path
        className="artInk"
        d="M80 140 L80 60 Q80 52 88 52 L176 52 L176 54 L88 54 Q82 54 82 60 L82 140 Z"
        fillOpacity="0.28"
      />
    </g>
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="56" x="96" y="72" />
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="112" x="96" y="92" />
    <path
      className="artInk"
      d="M132 98 L132 120 L138 114 L143 124 L147 122 L142 112 L150 112 Z"
      fillOpacity="0.55"
    />
  </>
)
