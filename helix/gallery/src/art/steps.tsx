import type { CSSProperties, ReactNode } from 'react'

/**
 * Three markers on one line, the run behind them broken where the reader has
 * got to. Two filled and one hollow, because a stepper says two things at
 * once: how far along, and which stage is open. Drawing only the fills would
 * say the first and leave the second to the label.
 */
export const stepsArt: ReactNode = (
  <>
    <rect className="artRule" height="2" rx="1" width="72" x="76" y="99" />
    <rect className="artRule" height="2" rx="1" width="72" x="164" y="99" />
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <circle className="artInk" cx="66" cy="100" fillOpacity="0.55" r="10" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <circle className="artSolid artFill" cx="156" cy="100" r="10" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <circle
        className="artInk"
        cx="246"
        cy="100"
        fill="none"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
    </g>
  </>
)
