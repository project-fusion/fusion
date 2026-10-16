import type { CSSProperties, ReactNode } from 'react'

/**
 * A field in the code face: a gutter of line numbers down its start, lines of
 * code in the syntax inks' weights, and one problem underlined, which is what
 * sets an editor apart from a text area.
 */
export const editorArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="96" rx="4" width="200" x="60" y="52" />
    {[0, 1, 2, 3].map((line) => (
      <rect
        className="artInk"
        fillOpacity="0.28"
        height="3"
        key={line}
        rx="1.5"
        width="8"
        x="70"
        y={68 + line * 18}
      />
    ))}
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <rect className="artSolid" height="4" rx="2" width="36" x="90" y="67" />
      <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="72" x="132" y="67" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="110" x="102" y="85" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="52" x="102" y="103" />
      <path
        className="artStroke"
        d="M102 111 q3 -3 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0"
        fill="none"
      />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 3 } as CSSProperties}>
      <rect className="artSolid" height="4" rx="2" width="28" x="90" y="121" />
    </g>
  </>
)
