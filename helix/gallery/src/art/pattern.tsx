import type { ReactNode } from 'react'

/**
 * A honeycomb of fine lines across the card, with a few cells near the middle
 * drawn stronger: the pattern, and the glow that follows the pointer over it.
 */
export const patternArt: ReactNode = (
  <>
    <defs>
      <pattern height="34.64" id="helixArtPatternHex" patternUnits="userSpaceOnUse" width="60">
        <path
          className="artInk"
          d="M0 17.32L10 0H30L40 17.32 30 34.64H10ZM40 17.32H60"
          fill="none"
          strokeOpacity="0.22"
        />
      </pattern>
      <radialGradient id="helixArtPatternGlow">
        <stop offset="0" stopColor="white" />
        <stop offset="1" stopColor="black" />
      </radialGradient>
      <mask id="helixArtPatternMask">
        <circle cx="160" cy="100" fill="url(#helixArtPatternGlow)" r="56" />
      </mask>
    </defs>
    <rect fill="url(#helixArtPatternHex)" height="160" width="280" x="20" y="20" />
    <rect
      className="artInk"
      fill="url(#helixArtPatternHex)"
      height="160"
      mask="url(#helixArtPatternMask)"
      width="280"
      x="20"
      y="20"
    />
  </>
)
