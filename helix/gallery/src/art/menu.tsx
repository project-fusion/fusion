import type { CSSProperties, ReactNode } from 'react'

export const menuArt: ReactNode = (
  <>
    <rect className="artSunken" height="40" rx="4" width="72" x="56" y="32" />
    <rect className="artEdge" height="39" rx="4" width="71" x="56.5" y="32.5" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="40" x="72" y="48" />
    <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="92" rx="4" width="168" x="56" y="84" />
      </g>
      <rect className="artRaised" height="24" rx="4" width="152" x="64" y="92" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="72" y="100" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="72" y="126" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="104" x="72" y="152" />
    </g>
  </>
)
