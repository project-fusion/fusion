import type { CSSProperties, ReactNode } from 'react'

/**
 * A field in a form, its label above, holding a few lines of JSON in the
 * syntax inks' weights with a caret at the end of the last: a text field that
 * colors what is typed, without the gutter an editor draws.
 */
export const codeInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="44" x="60" y="56" />
    <rect className="artEdge" fill="none" height="76" rx="4" width="200" x="60" y="68" />
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="6" x="72" y="82" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artSolid" height="4" rx="2" width="34" x="84" y="98" />
      <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="52" x="124" y="98" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <rect className="artSolid" height="4" rx="2" width="44" x="84" y="114" />
      <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="14" x="134" y="114" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 3 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="6" x="72" y="130" />
      <rect className="artSolid" height="12" width="1.5" x="82" y="126" />
    </g>
  </>
)
