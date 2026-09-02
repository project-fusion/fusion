import type { ReactNode } from 'react'

/**
 * A rail down the side with the marks on it, which is the whole difference
 * from `list`: what makes a timeline is the line joining one entry to the
 * next, and each mark sitting on it at the height of what it happened to.
 */
export const timelineArt: ReactNode = (
  <>
    <rect className="artRule" height="112" width="2" x="71" y="48" />
    {[
      { fill: 0.55, y: 56 },
      { fill: 0.28, y: 100 },
      { fill: 0.12, y: 144 },
    ].map((entry) => (
      <g key={entry.y}>
        <circle className="artInk" cx="72" cy={entry.y} fillOpacity={entry.fill} r="9" />
        <rect
          className="artInk"
          fillOpacity="0.12"
          height="5"
          rx="2.5"
          width="36"
          x="100"
          y={entry.y - 12}
        />
        <rect
          className="artInk"
          fillOpacity={entry.fill}
          height="7"
          rx="3.5"
          width={entry.y === 100 ? 128 : 96}
          x="100"
          y={entry.y - 3}
        />
      </g>
    ))}
  </>
)
