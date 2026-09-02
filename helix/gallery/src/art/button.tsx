import type { ReactNode } from 'react'

export const buttonArt: ReactNode = (
  <>
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSolid" height="40" rx="4" width="120" x="100" y="80" />
      </g>
      <rect className="artSolid" height="40" rx="4" width="120" x="100" y="80" />
      <rect className="artOnSolid" height="8" rx="4" width="52" x="134" y="96" />
    </g>
  </>
)
