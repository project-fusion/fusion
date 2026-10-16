import type { ReactNode } from 'react'

/**
 * Three controls in a row, each with its badge on its bottom edge: the keys
 * as a short plate in the inverse fill, the way the overlay draws them over a
 * page. The badges mark on hover, as the overlay appears while a key is held.
 */
export const shortcutOverlayArt: ReactNode = (
  <>
    {[64, 136, 208].map((x) => (
      <g key={x}>
        <rect className="artEdge" fill="none" height="40" rx="4" width="48" x={x} y="72" />
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="6"
          rx="3"
          width="24"
          x={x + 12}
          y="89"
        />
        <g className="artMotion artMark">
          <rect className="artInverse" height="20" rx="4" width="40" x={x + 4} y="102" />
          <rect className="artOnInverse" height="4" rx="2" width="24" x={x + 12} y="110" />
        </g>
      </g>
    ))}
  </>
)
