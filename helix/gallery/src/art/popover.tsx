import type { CSSProperties, ReactNode } from 'react'

export const popoverArt: ReactNode = (
  <>
    <rect className="artSunken" height="40" rx="4" width="64" x="56" y="36" />
    <rect className="artEdge" height="39" rx="4" width="63" x="56.5" y="36.5" />
    <g className="artMotion artOpen" style={{ transformOrigin: 'left top' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="80" rx="4" width="184" x="88" y="88" />
      </g>
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="88" x="104" y="104" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="140" x="104" y="124" />
      <rect className="artRaised" height="20" rx="4" width="48" x="104" y="140" />
    </g>
  </>
)
