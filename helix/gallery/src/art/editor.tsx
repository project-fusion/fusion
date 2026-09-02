import type { CSSProperties, ReactNode } from 'react'

/**
 * Source with a gutter and indentation.
 *
 * The gutter rule separates this from `textarea`, and the indents going in and
 * back out again separate it from `tree`, whose depth only ever increases down
 * the visible rows. Lines arrive in order, which is how source is read.
 */
export const editorArt: ReactNode = (
  <>
    <rect className="artSunken" height="120" rx="4" width="224" x="48" y="40" />
    <rect className="artEdge" height="119" rx="4" width="223" x="48.5" y="40.5" />
    <rect className="artRule" height="120" width="1" x="80" y="40" />
    {[
      { indent: 0, w: 112, y: 56 },
      { indent: 20, w: 84, y: 78 },
      { indent: 20, w: 96, y: 100 },
      { indent: 0, w: 64, y: 122 },
    ].map((line, index) => (
      <g className="artMotion artRow" key={line.y} style={{ '--art-i': index } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity="0.12"
          height="6"
          rx="3"
          width="8"
          x="60"
          y={line.y + 1}
        />
        <rect
          className="artInk"
          fillOpacity={index === 2 ? 0.55 : 0.28}
          height="8"
          rx="4"
          width={line.w}
          x={96 + line.indent}
          y={line.y}
        />
      </g>
    ))}
  </>
)
