import type { ReactNode } from 'react'

export const emptyArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="20" rx="4" width="20" x="150" y="56" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="120" y="94" />
    <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="56" x="132" y="112" />
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSolid" height="32" rx="4" width="52" x="134" y="132" />
      </g>
      <rect className="artSolid" height="32" rx="4" width="52" x="134" y="132" />
      <rect className="artOnSolid" height="6" rx="3" width="24" x="148" y="145" />
    </g>
  </>
)
