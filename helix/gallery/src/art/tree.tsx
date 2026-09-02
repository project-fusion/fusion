import type { CSSProperties, ReactNode } from 'react'

export const treeArt: ReactNode = (
  <>
    <path className="artEdge" d="M74 44v96M106 96v44M74 68h14M74 96h14M106 140h14" />
    <path className="artInk" d="M60 64l5 4-5 4z" fillOpacity="0.55" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="94" y="64" />
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <path className="artInk" d="M92 92l5 4-5 4z" fillOpacity="0.55" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="58" x="126" y="92" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artRaised" height="26" rx="4" width="150" x="118" y="112" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="66" x="134" y="121" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="52" x="134" y="150" />
    </g>
  </>
)
