import type { CSSProperties, ReactNode } from 'react'

/**
 * A box of numbered lines under a step's heading, one line emphasized, which
 * is what tells a log from a code block: it arrives in steps, a line at a
 * time, and the line a reader looks for is the one that failed.
 */
export const logArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="120" rx="8" width="208" x="56" y="40" />
    {/* The step's heading: a caret turned open, and its name. */}
    <path className="artInk" d="M68 52l8 0l-4 6z" fillOpacity="0.55" />
    <rect className="artInk" fillOpacity="0.55" height="6" rx="3" width="72" x="84" y="52" />
    {[
      { emphasized: false, width: 96, y: 72 },
      { emphasized: false, width: 128, y: 86 },
      { emphasized: false, width: 72, y: 100 },
      { emphasized: true, width: 112, y: 114 },
      { emphasized: false, width: 88, y: 128 },
      { emphasized: false, width: 56, y: 142 },
    ].map((line, index) => (
      <g className="artMotion artRow" key={line.y} style={{ '--art-i': index } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="8" x="68" y={line.y} />
        <rect
          className={line.emphasized ? 'artSolid' : 'artInk'}
          fillOpacity={line.emphasized ? undefined : 0.55}
          height="4"
          rx="2"
          width={line.width}
          x="84"
          y={line.y}
        />
      </g>
    ))}
  </>
)
