import type { ReactNode } from 'react'

/**
 * A sheet risen from the foot of a phone, with a row of presets, sections
 * that each say what they hold, and a full-width button that shows the rows.
 */
export const viewPanelArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="128" rx="10" width="88" x="116" y="36" />
    <rect className="artInk" fillOpacity="0.12" height="76" rx="8" width="80" x="120" y="84" />
    <rect className="artSolid" height="8" rx="4" width="22" x="128" y="92" />
    <rect className="artInk" fillOpacity="0.3" height="8" rx="4" width="22" x="154" y="92" />
    {[0, 1, 2].map((row) => (
      <g key={row}>
        <rect
          className="artInk"
          fillOpacity="0.45"
          height="4"
          rx="2"
          width="20"
          x="128"
          y={110 + row * 10}
        />
        <rect
          className="artInk"
          fillOpacity="0.25"
          height="4"
          rx="2"
          width="22"
          x="166"
          y={110 + row * 10}
        />
      </g>
    ))}
    <rect className="artSolid" height="8" rx="3" width="64" x="128" y="144" />
  </>
)
