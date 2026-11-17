import type { ReactNode } from 'react'

/**
 * A card drawn in perspective, its right edge taller than its left, with a
 * pointer near that corner: a card leaning toward the hand over it.
 */
export const tiltArt: ReactNode = (
  <>
    <g filter="url(#helixArtShadow)">
      <path className="artOverlay" d="M104 60 L232 48 L232 152 L104 140 Z" />
    </g>
    <path className="artInk" d="M120 74 L188 68 L188 76 L120 82 Z" fillOpacity="0.6" />
    <path className="artInk" d="M120 94 L212 88 L212 94 L120 100 Z" fillOpacity="0.22" />
    <path className="artInk" d="M120 108 L196 103 L196 109 L120 114 Z" fillOpacity="0.22" />
    <path
      className="artInk"
      d="M236 132 L236 154 L242 148 L247 158 L251 156 L246 146 L254 146 Z"
      fillOpacity="0.6"
    />
  </>
)
