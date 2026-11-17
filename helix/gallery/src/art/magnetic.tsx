import type { ReactNode } from 'react'

/**
 * A button drawn faintly at its place and again drawn toward a pointer beside
 * it: a button pulled a little way toward the hand.
 */
export const magneticArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.1" height="32" rx="6" width="104" x="108" y="84" />
    <rect className="artInk" fillOpacity="0.6" height="32" rx="6" width="104" x="120" y="78" />
    <rect className="artOverlay" height="6" rx="3" width="56" x="144" y="91" />
    <path
      className="artInk"
      d="M236 104 L236 126 L242 120 L247 130 L251 128 L246 118 L254 118 Z"
      fillOpacity="0.6"
    />
  </>
)
