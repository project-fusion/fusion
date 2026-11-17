import type { ReactNode } from 'react'

/**
 * Two pointers on a board, each with a name tag beside it: two people at work
 * on one surface.
 */
export const cursorArt: ReactNode = (
  <>
    <path className="artInk" d="M84 60 L108 72 L97 75 L93 86 Z" fillOpacity="0.6" />
    <rect className="artInk" fillOpacity="0.6" height="16" rx="8" width="44" x="98" y="84" />
    <path className="artInk" d="M196 108 L220 120 L209 123 L205 134 Z" fillOpacity="0.3" />
    <rect className="artInk" fillOpacity="0.3" height="16" rx="8" width="56" x="210" y="132" />
  </>
)
