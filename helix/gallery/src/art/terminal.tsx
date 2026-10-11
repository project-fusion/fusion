import type { CSSProperties, ReactNode } from 'react'

/**
 * A prompt, the command after it, what it wrote, and the next prompt with the
 * cursor waiting, which is what tells a terminal from a log: it is where you
 * type. The header strip names it and holds its controls.
 */
export const terminalArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="120" rx="8" width="208" x="56" y="40" />
    <path className="artEdge" d="M56 60h208" />
    <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="48" x="68" y="48" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="2" width="8" x="234" y="46" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="2" width="8" x="248" y="46" />
    {[
      { prompt: true, width: 56, y: 74 },
      { prompt: false, width: 128, y: 88 },
      { prompt: false, width: 96, y: 100 },
      { prompt: false, width: 112, y: 112 },
    ].map((line, index) => (
      <g className="artMotion artRow" key={line.y} style={{ '--art-i': index } as CSSProperties}>
        {line.prompt ? (
          <path className="artInk" d={`M68 ${line.y - 2}l6 4l-6 4z`} fillOpacity="0.55" />
        ) : null}
        <rect
          className={line.prompt ? 'artSolid' : 'artInk'}
          fillOpacity={line.prompt ? undefined : 0.28}
          height="4"
          rx="2"
          width={line.width}
          x={line.prompt ? 80 : 68}
          y={line.y}
        />
      </g>
    ))}
    <path className="artInk" d="M68 128l6 4l-6 4z" fillOpacity="0.55" />
    <rect className="artOn artSolid" height="12" rx="1" width="7" x="80" y="126" />
  </>
)
