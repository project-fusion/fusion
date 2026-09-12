import type { CSSProperties, ReactNode } from 'react'

/**
 * A value as a tree: a branch open, its entries indented under it, and one
 * branch closed with its count beside it.
 *
 * **The indent and the carets are the subject**, since they are what a text
 * dump of the same value cannot do. Keys are the fainter ink and values the
 * stronger, the closed branch wears a small pill for how many entries it holds,
 * and each caret points the way its branch is: down for open, across for shut.
 *
 * The open branch's entries arrive in order, a row at a time, which is what
 * opening one looks like.
 */
const caret = (x: number, y: number, open: boolean): ReactNode => (
  <path
    className="artStroke"
    d={open ? `M${x} ${y}l4 4 4-4` : `M${x + 2} ${y - 2}l4 4-4 4`}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeOpacity="0.55"
    strokeWidth="1.5"
  />
)

export const objectInspectorArt: ReactNode = (
  <>
    <rect className="artSurface" height="128" rx="8" width="216" x="52" y="36" />
    <rect className="artEdge" height="127" rx="8" width="215" x="52.5" y="36.5" />
    {caret(64, 54, true)}
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="24" x="80" y="52" />
    {[
      { key: 28, value: 56, y: 74 },
      { key: 36, value: 40, y: 94 },
      { key: 24, value: 72, y: 114 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="8"
          rx="4"
          width={row.key}
          x="96"
          y={row.y}
        />
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="8"
          rx="4"
          width={row.value}
          x={104 + row.key}
          y={row.y}
        />
      </g>
    ))}
    {caret(80, 136, false)}
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="32" x="96" y="134" />
    <rect className="artSunken" height="12" rx="6" width="28" x="136" y="132" />
  </>
)
