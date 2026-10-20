import type { CSSProperties, ReactNode } from 'react'

/**
 * A document: a toolbar strip of tools across its top, one pressed, then a
 * heading, lines of text, and a bulleted line, with the caret at the end of
 * the last, which is what sets an editor apart from a page of text.
 */
export const editorArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="104" rx="6" width="200" x="60" y="48" />
    <path className="artEdge" d="M60 62 H260" fill="none" />
    {[0, 1, 2, 3, 4, 5].map((tool) => (
      <rect
        className={tool === 2 ? 'artSolid' : 'artInk'}
        fillOpacity={tool === 2 ? undefined : '0.28'}
        height="6"
        key={tool}
        rx="1.5"
        width="6"
        x={68 + tool * 11 + (tool > 1 ? 6 : 0)}
        y="52"
      />
    ))}
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.7" height="6" rx="3" width="64" x="76" y="74" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.4" height="4" rx="2" width="150" x="76" y="90" />
      <rect className="artInk" fillOpacity="0.4" height="4" rx="2" width="118" x="76" y="100" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <circle className="artInk" cx="80" cy="120" fillOpacity="0.55" r="2" />
      <rect className="artInk" fillOpacity="0.4" height="4" rx="2" width="92" x="88" y="118" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 3 } as CSSProperties}>
      <circle className="artInk" cx="80" cy="134" fillOpacity="0.55" r="2" />
      <rect className="artInk" fillOpacity="0.4" height="4" rx="2" width="70" x="88" y="132" />
      <rect className="artSolid" height="10" rx="0.75" width="1.5" x="161" y="129" />
    </g>
  </>
)
