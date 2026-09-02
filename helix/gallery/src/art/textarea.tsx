import type { CSSProperties, ReactNode } from 'react'

/**
 * Several lines, and a corner to pull.
 *
 * The lines arrive in order, which is the one thing that separates this from
 * a picture of a tall empty field: a textarea is the control that grows a
 * line at a time. The grip does not move, because the corner is always there.
 */
export const textareaArt: ReactNode = (
  <>
    <rect className="artSunken" height="104" rx="4" width="224" x="48" y="48" />
    <rect className="artEdge" height="103" rx="4" width="223" x="48.5" y="48.5" />
    {[
      { w: 160, y: 66 },
      { w: 176, y: 84 },
      { w: 112, y: 102 },
    ].map((line, index) => (
      <g className="artMotion artRow" key={line.y} style={{ '--art-i': index } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="8"
          rx="4"
          width={line.w}
          x="64"
          y={line.y}
        />
      </g>
    ))}
    <rect className="artInk" fillOpacity="0.28" height="4" rx="1" width="4" x="256" y="134" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="1" width="4" x="250" y="140" />
  </>
)
